// src/app/api/v1/onboarding/[id]/carriers-edge-training/route.ts
import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import CarriersEdgeTraining from "@/mongoose/models/CarriersEdgeTraining";

import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { buildTrackerContext, hasReachedStep, onboardingExpired } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";

/**
 * GET /api/v1/onboarding/[id]/carriers-edge-training  (Driver-side)
 *
 * Returns:
 *  - onboardingContext
 *  - carriersEdgeTraining (doc snapshot if created; {} otherwise)
 *
 * Guards:
 *  - Valid tracker ID
 *  - Tracker exists and not terminated
 *  - Onboarding session not expired
 *  - Driver has reached the CARRIERS_EDGE_TRAINING step
 */
export const GET = async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) {
      return errorResponse(404, "Onboarding document not found");
    }

    if (onboardingExpired(onboardingDoc)) {
      return errorResponse(400, "Onboarding session expired");
    }

    if (!hasReachedStep(onboardingDoc, EStepPath.CARRIERS_EDGE_TRAINING)) {
      return errorResponse(403, "Please complete previous steps first");
    }

    const ceId = onboardingDoc.forms?.carriersEdgeTraining as any | undefined;
    const ceDoc = ceId ? await CarriersEdgeTraining.findById(ceId) : null;

    return successResponse(200, "CarriersEdge training data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc),
      carriersEdgeTraining: ceDoc?.toObject() ?? {},
    });
  } catch (error) {
    return errorResponse(error);
  }
};
