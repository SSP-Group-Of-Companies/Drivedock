// app/api/v1/admin/onboarding/[id]/application-form/accident-criminal/route.ts
import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/utils/auth/authUtils";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";

import { buildTrackerContext, advanceProgress, nextResumeExpiry, hasCompletedStep } from "@/lib/utils/onboardingUtils";

import { EStepPath } from "@/types/onboardingTracker.types";
import type { IAccidentEntry, ITrafficConvictionEntry, ICriminalRecordEntry, IApplicationFormDoc } from "@/types/applicationForm.types";

/**
 * ===============================================================
 * Admin — Accident/Convictions + Criminal Records (Combined)
 * ---------------------------------------------------------------
 * Route: /api/v1/admin/onboarding/[id]/application-form/accident-criminal
 *
 * Scope:
 *  - Combines:
 *      • Page 3: accidentHistory[], trafficConvictions[]
 *      • Page 4: criminalRecords[]
 *
 * Gatekeeping:
 *  - Driver must have completed PAGE_4 (furthest >= PAGE_4).
 *  - Admin GET/PATCH both require PAGE_4 completion.
 *
 * Behavior:
 *  - PATCH: writes only the above three arrays; validates subtrees
 *           and advances progress to PAGE_4 + refreshes resume expiry.
 *  - GET:   returns those three arrays with onboardingContext (from lastVisited).
 * ===============================================================
 */

/* ------------------------- Payload shape ------------------------- */
type PatchBody = {
  accidentHistory?: IAccidentEntry[];
  trafficConvictions?: ITrafficConvictionEntry[];
  criminalRecords?: ICriminalRecordEntry[];
};

/* ------------------------------- PATCH ------------------------------- */
/**
 * PATCH /admin/onboarding/:id/application-form/accident-criminal
 * - Writes:
 *     page3.accidentHistory
 *     page3.trafficConvictions
 *     page4.criminalRecords
 * - Validates only relevant subtrees
 * - Requires PAGE_4 completed
 * - Advances authoritative progress to PAGE_4 and refreshes resume expiry
 */
export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const body = (await req.json()) as PatchBody;

    // Load tracker
    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");

    // Gate: must have completed up to PAGE_4
    if (!hasCompletedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_4)) {
      return errorResponse(401, "Driver hasn't completed this step yet");
    }

    // Resolve ApplicationForm
    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = (await ApplicationForm.findById(appFormId)) as IApplicationFormDoc | null;
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // Ensure page3 + page4 exist (they should if PAGE_4 is completed)
    if (!appFormDoc.page3) return errorResponse(400, "ApplicationForm Page 3 is missing");
    if (!appFormDoc.page4) return errorResponse(400, "ApplicationForm Page 4 is missing");

    // ---------------------------
    // Phase 1: write subtrees ONLY
    // ---------------------------
    if (body.accidentHistory) {
      appFormDoc.set("page3.accidentHistory", body.accidentHistory);
      appFormDoc.set(
        "page3.hasAccidentHistory",
        Array.isArray(body.accidentHistory) && body.accidentHistory.length > 0
      );
    }
    if (body.trafficConvictions) {
      appFormDoc.set("page3.trafficConvictions", body.trafficConvictions);
      appFormDoc.set(
        "page3.hasTrafficConvictions",
        Array.isArray(body.trafficConvictions) && body.trafficConvictions.length > 0
      );
    }
    if (body.criminalRecords) {
      appFormDoc.set("page4.criminalRecords", body.criminalRecords);
      appFormDoc.set(
        "page4.hasCriminalRecords",
        Array.isArray(body.criminalRecords) && body.criminalRecords.length > 0
      );
    }

    // Validate ONLY affected pages (lets Mongoose run your per-page rules)
    // NOTE: We validate `page3` and/or `page4` if we touched anything within them.
    const validatePaths: string[] = [];
    if (body.accidentHistory || body.trafficConvictions) validatePaths.push("page3");
    if (body.criminalRecords) validatePaths.push("page4");

    if (validatePaths.length > 0) {
      await appFormDoc.validate(validatePaths);
    }

    // Persist without re-validating everything
    await appFormDoc.save({ validateBeforeSave: false });

    // ---------------------------
    // Phase 2: tracker updates
    // ---------------------------
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.APPLICATION_PAGE_4);
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    return successResponse(200, "Accident/Convictions/Criminal records updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_4, true),
      hasAccidentHistory: appFormDoc.page3?.hasAccidentHistory,
      accidentHistory: appFormDoc.page3.accidentHistory,
      hasTrafficConvictions: appFormDoc.page3?.hasTrafficConvictions,
      trafficConvictions: appFormDoc.page3.trafficConvictions,
      hasCriminalRecords: appFormDoc.page4?.hasCriminalRecords,
      criminalRecords: appFormDoc.page4.criminalRecords,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

/* -------------------------------- GET -------------------------------- */
/**
 * GET /admin/onboarding/:id/application-form/accident-criminal
 * - Gated by PAGE_4 completion
 * - Returns the three arrays + onboardingContext (from lastVisited for UX)
 */
export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = (await ApplicationForm.findById(appFormId)) as IApplicationFormDoc | null;
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // Gate: must be allowed to view PATCH/GET for this combined data => PAGE_4 completed
    if (!hasCompletedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_4)) {
      return errorResponse(401, "Driver hasn't completed this step yet");
    }

    // Defensive: ensure subdocs (should exist if PAGE_4 completed)
    if (!appFormDoc.page3) return errorResponse(400, "ApplicationForm Page 3 is missing");
    if (!appFormDoc.page4) return errorResponse(400, "ApplicationForm Page 4 is missing");

    return successResponse(200, "Accident/Convictions/Criminal records retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      hasAccidentHistory: appFormDoc.page3?.hasAccidentHistory,
      accidentHistory: appFormDoc.page3.accidentHistory,
      hasTrafficConvictions: appFormDoc.page3?.hasTrafficConvictions,
      trafficConvictions: appFormDoc.page3.trafficConvictions,
      hasCriminalRecords: appFormDoc.page4?.hasCriminalRecords,
      criminalRecords: appFormDoc.page4.criminalRecords,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
