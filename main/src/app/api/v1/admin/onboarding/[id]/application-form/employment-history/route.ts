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

/**
 * PATCH /admin/onboarding/[id]/application-form/employment-history
 * - Validates & saves empoloyment history
 * - Requires that the user can access empoloyment history (i.e., has progressed to it)
 * - Advances progress to empoloyment history (furthest) and refreshes resume expiry
 */
export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    const body = (await req.json()) as IApplicationFormPage2;

    // employment-history specific business validation
    const validationError = validateEmploymentHistory(body.employments);
    if (validationError) return errorResponse(400, validationError);

    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (!isInvitationApproved(onboardingDoc)) return errorResponse(400, "driver not yet approved for onboarding process");

    if (!hasCompletedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_2)) return errorResponse(401, "driver hasn't completed this step yet");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // ---------------------------
    // Phase 1: write page2 only
    // ---------------------------
    appFormDoc.set("page2", body);
    await appFormDoc.validate(["page2"]); // validate subtree
    await appFormDoc.save({ validateBeforeSave: false }); // persist without full-doc validation

    // ---------------------------
    // Phase 2: tracker updates
    // ---------------------------
    // 1) Advance authoritative progress to PAGE_2 (monotonic)
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.APPLICATION_PAGE_2);
    // 2) Refresh resume window
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();

    await onboardingDoc.save();

    return successResponse(200, "employment history updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_2, true),
      employmentHistory: appFormDoc.page2,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * GET /employment-history
 * - Gated by access to empoloyment history (furthest >= PAGE_2)
 * - Updates lastVisitedStep to empoloyment history (resume UX)
 * - Returns page2 data + context (built from lastVisited for UX)
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

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // GATE: must be allowed to view empoloyment history
    if (!hasCompletedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_2)) return errorResponse(401, "driver hasn't completed this step yet");

    return successResponse(200, "empoloyment history data retrieved", {
      // For page rendering/resume, build context from lastVisited
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      employmentHistory: appFormDoc.page2,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
