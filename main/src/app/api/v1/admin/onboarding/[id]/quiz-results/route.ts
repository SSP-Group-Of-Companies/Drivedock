// app/api/v1/admin/onboarding/[id]/quiz-results/route.ts
import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/auth/authUtils";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";

import { buildTrackerContext, hasCompletedStep } from "@/lib/utils/onboardingUtils";

import { EStepPath } from "@/types/onboardingTracker.types";

/**
 * GET /api/v1/admin/onboarding/:id/quiz-results
 * - Admin-only view of competency quiz results (Application Page 5)
 * - Gated by driver completion of PAGE_5
 * - Returns page5 (answers + score) and onboardingContext
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
    if (!onboardingDoc || onboardingDoc.terminated) {
      return errorResponse(404, "Onboarding document not found");
    }

    // Gate: driver must have completed Page 5
    if (!hasCompletedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_5)) {
      return errorResponse(401, "driver hasn't completed this step yet");
    }

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    if (!appFormDoc.page5) {
      return errorResponse(404, "Quiz results not found");
    }

    return successResponse(200, "quiz results retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      quizResults: appFormDoc.page5, // { answers, score }
    });
  } catch (error) {
    return errorResponse(error);
  }
};
