// src/app/api/v1/onboarding/[id]/carriers-edge-training/route.ts
import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import CarriersEdgeTraining from "@/mongoose/models/CarriersEdgeTraining";
import ApplicationForm from "@/mongoose/models/ApplicationForm";

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
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.status.completed === true) return errorResponse(401, "onboarding process already completed");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    if (!hasReachedStep(onboardingDoc, EStepPath.CARRIERS_EDGE_TRAINING)) {
      return errorResponse(403, "Please complete previous steps first");
    }

    const ceId = onboardingDoc.forms?.carriersEdgeTraining as any | undefined;
    const ceDoc = ceId ? await CarriersEdgeTraining.findById(ceId) : null;

    // --- Extract driver email from ApplicationForm ---
    let driverEmail: string | undefined;
    const driverAppRef: any = onboardingDoc.forms?.driverApplication;

    const tryExtractFromDoc = (doc: any) => {
      driverEmail = doc?.page1?.email ?? undefined;
    };

    if (driverAppRef?._id && typeof driverAppRef === "object" && !driverAppRef.page1) {
      // This is an ObjectId reference, not a populated document
      const driverAppId = driverAppRef.toString();

      if (driverAppId && isValidObjectId(driverAppId)) {
        const appDoc = await ApplicationForm.findById(driverAppId, {
          "page1.email": 1,
        }).lean();

        if (appDoc) tryExtractFromDoc(appDoc);
      }
    } else if (driverAppRef?.page1) {
      // This is already a populated document
      tryExtractFromDoc(driverAppRef);
    } else {
      // Fallback: try to find any ApplicationForm associated with this onboarding tracker
      const fallbackAppDoc = await ApplicationForm.findOne(
        { onboardingTrackerId: onboardingId },
        {
          "page1.email": 1,
        }
      ).lean();

      if (fallbackAppDoc) tryExtractFromDoc(fallbackAppDoc);
    }

    // Build base context and enrich with itemSummary
    // Use CARRIERS_EDGE_TRAINING as the current step to get the correct nextStep
    const baseContext = buildTrackerContext(onboardingDoc, EStepPath.CARRIERS_EDGE_TRAINING);
    const enrichedContext = {
      ...baseContext,
      itemSummary: {
        ...(baseContext as any).itemSummary,
        ...(driverEmail ? { driverEmail } : undefined),
      },
    };

    return successResponse(200, "CarriersEdge training data retrieved", {
      onboardingContext: enrichedContext,
      carriersEdgeTraining: ceDoc?.toObject() ?? {},
    });
  } catch (error) {
    return errorResponse(error);
  }
};
