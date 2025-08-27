// app/api/v1/onboarding/[id]/drive-test/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import DriveTest from "@/mongoose/models/DriveTest";
import { EStepPath } from "@/types/onboardingTracker.types";
import { buildTrackerContext, onboardingExpired, hasReachedStep } from "@/lib/utils/onboardingUtils";
import { isValidObjectId } from "mongoose";
import { guard } from "@/lib/auth/authUtils";

/**
 * GET /drive-test
 * - Gated by access to drive test step (furthest >= DRIVE_TEST)
 * - Looks up DriveTest by ObjectId reference at onboardingDoc.forms.driveTest
 * - If no DriveTest exists/linked, returns {}
 */
export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    // GATE: must be allowed to view drive test step
    if (!hasReachedStep(onboardingDoc, EStepPath.DRIVE_TEST)) {
      return errorResponse(403, "driver hasn't reached this step yet");
    }

    // Read DriveTest reference from onboardingDoc.forms.driveTest
    const driveTestId = onboardingDoc.forms?.driveTest;
    let driveTestDoc = null;

    if (driveTestId && isValidObjectId(driveTestId)) {
      driveTestDoc = await DriveTest.findById(driveTestId);
    }

    return successResponse(200, "drive test data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      driveTest: driveTestDoc ?? {},
    });
  } catch (error) {
    return errorResponse(error);
  }
};
