import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/ApplicationFormS";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { IApplicationFormPage2 } from "@/types/applicationForm.types";
import { advanceStatus, buildTrackerContext, hasCompletedStep, onboardingExpired } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.type";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";
import { validateEmploymentHistory } from "@/lib/utils/validationUtils";

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    const body = (await req.json()) as IApplicationFormPage2;

    // Business rules for Page 2 only
    const validationError = validateEmploymentHistory(body.employments);
    if (validationError) return errorResponse(400, validationError);

    // Find tracker + form
    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // Must have completed Page 1
    if (!hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_1)) return errorResponse(400, "please complete previous step first");

    // ---------------------------
    // Phase 1: write page2 only
    // ---------------------------
    appFormDoc.set("page2", body);
    // ✅ validate only the page2 subtree
    await appFormDoc.validate(["page2"]);
    // Save without triggering full-document validation
    await appFormDoc.save({ validateBeforeSave: false });

    // (No S3 finalize work here; page 2 doesn't handle files. If you add files later, follow the page-4 finalize pattern.)

    // ---------------------------
    // Phase 2: tracker updates
    // ---------------------------
    onboardingDoc.status = advanceStatus(onboardingDoc.status, EStepPath.APPLICATION_PAGE_2);
    onboardingDoc.resumeExpiresAt = new Date(Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC));
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 2 updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_2),
      page2: appFormDoc.page2,
    });
  } catch (error) {
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

    // Fetch onboarding tracker
    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc) {
      return errorResponse(404, "Onboarding document not found");
    }

    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

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

    // update tracker current step
    onboardingDoc.status.currentStep = EStepPath.APPLICATION_PAGE_2;
    await onboardingDoc.save();

    return successResponse(200, "Page 2 data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc),
      page2: appFormDoc.page2,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
