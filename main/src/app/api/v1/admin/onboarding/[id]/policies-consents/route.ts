// app/api/v1/admin/onboarding/[id]/policies-consents/route.ts
import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/auth/authUtils";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import PoliciesConsents from "@/mongoose/models/PoliciesConsents";

import { buildTrackerContext, hasCompletedStep } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";

/**
 * GET /api/v1/admin/onboarding/:id/policies-consents
 * - Admin-only read of the signed Policies & Consents
 * - Requires that the driver has COMPLETED the Policies & Consents step
 * - Returns the policiesConsents doc (signature, signedAt, sendPoliciesByEmail, etc.)
 *   and an onboardingContext (built from lastVisited for UX)
 */
export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc) {
      return errorResponse(404, "Onboarding document not found");
    }

    // Admin view is allowed only after the driver has completed the step
    if (!hasCompletedStep(onboardingDoc, EStepPath.POLICIES_CONSENTS)) {
      return errorResponse(401, "driver hasn't completed this step yet");
    }

    const policiesId = onboardingDoc.forms?.policiesConsents;
    if (!policiesId) {
      return errorResponse(404, "Policies & Consents not linked");
    }

    const policiesDoc = await PoliciesConsents.findById(policiesId);
    if (!policiesDoc) {
      return errorResponse(404, "Policies & Consents not found");
    }

    return successResponse(200, "policies & consents retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      policiesConsents: policiesDoc.toObject(),
    });
  } catch (error) {
    return errorResponse(error);
  }
};
