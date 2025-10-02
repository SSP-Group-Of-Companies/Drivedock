import type { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { isValidSIN } from "@/lib/utils/validationUtils";
import { hashString } from "@/lib/utils/cryptoUtils";
import { buildTrackerContext, onboardingExpired } from "@/lib/utils/onboardingUtils";
import { createOnboardingSessionAndCookie, clearOnboardingCookieHeader } from "@/lib/utils/auth/onboardingSession";
import { attachCookies } from "@/lib/utils/auth/attachCookie";

import OnboardingVerificationCode from "@/mongoose/models/OnboardingVerificationCode";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import type { IApplicationFormDoc, IApplicationFormPage1 } from "@/types/applicationForm.types";
import { EEApiErrorType } from "@/types/apiError.types";

/**
 * POST { sin: string, code: string }
 */
export const POST = async (req: NextRequest) => {
  try {
    await connectDB();

    const body = await req.json().catch(() => null);
    const sinRaw = String(body?.sin || "").replace(/[\s-]/g, "");
    const codeRaw = String(body?.code || "").trim();

    if (!isValidSIN(sinRaw)) {
      throw new AppError(400, "Invalid SIN", EEApiErrorType.VALIDATION_ERROR, {
        clearCookieHeader: clearOnboardingCookieHeader(),
      });
    }
    if (!/^\d{6}$/.test(codeRaw)) {
      throw new AppError(400, "Invalid code format", EEApiErrorType.VALIDATION_ERROR);
    }

    const sinHash = hashString(sinRaw);
    const codeHash = hashString(codeRaw);

    // Tracker by sinHash
    const tracker = await OnboardingTracker.findOne({ sinHash });
    if (!tracker || tracker.terminated) {
      throw new AppError(404, "No onboarding record found", EEApiErrorType.NOT_FOUND, {
        clearCookieHeader: clearOnboardingCookieHeader(),
      });
    }

    if (onboardingExpired(tracker)) {
      throw new AppError(410, "Resume link has expired", EEApiErrorType.SESSION_REQUIRED, {
        reason: "ONBOARDING_EXPIRED",
        clearCookieHeader: clearOnboardingCookieHeader(),
      });
    }

    // Re-derive emailHash from application (bind code to the email on file)
    let emailLower = "";
    if (tracker.forms?.driverApplication) {
      const app = await ApplicationForm.findById(tracker.forms.driverApplication).lean<IApplicationFormDoc | null>();
      const page1 = app?.page1 as unknown as IApplicationFormPage1 | undefined;
      emailLower = (page1?.email || "").trim().toLowerCase();
    }
    if (!emailLower) {
      throw new AppError(404, "No email on file", EEApiErrorType.NOT_FOUND);
    }
    const emailHash = hashString(emailLower);

    // Lookup verification doc
    const verDoc = await OnboardingVerificationCode.findOne({
      trackerId: tracker._id,
      purpose: "resume",
      sinHash,
      emailHash,
    });

    if (!verDoc) {
      throw new AppError(401, "Verification required", EEApiErrorType.UNAUTHORIZED);
    }

    // Expired?
    if (verDoc.expiresAt.getTime() <= Date.now()) {
      try {
        await verDoc.deleteOne();
      } catch {}
      throw new AppError(410, "Verification code expired", EEApiErrorType.UNAUTHORIZED);
    }

    // Attempts guard
    if ((verDoc.attempts ?? 0) >= (verDoc.maxAttempts ?? 5)) {
      try {
        await verDoc.deleteOne();
      } catch {}
      throw new AppError(429, "Too many attempts. Request a new code.", EEApiErrorType.RATE_LIMITED);
    }

    // Match code
    if (verDoc.codeHash !== codeHash) {
      try {
        verDoc.attempts = (verDoc.attempts ?? 0) + 1;
        await verDoc.save();
      } catch {}
      throw new AppError(401, "Incorrect code", EEApiErrorType.UNAUTHORIZED, {
        remainingAttempts: Math.max(0, (verDoc.maxAttempts ?? 5) - (verDoc.attempts ?? 0)),
      });
    }

    // Success: delete doc
    try {
      await verDoc.deleteOne();
    } catch {}

    // Completed?
    if (tracker.status?.completed) {
      const resCompleted = successResponse(200, "Onboarding already completed", {
        onboardingContext: buildTrackerContext(tracker),
        isCompleted: true,
      });
      return attachCookies(resCompleted, clearOnboardingCookieHeader());
    }

    // Create session (6h)
    const { setCookie } = await createOnboardingSessionAndCookie(String(tracker._id));

    const res = successResponse(200, "Verification successful — resume granted", {
      onboardingContext: buildTrackerContext(tracker),
      isCompleted: false,
    });
    return attachCookies(res, setCookie);
  } catch (error) {
    return errorResponse(error);
  }
};
