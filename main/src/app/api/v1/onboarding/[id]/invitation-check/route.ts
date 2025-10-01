// src/app/api/v1/onboarding/[id]/invitation-status/route.ts
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { isValidObjectId } from "mongoose";
import { onboardingExpired } from "@/lib/utils/onboardingUtils";

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    if (!onboardingDoc.invitationApproved) {
      return errorResponse(403, "Invitation not approved yet");
    }

    return successResponse(200, "Invitation approved", { invitationApproved: true });
  } catch (error) {
    return errorResponse(error);
  }
};
