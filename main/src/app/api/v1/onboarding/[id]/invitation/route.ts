// src/app/api/v1/onboarding/[id]/invitation/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { isValidObjectId } from "mongoose";
import { requireOnboardingSession } from "@/lib/utils/auth/onboardingSession";
import { attachCookies } from "@/lib/utils/auth/attachCookie";
import { buildTrackerContext } from "@/lib/utils/onboardingUtils";

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    // Verify driver owns the tracker; also gives us a potential refresh cookie
    const { tracker: onboardingDoc, refreshCookie } = await requireOnboardingSession(onboardingId);

    // No hasReachedStep checks here — just return the context (contains invitationApproved)
    const res = successResponse(200, "Invitation context retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc),
    });

    // Attach updated session cookies if needed
    return attachCookies(res, refreshCookie);
  } catch (error) {
    return errorResponse(error);
  }
};
