import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import { IApplicationFormPage5 } from "@/types/applicationForm.types";
import { competencyQuestions } from "@/constants/competencyTestQuestions";
import { advanceProgress, buildTrackerContext, hasReachedStep, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { requireOnboardingSession } from "@/lib/utils/auth/onboardingSession";
import { attachCookies } from "@/lib/utils/auth/attachCookie";

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    const { id } = await params;

    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    const body = (await req.json()) as IApplicationFormPage5;

    // ---- Page5 business rules only ----
    if (!Array.isArray(body.answers) || body.answers.length === 0) {
      return errorResponse(400, "Answers array is required and must not be empty.");
    }
    for (const a of body.answers) {
      if (!a.questionId || !a.answerId) {
        return errorResponse(400, "Each answer must have a questionId and answerId.");
      }
    }

    const { tracker: onboardingDoc, refreshCookie } = await requireOnboardingSession(id);

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // step gating
    if (!hasReachedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_5)) {
      return errorResponse(400, "Please complete previous steps first");
    }
    if (appFormDoc.page5?.score) {
      return errorResponse(400, "cannot retake competency questions");
    }

    // validate answers against question set
    const totalQuestions = competencyQuestions.length;
    const validQuestionIds = new Set(competencyQuestions.map((q) => q.questionId));
    const answeredIds = new Set(body.answers.map((a) => a.questionId));

    if (answeredIds.size !== totalQuestions) {
      return errorResponse(400, `All ${totalQuestions} questions must be answered. Received ${answeredIds.size}.`);
    }
    for (const a of body.answers) {
      if (!validQuestionIds.has(a.questionId)) {
        return errorResponse(400, `Invalid questionId: ${a.questionId}`);
      }
    }

    // scoring
    let score = 0;
    for (const a of body.answers) {
      const q = competencyQuestions.find((q) => q.questionId === a.questionId);
      if (q?.correctAnswerId === a.answerId) score++;
    }

    // ---------------------------
    // Phase 1: write page5 only
    // ---------------------------
    appFormDoc.set("page5", { answers: body.answers, score });
    // validate only page5 subtree
    await appFormDoc.validate(["page5"]);
    // Save without triggering full-document validation
    await appFormDoc.save({ validateBeforeSave: false });

    // ---------------------------
    // Phase 2: tracker updates
    // ---------------------------
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.APPLICATION_PAGE_5);
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    const res = successResponse(200, "ApplicationForm Page 5 updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_5),
      page5: appFormDoc.page5,
    });

    return attachCookies(res, refreshCookie);
  } catch (error) {
    console.error("Error updating application form page 5:", error);
    return errorResponse(error);
  }
};

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;

    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    const { tracker: onboardingDoc, refreshCookie } = await requireOnboardingSession(onboardingId);

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) {
      return errorResponse(404, "ApplicationForm not linked");
    }

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) {
      return errorResponse(404, "ApplicationForm not found");
    }

    if (!hasReachedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_5)) {
      return errorResponse(403, "Please complete previous steps first");
    }

    const res = successResponse(200, "Page 5 data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_5),
      page5: appFormDoc.page5 ?? {},
    });

    return attachCookies(res, refreshCookie);
  } catch (error) {
    return errorResponse(error);
  }
};
