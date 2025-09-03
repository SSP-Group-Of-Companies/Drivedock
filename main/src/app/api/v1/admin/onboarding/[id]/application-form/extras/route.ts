// app/api/v1/admin/onboarding/[id]/application-form/extras/route.ts
import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import { AppError, errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/auth/authUtils";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";

import { buildTrackerContext, advanceProgress, nextResumeExpiry, onboardingExpired, hasCompletedStep } from "@/lib/utils/onboardingUtils";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { EStepPath } from "@/types/onboardingTracker.types";

import type { IApplicationFormDoc, IEducation, ICanadianHoursOfService } from "@/types/applicationForm.types";

/**
 * ===============================================================
 * Admin — Application Extras (Mixed)
 * ---------------------------------------------------------------
 * Route: /api/v1/admin/onboarding/[id]/application-form/extras
 *
 * Scope:
 *  - Page 3 subset:
 *      education, canadianHoursOfService
 *  - Page 4 subset (Additional Info, excluding criminalRecords):
 *      deniedLicenseOrPermit, suspendedOrRevoked, suspensionNotes,
 *      testedPositiveOrRefused, completedDOTRequirements, hasAccidentalInsurance
 *
 * Gatekeeping:
 *  - Driver must have completed PAGE_4 for GET/PATCH (admin consolidation).
 * ===============================================================
 */

/* ------------------------- Payload shape ------------------------- */
type PatchBody = {
  // Page 3 subset
  education?: IEducation;
  canadianHoursOfService?: ICanadianHoursOfService;

  // Page 4 additional info (no criminalRecords here)
  deniedLicenseOrPermit?: boolean;
  suspendedOrRevoked?: boolean;
  suspensionNotes?: string;
  testedPositiveOrRefused?: boolean;
  completedDOTRequirements?: boolean;
  hasAccidentalInsurance?: boolean;
};

/* -------------- helpers: CHOS compute & small validations -------------- */
function recomputeCHOSTotalHours(chos?: ICanadianHoursOfService): ICanadianHoursOfService | undefined {
  if (!chos) return undefined;
  const safeDaily = Array.isArray(chos.dailyHours) ? chos.dailyHours : [];
  const total = safeDaily.reduce((sum, d) => {
    const n = typeof d?.hours === "number" ? d.hours : Number(d?.hours ?? 0);
    return sum + (isFinite(n) ? n : 0);
  }, 0);
  return { ...chos, totalHours: total };
}

/* -------------------------------- PATCH -------------------------------- */
export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Invalid onboarding ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    // Require PAGE_4 completed (same admin consolidation gate as identifications)
    if (!hasCompletedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_4)) {
      return errorResponse(401, "Driver hasn't completed this step yet");
    }

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = (await ApplicationForm.findById(appFormId)) as IApplicationFormDoc | null;
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    if (!appFormDoc.page3) return errorResponse(400, "ApplicationForm Page 3 is missing");
    if (!appFormDoc.page4) return errorResponse(400, "ApplicationForm Page 4 is missing");

    const body = await parseJsonBody<PatchBody>(req);

    const touchingP3 = "education" in body || "canadianHoursOfService" in body;

    const touchingP4Info =
      "deniedLicenseOrPermit" in body ||
      "suspendedOrRevoked" in body ||
      "suspensionNotes" in body ||
      "testedPositiveOrRefused" in body ||
      "completedDOTRequirements" in body ||
      "hasAccidentalInsurance" in body;

    if (!touchingP3 && !touchingP4Info) {
      return errorResponse(400, "No identifiable fields provided for update");
    }

    // ---------------------------
    // Phase 1: write subtrees ONLY
    // ---------------------------

    // (A) Page 3 subset
    if (touchingP3) {
      const nextP3 = { ...appFormDoc.page3 };

      if ("education" in body) {
        nextP3.education = body.education ?? nextP3.education;
      }

      if ("canadianHoursOfService" in body) {
        nextP3.canadianHoursOfService = recomputeCHOSTotalHours(body.canadianHoursOfService) ?? nextP3.canadianHoursOfService;
      }

      appFormDoc.set("page3", nextP3);
    }

    // (B) Page 4 Additional Info
    if (touchingP4Info) {
      const prevP4 = appFormDoc.page4;
      const nextP4 = { ...prevP4 };

      if ("deniedLicenseOrPermit" in body) nextP4.deniedLicenseOrPermit = !!body.deniedLicenseOrPermit;
      if ("suspendedOrRevoked" in body) nextP4.suspendedOrRevoked = !!body.suspendedOrRevoked;
      if ("testedPositiveOrRefused" in body) nextP4.testedPositiveOrRefused = !!body.testedPositiveOrRefused;
      if ("completedDOTRequirements" in body) nextP4.completedDOTRequirements = !!body.completedDOTRequirements;
      if ("hasAccidentalInsurance" in body) nextP4.hasAccidentalInsurance = !!body.hasAccidentalInsurance;

      // Rule: if suspendedOrRevoked === true, require suspensionNotes
      if ("suspendedOrRevoked" in body && body.suspendedOrRevoked === true) {
        const note = "suspensionNotes" in body ? body.suspensionNotes ?? "" : nextP4.suspensionNotes ?? "";
        if (!note || note.trim() === "") {
          throw new AppError(400, "Suspension notes are required when 'suspendedOrRevoked' is true");
        }
      }

      // If explicitly sent false or switched to false, clear notes (QoL)
      if (("suspendedOrRevoked" in body && body.suspendedOrRevoked === false) || ("suspensionNotes" in body && (body.suspensionNotes ?? "").trim() === "" && nextP4.suspendedOrRevoked === false)) {
        nextP4.suspensionNotes = "";
      } else if ("suspensionNotes" in body && typeof body.suspensionNotes === "string") {
        nextP4.suspensionNotes = body.suspensionNotes;
      }

      appFormDoc.set("page4", nextP4);
    }

    // Validate only affected pages
    const validatePaths: string[] = [];
    if (touchingP3) validatePaths.push("page3");
    if (touchingP4Info) validatePaths.push("page4");
    if (validatePaths.length) await appFormDoc.validate(validatePaths);

    // Save without full doc validation
    await appFormDoc.save({ validateBeforeSave: false });

    // ---------------------------
    // Tracker & resume expiry
    // ---------------------------
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.APPLICATION_PAGE_4);
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    return successResponse(200, "Application extras updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_4, true),
      // Page 3 subset
      education: appFormDoc.page3.education,
      canadianHoursOfService: appFormDoc.page3.canadianHoursOfService,
      // Page 4 additional info subset
      deniedLicenseOrPermit: appFormDoc.page4.deniedLicenseOrPermit,
      suspendedOrRevoked: appFormDoc.page4.suspendedOrRevoked,
      suspensionNotes: appFormDoc.page4.suspensionNotes,
      testedPositiveOrRefused: appFormDoc.page4.testedPositiveOrRefused,
      completedDOTRequirements: appFormDoc.page4.completedDOTRequirements,
      hasAccidentalInsurance: appFormDoc.page4.hasAccidentalInsurance,
    });
  } catch (err) {
    return errorResponse(err);
  }
};

/* -------------------------------- GET -------------------------------- */
export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");

    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = (await ApplicationForm.findById(appFormId)) as IApplicationFormDoc | null;
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // Admin consolidation gate: PAGE_4 must be completed
    if (!hasCompletedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_4)) {
      return errorResponse(401, "Driver hasn't completed this step yet");
    }

    if (!appFormDoc.page3) return errorResponse(400, "ApplicationForm Page 3 is missing");
    if (!appFormDoc.page4) return errorResponse(400, "ApplicationForm Page 4 is missing");

    return successResponse(200, "Application extras retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      // Page 3 subset
      education: appFormDoc.page3.education,
      canadianHoursOfService: appFormDoc.page3.canadianHoursOfService,
      // Page 4 additional info subset
      deniedLicenseOrPermit: appFormDoc.page4.deniedLicenseOrPermit,
      suspendedOrRevoked: appFormDoc.page4.suspendedOrRevoked,
      suspensionNotes: appFormDoc.page4.suspensionNotes,
      testedPositiveOrRefused: appFormDoc.page4.testedPositiveOrRefused,
      completedDOTRequirements: appFormDoc.page4.completedDOTRequirements,
      hasAccidentalInsurance: appFormDoc.page4.hasAccidentalInsurance,
    });
  } catch (err) {
    return errorResponse(err);
  }
};
