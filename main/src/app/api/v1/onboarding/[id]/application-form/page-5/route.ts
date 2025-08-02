import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { IApplicationFormPage5 } from "@/types/applicationForm.types";
import { competencyQuestions } from "@/constants/competencyTestQuestions";
import {
  advanceStatus,
  buildTrackerContext,
  hasCompletedStep,
} from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.type";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();
    const { id } = await params;

    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    const body = (await req.json()) as IApplicationFormPage5;

    if (!Array.isArray(body.answers) || body.answers.length === 0) {
      return errorResponse(
        400,
        "Answers array is required and must not be empty."
      );
    }

    for (const answer of body.answers) {
      if (!answer.questionId || !answer.answerId) {
        return errorResponse(
          400,
          "Each answer must have a questionId and answerId."
        );
      }
    }

    // Validate onboarding link
    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc)
      return errorResponse(404, "OnboardingTracker not found");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // check completed step
    if (!hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_4))
      return errorResponse(400, "please complete previous step first");

    if (hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_5)) {
      return errorResponse(400, "cannot retake competency questions");
    }

    // validate answers data
    const totalQuestions = competencyQuestions.length;
    const validQuestionIds = new Set(
      competencyQuestions.map((q) => q.questionId)
    );
    const answeredIds = new Set(body.answers.map((a) => a.questionId));

    if (answeredIds.size !== totalQuestions) {
      return errorResponse(
        400,
        `All ${totalQuestions} questions must be answered. Received ${answeredIds.size}.`
      );
    }

    for (const answer of body.answers) {
      if (!validQuestionIds.has(answer.questionId)) {
        return errorResponse(400, `Invalid questionId: ${answer.questionId}`);
      }
    }

    // Scoring logic
    let score = 0;
    for (const answer of body.answers) {
      const q = competencyQuestions.find(
        (q) => q.questionId === answer.questionId
      );
      if (q?.correctAnswerId === answer.answerId) score++;
    }

    // Save
    appFormDoc.page5 = {
      answers: body.answers,
      score,
    };
    await appFormDoc.save();

    // Update onboarding tracker steps
    onboardingDoc.status = advanceStatus(
      onboardingDoc.status,
      EStepPath.APPLICATION_PAGE_5
    );

    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 5 updated", {
      onboardingContext: buildTrackerContext(
        req,
        onboardingDoc,
        EStepPath.APPLICATION_PAGE_5
      ),
      applicationForm: appFormDoc.toObject({ virtuals: true }),
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;

    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    // Fetch onboarding tracker
    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc) {
      return errorResponse(404, "Onboarding tracker not found");
    }

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) {
      return errorResponse(404, "ApplicationForm not linked");
    }

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) {
      return errorResponse(404, "ApplicationForm not found");
    }

    if (!hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_4)) {
      return errorResponse(403, "Please complete previous step first");
    }

    return successResponse(200, "Page 5 data retrieved", {
      onboardingContext: buildTrackerContext(req, onboardingDoc),
      page5: appFormDoc.page5,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
