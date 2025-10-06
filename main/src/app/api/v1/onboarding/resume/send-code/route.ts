import type { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse, AppError } from "@/lib/utils/apiResponse";
import { isValidSIN } from "@/lib/utils/validationUtils";
import { hashString } from "@/lib/utils/cryptoUtils";
import { onboardingExpired, buildTrackerContext } from "@/lib/utils/onboardingUtils";
import { clearOnboardingCookieHeader } from "@/lib/utils/auth/onboardingSession";

import OnboardingVerificationCode from "@/mongoose/models/OnboardingVerificationCode";
import { sendDriverResumeVerificationCodeEmail } from "@/lib/mail/driver/sendDriverResumeVerificationCodeEmail";
import type { ECompanyId } from "@/constants/companies";
import { getTrackerAndDriverEmailBySinHash } from "@/lib/utils/resumeHelpers.server";
import { EEApiErrorType } from "@/types/apiError.types";

/** Generate a 6-digit numeric code, left-padded if needed */
function generateNumericCode(): string {
  const n = Math.floor(Math.random() * 1_000_000);
  return String(n).padStart(6, "0");
}

/** Mask an email like "r****@gmail.com" */
function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "********";
  const first = user.slice(0, 1);
  return `${first}${"*".repeat(Math.max(1, user.length - 1))}@${domain}`;
}

const RESEND_WINDOW_MS = 60_000; // 1 minute

// POST { sin: string }
export const POST = async (req: NextRequest) => {
  try {
    await connectDB();

    const body = await req.json().catch(() => null);
    const sinRaw = String(body?.sin || "").replace(/[\s-]/g, "");

    if (!isValidSIN(sinRaw)) {
      throw new AppError(400, "Invalid SIN", EEApiErrorType.VALIDATION_ERROR, {
        clearCookieHeader: clearOnboardingCookieHeader(),
      });
    }

    const sinHash = hashString(sinRaw);
    const result = await getTrackerAndDriverEmailBySinHash(sinHash);

    if (!result || result.tracker?.terminated) {
      throw new AppError(404, "No onboarding record found", EEApiErrorType.NOT_FOUND, {
        clearCookieHeader: clearOnboardingCookieHeader(),
      });
    }

    const { tracker, email: trackerEmail, firstName, lastName } = result;

    if (onboardingExpired(tracker)) {
      throw new AppError(410, "Resume link has expired", EEApiErrorType.SESSION_REQUIRED, {
        reason: "ONBOARDING_EXPIRED",
        clearCookieHeader: clearOnboardingCookieHeader(),
      });
    }

    if (!trackerEmail) {
      throw new AppError(404, "No email on file", EEApiErrorType.NOT_FOUND);
    }

    // ----- Rate limit (1 minute between sends per tracker) -----
    const existing = await OnboardingVerificationCode.findOne({
      trackerId: tracker._id,
      purpose: "resume",
    }).lean();

    if (existing?.createdAt) {
      const elapsedMs = Date.now() - new Date(existing.createdAt as any).getTime();
      if (elapsedMs < RESEND_WINDOW_MS) {
        const retryAfterSeconds = Math.ceil((RESEND_WINDOW_MS - elapsedMs) / 1000);
        throw new AppError(429, "Please wait before requesting a new code.", EEApiErrorType.RATE_LIMITED, { retryAfterSeconds });
      }
      // outside window → replace with a fresh code (delete old first)
      await OnboardingVerificationCode.deleteOne({ _id: (existing as any)._id });
    }

    // Prepare verification
    const code = generateNumericCode();
    const codeHash = hashString(code);
    const emailHash = hashString(trackerEmail.trim().toLowerCase());
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OnboardingVerificationCode.create({
      trackerId: tracker._id,
      sinHash,
      emailHash,
      codeHash,
      purpose: "resume",
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
    });

    // Send email (best-effort)
    try {
      await sendDriverResumeVerificationCodeEmail(req, {
        companyId: tracker.companyId as ECompanyId,
        firstName,
        lastName,
        toEmail: trackerEmail,
        code,
      });
    } catch (e) {
      console.error("Failed to send verification email:", e);
    }

    return successResponse(200, "Verification code sent", {
      onboardingContext: buildTrackerContext(tracker),
      expiresInMinutes: 10,
      maskedEmail: maskEmail(trackerEmail),
      resendAvailableInSeconds: 60, // helpful for front-end countdown
    });
  } catch (error) {
    return errorResponse(error);
  }
};
