import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { IApplicationFormPage2 } from "@/types/applicationForm.types";
import { EStepPath } from "@/types/onboardingTracker.types";
import { buildTrackerContext, hasReachedStep, advanceProgress, nextResumeExpiry, isInvitationApproved } from "@/lib/utils/onboardingUtils";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";
import { validateEmploymentHistory } from "@/lib/utils/validationUtils";
import { requireOnboardingSession } from "@/lib/utils/auth/onboardingSession";
import { attachCookies } from "@/lib/utils/auth/attachCookie";
import { sortEmploymentsDesc } from "@/lib/utils/sortUtils";

/**
 * PATCH /page-2
 * - Validates & saves Page 2
 * - Requires that the user can access Page 2 (i.e., has progressed to it)
 * - Advances progress to Page 2 (furthest) and refreshes resume expiry
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

    // Sort employments to persist in canonical order (current → oldest)
    const sortedEmployments = sortEmploymentsDesc(body.employments);
    const payload: IApplicationFormPage2 = { ...body, employments: sortedEmployments };

    const { tracker: onboardingDoc, refreshCookie } = await requireOnboardingSession(id);
    if (!isInvitationApproved(onboardingDoc)) return errorResponse(401, "pending approval");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // GATE: must be allowed to access Page 2
    if (!hasReachedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_2)) {
      return errorResponse(403, "Please complete previous steps first");
    }

    // ---------------------------
    // Phase 1: write page2 only (with sorted employments)
    // ---------------------------
    appFormDoc.set("page2", payload);
    await appFormDoc.validate(["page2"]); // validate subtree
    await appFormDoc.save({ validateBeforeSave: false }); // persist without full-doc validation

    // ---------------------------
    // Phase 2: tracker updates
    // ---------------------------
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.APPLICATION_PAGE_2); // monotonic
    onboardingDoc.resumeExpiresAt = nextResumeExpiry(); // refresh resume window
    await onboardingDoc.save();

    // Return a plain JSON snapshot (avoid $__parent etc.)
    const freshLean = await ApplicationForm.findById(appFormId).lean();
    const page2Plain = (freshLean?.page2 ?? {}) as IApplicationFormPage2;

    const res = successResponse(200, "ApplicationForm Page 2 updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_2),
      page2: page2Plain, // plain JSON, already sorted
    });

    return attachCookies(res, refreshCookie);
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

    const { tracker: onboardingDoc, refreshCookie } = await requireOnboardingSession(onboardingId);

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    // Use lean() to avoid Mongoose internals in response
    const appFormLean = await ApplicationForm.findById(appFormId).lean();
    if (!appFormLean) return errorResponse(404, "ApplicationForm not found");

    // GATE: must be allowed to view Page 2
    if (!hasReachedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_2)) {
      return errorResponse(403, "Please complete previous steps first");
    }

    // Ensure the array is served sorted even if legacy data is out of order
    const page2 = (appFormLean.page2 ?? {}) as IApplicationFormPage2;
    const employments = Array.isArray(page2.employments) ? sortEmploymentsDesc(page2.employments) : [];
    const normalizedPage2: IApplicationFormPage2 = { ...page2, employments };

    const res = successResponse(200, "Page 2 data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_2),
      page2: normalizedPage2, // plain JSON
    });

    return attachCookies(res, refreshCookie);
  } catch (error) {
    return errorResponse(error);
  }
};
