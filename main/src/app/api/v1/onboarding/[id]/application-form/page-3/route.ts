import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
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

    const body = await req.json(); // type: IApplicationFormPage3 if you have it

    const { tracker: onboardingDoc, refreshCookie } = await requireOnboardingSession(id);

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // must have access
    if (!hasReachedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_3)) {
      return errorResponse(400, "Please complete previous steps first");
    }

    // ---------------------------
    // Phase 1: write page3 only
    // ---------------------------
    appFormDoc.set("page3", body.page3 || body);
    // validate only page3 subtree
    await appFormDoc.validate(["page3"]);
    // Save without triggering full-document validation
    await appFormDoc.save({ validateBeforeSave: false });

    // ---------------------------
    // Phase 2: tracker updates
    // ---------------------------
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.APPLICATION_PAGE_3);
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    const res = successResponse(200, "ApplicationForm Page 3 updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_3),
      page3: appFormDoc.page3,
    });

    return attachCookies(res, refreshCookie);
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

    const { tracker: onboardingDoc, refreshCookie } = await requireOnboardingSession(onboardingId);

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) {
      return errorResponse(404, "ApplicationForm not linked");
    }

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) {
      return errorResponse(404, "ApplicationForm not found");
    }

    if (!hasReachedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_3)) {
      return errorResponse(403, "Please complete previous steps first");
    }

    const res = successResponse(200, "Page 3 data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_3),
      page3: appFormDoc.page3,
    });

    return attachCookies(res, refreshCookie);
  } catch (error) {
    return errorResponse(error);
  }
};
