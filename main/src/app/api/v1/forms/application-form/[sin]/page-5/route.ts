import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { hashString } from "@/lib/utils/cryptoUtils";
import { IApplicationFormPage5 } from "@/types/applicationForm.types";
import { competencyQuestions } from "@/constants/competencyTestQuestions";

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ sin: string }> }
) => {
  try {
    await connectDB();
    const { sin } = await params;
    if (!sin || sin.length !== 9)
      return errorResponse(400, "Invalid SIN in URL");

    const sinHash = hashString(sin);
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
    const onboardingDoc = await OnboardingTracker.findOne({ sinHash });
    if (!onboardingDoc)
      return errorResponse(404, "OnboardingTracker not found");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // Step check
    if (appFormDoc.completedStep < 4)
      return errorResponse(400, "Please complete previous step first");

    if (appFormDoc.completedStep >= 5) {
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

    // update application form steps
    appFormDoc.currentStep = 5;
    appFormDoc.completedStep = 5;
    await appFormDoc.save();

    // Update onboarding tracker steps
    onboardingDoc.status.currentStep = 3;
    onboardingDoc.status.completedStep = 2;

    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 5 updated", {
      onboardingTracker: onboardingDoc.toObject({ virtuals: true }),
      applicationForm: appFormDoc.toObject({ virtuals: true }),
    });
  } catch (error) {
    console.error("Error updating application form page 5:", error);
    return errorResponse(500, "Failed to update application form page 5");
  }
};
