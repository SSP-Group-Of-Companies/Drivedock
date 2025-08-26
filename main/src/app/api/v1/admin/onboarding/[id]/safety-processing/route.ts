// src/app/api/v1/onboarding/[id]/drug-test/route.ts
import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { buildTrackerContext, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { readMongooseRefField } from "@/lib/utils/mongooseRef";

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.terminated) return errorResponse(400, "Onboarding document terminated");

    const drugTest = readMongooseRefField(onboardingDoc.forms?.drugTest);
    const carriersEdge = readMongooseRefField(onboardingDoc.forms?.carriersEdgeTraining);
    const driveTest = readMongooseRefField(onboardingDoc.forms?.driveTest);

    return successResponse(200, "Onboarding test data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc),
      drugTest,
      carriersEdge,
      driveTest,
      resumeExpiresAt: nextResumeExpiry(),
    });
  } catch (error) {
    return errorResponse(error);
  }
};
