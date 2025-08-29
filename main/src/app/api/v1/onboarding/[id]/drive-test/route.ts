// src/app/api/v1/onboarding/[id]/drive-test/route.ts
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import DriveTest from "@/mongoose/models/DriveTest";
import { isValidObjectId } from "mongoose";
import { buildTrackerContext, hasReachedStep, onboardingExpired } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.status.completed === true) return errorResponse(401, "onboarding process already completed");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    if (!hasReachedStep(onboardingDoc, EStepPath.DRIVE_TEST)) {
      return errorResponse(403, "Please complete previous steps first");
    }

    const driveTestId = onboardingDoc.forms?.driveTest as any | undefined;
    const driveTestDoc = driveTestId ? await DriveTest.findById(driveTestId) : null;

    // Build base context and enrich with itemSummary (no email needed for drive test)
    // Use DRIVE_TEST as the current step to get the correct nextStep
    const baseContext = buildTrackerContext(onboardingDoc, EStepPath.DRIVE_TEST);
    const enrichedContext = {
      ...baseContext,
      itemSummary: {
        ...(baseContext as any).itemSummary,
      },
    };

    return successResponse(200, "Drive test data retrieved", {
      onboardingContext: enrichedContext,
      driveTest: driveTestDoc?.toObject() ?? {},
    });
  } catch (error) {
    return errorResponse(error);
  }
};
