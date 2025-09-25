// src/app/api/v1/onboarding/[id]/flatbed-training/route.ts
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import FlatbedTraining from "@/mongoose/models/FlatbedTraining";
import { isValidObjectId } from "mongoose";
import { buildTrackerContext, hasReachedStep } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";
import { requireOnboardingSession } from "@/lib/utils/auth/onboardingSession";
import { attachCookies } from "@/lib/utils/auth/attachCookie";

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const { tracker: onboardingDoc, refreshCookie } = await requireOnboardingSession(onboardingId);

    if (!hasReachedStep(onboardingDoc, EStepPath.FLATBED_TRAINING)) {
      return errorResponse(403, "Please complete previous steps first");
    }

    const flatbedTrainingId = onboardingDoc.forms?.flatbedTraining as any | undefined;
    const flatbedTrainingDoc = flatbedTrainingId ? await FlatbedTraining.findById(flatbedTrainingId) : null;

    // Build base context and enrich with itemSummary
    // Use FLATBED_TRAINING as the current step to get the correct nextStep
    const baseContext = buildTrackerContext(onboardingDoc, EStepPath.FLATBED_TRAINING);
    const enrichedContext = {
      ...baseContext,
      itemSummary: {
        ...(baseContext as any).itemSummary,
      },
    };

    const res = successResponse(200, "Flatbed training data retrieved", {
      onboardingContext: enrichedContext,
      flatbedTraining: flatbedTrainingDoc?.toObject() ?? {},
    });

    return attachCookies(res, refreshCookie);
  } catch (error) {
    return errorResponse(error);
  }
};
