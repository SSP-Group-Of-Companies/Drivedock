// app/api/v1/admin/onboarding/[id]/appraisal/flatbed-training/route.ts
import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import FlatbedTraining from "@/mongoose/models/FlatbedTraining";

import { buildTrackerContext, hasReachedStep, onboardingExpired } from "@/lib/utils/onboardingUtils";

import { EStepPath } from "@/types/onboardingTracker.types";
import { guard } from "@/lib/auth/authUtils";

/**
 * GET /onboarding/:id/appraisal/flatbed-training
 * - Returns { onboardingContext, flatbedTraining } (flatbedTraining can be null if not created yet)
 * - Guards:
 *   - Valid onboarding ID
 *   - Onboarding exists and not terminated
 *   - Session not expired
 *   - Driver has reached FLATBED_TRAINING
 */
export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.status.completed === true) return errorResponse(401, "onboarding process already completed");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    if (!hasReachedStep(onboardingDoc, EStepPath.FLATBED_TRAINING)) {
      return errorResponse(403, "please complete preious steps first");
    }

    const flatbedId = onboardingDoc.forms?.flatbedTraining;
    const flatbedTraining = flatbedId && isValidObjectId(flatbedId) ? await FlatbedTraining.findById(flatbedId).lean() : null;

    return successResponse(200, "flatbed training retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.FLATBED_TRAINING),
      flatbedTraining, // already plain object from .lean()
    });
  } catch (error) {
    return errorResponse(error);
  }
};
