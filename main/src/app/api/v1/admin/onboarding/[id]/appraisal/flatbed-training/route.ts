// app/api/v1/admin/onboarding/[id]/appraisal/flatbed-training/route.ts
import { NextRequest, after } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { parseJsonBody } from "@/lib/utils/reqParser";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import FlatbedTraining from "@/mongoose/models/FlatbedTraining";

import { buildTrackerContext, hasReachedStep, advanceProgress, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { canHaveFlatbedTraining } from "@/constants/companies";

import { EStepPath } from "@/types/onboardingTracker.types";
import type { IFlatbedTraining } from "@/types/flatbedTraining.types";
import { guard } from "@/lib/utils/auth/authUtils";
import { triggerCompletionEmailIfEligible } from "@/lib/services/triggerCompletionEmail";
/**
 * GET /admin/onboarding/:id/appraisal/flatbed-training
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
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");

    if (!hasReachedStep(onboardingDoc, EStepPath.FLATBED_TRAINING)) {
      return errorResponse(403, "driver hasn't reached this step yet");
    }

    const flatbedId = onboardingDoc.forms?.flatbedTraining;
    const flatbedTraining = flatbedId && isValidObjectId(flatbedId) ? await FlatbedTraining.findById(flatbedId).lean() : null;

    return successResponse(200, "flatbed training retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      flatbedTraining, // already plain object from .lean()
    });
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * PATCH /admin/onboarding/:id/appraisal/flatbed-training
 *
 * Purpose:
 * - Mark Flatbed Training as completed (admin action).
 *
 * Input:
 * {
 *   "flatbedTraining": {
 *     "completed": boolean   // usually true when marking done
 *   }
 * }
 *
 * Rules:
 * - If FlatbedTraining already completed → 401 "flatbed training already completed".
 * - Validate applicability:
 *   - BOTH must be true:
 *     1) canHaveFlatbedTraining(companyId, applicationType)
 *     2) onboardingDoc.needsFlatbedTraining === true
 * - On success:
 *   - Upsert FlatbedTraining doc (create if missing)
 *   - Set completed = payload.completed (must be true)
 *   - Link to onboardingDoc.forms.flatbedTraining if not linked
 *   - Advance progress to EStepPath.FLATBED_TRAINING and refresh resume expiry
 *   - Return { onboardingContext, flatbedTraining }
 */
export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Invalid onboarding ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.status.completed === true) return errorResponse(401, "onboarding process already completed");

    if (!hasReachedStep(onboardingDoc, EStepPath.FLATBED_TRAINING)) {
      return errorResponse(403, "driver hasn't reached this step yet");
    }

    // Applicability check (both conditions)
    const applicable = canHaveFlatbedTraining(onboardingDoc.companyId as string, onboardingDoc.applicationType as any);

    if (!applicable || onboardingDoc.needsFlatbedTraining !== true) {
      return errorResponse(400, "Flatbed training is not applicable for this applicant/company");
    }

    // Body
    const body = await parseJsonBody<{
      flatbedTraining?: Partial<IFlatbedTraining>;
    }>(req);
    const payload = body?.flatbedTraining;
    if (!payload) return errorResponse(400, "Missing 'flatbedTraining' in request body");

    if (typeof payload.completed !== "boolean") {
      return errorResponse(400, "flatbedTraining.completed is required");
    }

    // Load/create the flatbed document
    let flatbedDoc: any | null = null;
    const flatbedId = onboardingDoc.forms?.flatbedTraining;
    if (flatbedId && isValidObjectId(flatbedId)) {
      flatbedDoc = await FlatbedTraining.findById(flatbedId);
    }
    if (!flatbedDoc) {
      flatbedDoc = new FlatbedTraining({ completed: false });
    }

    // Refuse further updates once completed
    if (flatbedDoc.completed === true) {
      return errorResponse(401, "flatbed training already completed");
    }

    if (payload.completed !== true) {
      return errorResponse(400, "cannot unset or mark flatbed training as incomplete");
    }

    // Persist completion
    flatbedDoc.completed = true;
    await flatbedDoc.save();

    // Ensure it's linked on the tracker
    if (!onboardingDoc.forms) onboardingDoc.forms = {} as any;
    onboardingDoc.forms.flatbedTraining = flatbedDoc._id;

    // Advance progress and extend resume window
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.FLATBED_TRAINING);
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    // send onboarding completion email to driver if applicable
    after(() => triggerCompletionEmailIfEligible(onboardingDoc, req));

    return successResponse(200, "flatbed training marked completed", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.FLATBED_TRAINING, true),
      flatbedTraining: flatbedDoc.toObject(),
    });
  } catch (error) {
    return errorResponse(error);
  }
};
