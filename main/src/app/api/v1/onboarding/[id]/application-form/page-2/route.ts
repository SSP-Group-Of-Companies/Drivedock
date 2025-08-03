import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { IApplicationFormPage2 } from "@/types/applicationForm.types";
import { validateEmploymentHistory } from "@/lib/utils/validateEmploymentHistory";
import {
  advanceStatus,
  buildTrackerContext,
  hasCompletedStep,
  onboardingExpired,
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

    const body = (await req.json()) as IApplicationFormPage2;

    // Validate employment history logic
    const validationError = validateEmploymentHistory(body.employments);
    if (validationError) return errorResponse(400, validationError);

    // Retrieve onboarding tracker
    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc)
      return errorResponse(404, "OnboardingTracker not found");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // check completed step
    if (!hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_1))
      return errorResponse(400, "please complete previous step first");

    // Update Page 2
    appFormDoc.page2 = body;
    await appFormDoc.save();

    // Update onboarding tracker
    onboardingDoc.status = advanceStatus(
      onboardingDoc.status,
      EStepPath.APPLICATION_PAGE_2
    );
    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 2 updated", {
      onboardingContext: buildTrackerContext(
        onboardingDoc,
        EStepPath.APPLICATION_PAGE_2
      ),
      applicationForm: appFormDoc.toObject({ virtuals: true }),
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const GET = async (
  _: NextRequest,
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
      return errorResponse(404, "Onboarding document not found");
    }

    if (onboardingExpired(onboardingDoc))
      return errorResponse(400, "Onboarding session expired");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) {
      return errorResponse(404, "ApplicationForm not linked");
    }

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) {
      return errorResponse(404, "ApplicationForm not found");
    }

    if (!hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_1)) {
      return errorResponse(403, "Please complete previous step first");
    }

    return successResponse(200, "Page 2 data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc),
      page2: appFormDoc.page2,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
