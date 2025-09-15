// src/app/api/v1/onboarding/resume/[sin]/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { errorResponse, successResponse, AppError } from "@/lib/utils/apiResponse";
import { isValidSIN } from "@/lib/utils/validationUtils";
import { hashString } from "@/lib/utils/cryptoUtils";
import { buildTrackerContext, onboardingExpired } from "@/lib/utils/onboardingUtils";
import { createOnboardingSessionAndCookie, clearOnboardingCookieHeader } from "@/lib/utils/auth/onboardingSession";
import { attachCookies } from "@/lib/utils/auth/attachCookie";
import { EEApiErrorType } from "@/types/apiError.types";

export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ sin: string }> } // keep Promise style to match your other routes
) => {
  try {
    await connectDB();

    // SIN comes from the path param: /onboarding/resume/[sin]
    const { sin: rawSinParam } = await params;
    const sinNormalized = (rawSinParam || "").replace(/[\s-]/g, "");
    if (!isValidSIN(sinNormalized)) {
      // invalid credential → clear any stale cookie too
      throw new AppError(400, "Invalid SIN", EEApiErrorType.VALIDATION_ERROR, { clearCookieHeader: clearOnboardingCookieHeader() });
    }

    const sinHash = hashString(sinNormalized);
    const tracker = await OnboardingTracker.findOne({ sinHash });

    if (!tracker || tracker.terminated) {
      // not found/terminated → clear stale cookie
      throw new AppError(404, "No onboarding record found", EEApiErrorType.NOT_FOUND, { clearCookieHeader: clearOnboardingCookieHeader() });
    }

    if (onboardingExpired(tracker)) {
      // expired resume window → treat as session required semantics
      throw new AppError(410, "Resume link has expired", EEApiErrorType.SESSION_REQUIRED, { reason: "ONBOARDING_EXPIRED", clearCookieHeader: clearOnboardingCookieHeader() });
    }

    // Already completed → return status and clear any stale cookie
    if (tracker.status.completed) {
      const res = successResponse(200, "Onboarding already completed", {
        onboardingContext: buildTrackerContext(tracker),
        isCompleted: true,
      });
      return attachCookies(res, clearOnboardingCookieHeader());
    }

    // Create (or reuse) a 6h session and issue cookie
    const { setCookie } = await createOnboardingSessionAndCookie(String(tracker._id));

    const res = successResponse(200, "Resume granted", {
      onboardingContext: buildTrackerContext(tracker),
      isCompleted: false,
    });

    return attachCookies(res, setCookie);
  } catch (error) {
    // errorResponse will include { code, meta } and will append the clear-cookie header if provided
    return errorResponse(error);
  }
};
