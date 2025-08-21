import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { IApplicationFormPage2 } from "@/types/applicationForm.types";
import { EStepPath } from "@/types/onboardingTracker.types";
import { buildTrackerContext, onboardingExpired, hasReachedStep, advanceProgress, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";
import { validateEmploymentHistory } from "@/lib/utils/validationUtils";

/**
 * PATCH /page-2
 * - Validates & saves Page 2
 * - Requires that the user can access Page 2 (i.e., has progressed to it)
 * - Advances progress to Page 2 (furthest) and refreshes resume expiry
 * - Also records lastVisitedStep = Page 2
 */
export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    const body = (await req.json()) as IApplicationFormPage2;

    // Page-2 specific business validation
    const validationError = validateEmploymentHistory(body.employments);
    if (validationError) return errorResponse(400, validationError);

    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // GATE: must be allowed to access Page 2
    if (!hasReachedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_2)) {
      return errorResponse(403, "please complete previous step first");
    }

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
    onboardingDoc.status = advanceProgress(onboardingDoc.status, EStepPath.APPLICATION_PAGE_2);
    // 2) Refresh resume window
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();

    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 2 updated", {
      // For server responses you usually want authoritative navigation;
      // if you prefer resume UX here, pass true to use lastVisitedStep.
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_2),
      page2: appFormDoc.page2,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * GET /page-2
 * - Gated by access to Page 2 (furthest >= PAGE_2)
 * - Updates lastVisitedStep to Page 2 (resume UX)
 * - Returns page2 data + context (built from lastVisited for UX)
 */
export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // GATE: must be allowed to view Page 2
    if (!hasReachedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_2)) {
      return errorResponse(403, "Please complete previous step first");
    }

    return successResponse(200, "Page 2 data retrieved", {
      // For page rendering/resume, build context from lastVisited
      onboardingContext: buildTrackerContext(onboardingDoc),
      page2: appFormDoc.page2,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
