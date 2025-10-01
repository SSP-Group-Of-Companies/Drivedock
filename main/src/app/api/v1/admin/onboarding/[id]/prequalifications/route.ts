import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import PreQualifications from "@/mongoose/models/Prequalifications";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import connectDB from "@/lib/utils/connectDB";
import { buildTrackerContext, isInvitationApproved } from "@/lib/utils/onboardingUtils";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";
import { guard } from "@/lib/utils/auth/authUtils";

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    // Step 1: Find onboarding tracker
    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");
    if (!isInvitationApproved(onboardingDoc)) return errorResponse(400, "driver not yet approved for onboarding process");

    // Step 2: Fetch pre-qualifications form using linked ID
    const preQualId = onboardingDoc.forms?.preQualification;
    let preQualDoc = null;
    if (preQualId) {
      preQualDoc = await PreQualifications.findById(preQualId);
    }

    if (!preQualDoc) return errorResponse(404, "prequalifications document not found");

    return successResponse(200, "PreQualifications data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      preQualifications: preQualDoc.toObject(),
    });
  } catch (error) {
    return errorResponse(error);
  }
};
