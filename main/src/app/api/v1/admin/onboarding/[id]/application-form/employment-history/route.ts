import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { IApplicationFormPage2 } from "@/types/applicationForm.types";
import { EStepPath } from "@/types/onboardingTracker.types";
import { buildTrackerContext, advanceProgress, nextResumeExpiry, hasCompletedStep, isInvitationApproved } from "@/lib/utils/onboardingUtils";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";
import { validateEmploymentHistory } from "@/lib/utils/validationUtils";
import { guard } from "@/lib/utils/auth/authUtils";
import { sortEmploymentsDesc } from "@/lib/utils/sortUtils";

/**
 * PATCH /admin/onboarding/[id]/application-form/employment-history
 * - Validates & saves employment history
 * - Requires that the driver has completed PAGE_2
 * - Advances progress to PAGE_2 (monotonic) and refreshes resume expiry
 */
export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    const body = (await req.json()) as IApplicationFormPage2;

    // Validate employment history
    const validationError = validateEmploymentHistory(body.employments);
    if (validationError) return errorResponse(400, validationError);

    // Persist in canonical order: most recent → oldest
    const payload: IApplicationFormPage2 = {
      ...body,
      employments: sortEmploymentsDesc(body.employments),
    };

    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (!isInvitationApproved(onboardingDoc)) return errorResponse(400, "driver not yet approved for onboarding process");
    if (!hasCompletedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_2)) {
      return errorResponse(401, "driver hasn't completed this step yet");
    }

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // ---------------------------
    // Phase 1: write page2 only (sorted)
    // ---------------------------
    appFormDoc.set("page2", payload);
    await appFormDoc.validate(["page2"]);
    await appFormDoc.save({ validateBeforeSave: false });

    // ---------------------------
    // Phase 2: tracker updates
    // ---------------------------
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.APPLICATION_PAGE_2);
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    // IMPORTANT: return a plain object (no Mongoose internals)
    const freshLean = await ApplicationForm.findById(appFormId).lean();
    const page2Plain = (freshLean?.page2 ?? {}) as IApplicationFormPage2;

    return successResponse(200, "employment history updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_2, true),
      employmentHistory: page2Plain, // plain JSON (no $__parent)
    });
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * GET /admin/onboarding/[id]/application-form/employment-history
 * - Returns employment history (sorted) + admin context
 * - Uses .lean() so response is plain JSON (no Mongoose internals)
 */
export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");
    if (!isInvitationApproved(onboardingDoc)) return errorResponse(400, "driver not yet approved for onboarding process");
    if (!hasCompletedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_2)) {
      return errorResponse(401, "driver hasn't completed this step yet");
    }

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    // Use lean() to avoid $__parent and other internals
    const appFormLean = await ApplicationForm.findById(appFormId).lean();
    if (!appFormLean) return errorResponse(404, "ApplicationForm not found");

    // Normalize to sorted order on read (covers legacy unsorted data)
    const page2 = (appFormLean.page2 ?? {}) as IApplicationFormPage2;
    const employments = Array.isArray(page2.employments) ? sortEmploymentsDesc(page2.employments) : [];
    const normalizedPage2: IApplicationFormPage2 = { ...page2, employments };

    return successResponse(200, "employment history data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      employmentHistory: normalizedPage2, // plain JSON (lean)
    });
  } catch (error) {
    return errorResponse(error);
  }
};
