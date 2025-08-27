// src/app/api/v1/onboarding/[id]/drive-test/route.ts
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import DriveTest from "@/mongoose/models/DriveTest";
import { isValidObjectId } from "mongoose";
import { advanceProgress, buildTrackerContext, hasReachedStep, nextResumeExpiry, onboardingExpired } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    if (!hasReachedStep(onboardingDoc, EStepPath.DRIVE_TEST)) {
      return errorResponse(403, "Please complete previous steps first");
    }

    const driveTestId = onboardingDoc.forms?.driveTest as any | undefined;
    const driveTestDoc = driveTestId ? await DriveTest.findById(driveTestId) : null;

    return successResponse(200, "Drive test data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc),
      driveTest: driveTestDoc?.toObject() ?? {}, // return doc directly (or empty object if not created yet)
    });
  } catch (error) {
    return errorResponse(error);
  }
};

// Optional: PATCH endpoint for updating drive test completion status
// This would be used by admin/supervisor to mark the drive test as completed
export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Invalid onboarding ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    if (!hasReachedStep(onboardingDoc, EStepPath.DRIVE_TEST)) {
      return errorResponse(400, "Please complete previous steps first");
    }

    // Parse request body
    const body = await req.json();
    if (!body || typeof body.completed !== 'boolean') {
      return errorResponse(400, "Invalid payload: completed boolean is required");
    }

    // Find or create DriveTest doc
    const existingId = onboardingDoc.forms?.driveTest as any | undefined;
    let driveTestDoc = existingId ? await DriveTest.findById(existingId) : null;
    if (!driveTestDoc) {
      driveTestDoc = await DriveTest.create({
        completed: false,
      });
      onboardingDoc.set("forms.driveTest", driveTestDoc._id);
      await onboardingDoc.save();
    }

    // Update completion status
    driveTestDoc.completed = body.completed;
    await driveTestDoc.save();

    // If completed, advance to next step
    if (body.completed) {
      onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.DRIVE_TEST);
      onboardingDoc.resumeExpiresAt = nextResumeExpiry();
      await onboardingDoc.save();
    }

    return successResponse(200, "Drive test status updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.DRIVE_TEST),
      driveTest: driveTestDoc.toObject(),
    });
  } catch (err) {
    return errorResponse(err);
  }
};
