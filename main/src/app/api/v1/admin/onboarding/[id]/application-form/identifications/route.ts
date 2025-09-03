// app/api/v1/admin/onboarding/[id]/application-form/identifications/route.ts
import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse, AppError } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/auth/authUtils";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";

import { buildTrackerContext, advanceProgress, nextResumeExpiry, onboardingExpired, hasCompletedStep } from "@/lib/utils/onboardingUtils";

import { deleteS3Objects, finalizePhoto, finalizeVector, buildFinalDest } from "@/lib/utils/s3Upload";
import { parseJsonBody } from "@/lib/utils/reqParser";

import { COMPANIES } from "@/constants/companies";
import { S3_TEMP_FOLDER } from "@/constants/aws";

import { ES3Folder } from "@/types/aws.types";
import { EStepPath } from "@/types/onboardingTracker.types";
import { ECountryCode, IPhoto } from "@/types/shared.types";
import type { ILicenseEntry, IApplicationFormDoc, IApplicationFormPage4 } from "@/types/applicationForm.types";

/**
 * ===============================================================
 * Admin — Identifications (Licenses + Docs)
 * ---------------------------------------------------------------
 * Route: /api/v1/admin/onboarding/[id]/application-form/identifications
 *
 * Scope:
 *  - Page 1: licenses[]
 *  - Page 4 subset:
 *      employeeNumber, hstNumber, businessNumber,
 *      incorporatePhotos[], hstPhotos[], bankingInfoPhotos[],
 *      healthCardPhotos[] (CA), medicalCertificationPhotos[] (US),
 *      passportPhotos[], prPermitCitizenshipPhotos[], usVisaPhotos[],
 *      fastCard{ number, expiry, front/back }
 *
 * Gatekeeping:
 *  - Driver must have completed PAGE_4 for GET/PATCH.
 * ===============================================================
 */

/* ------------------------- Payload shape ------------------------- */
type PatchBody = {
  // Page 1
  licenses?: ILicenseEntry[];

  // Page 4 subset
  employeeNumber?: string;
  hstNumber?: string;
  businessNumber?: string;

  incorporatePhotos?: IPhoto[];
  hstPhotos?: IPhoto[];
  bankingInfoPhotos?: IPhoto[];

  healthCardPhotos?: IPhoto[];
  medicalCertificationPhotos?: IPhoto[];
  passportPhotos?: IPhoto[];
  prPermitCitizenshipPhotos?: IPhoto[];
  usVisaPhotos?: IPhoto[];

  fastCard?: IApplicationFormPage4["fastCard"];
};

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

    // Require PAGE_4 completed (parity with other combined admin routes)
    if (!hasCompletedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_4)) {
      return errorResponse(401, "Driver hasn't completed this step yet");
    }

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = (await ApplicationForm.findById(appFormId)) as IApplicationFormDoc | null;
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    if (!appFormDoc.page1) return errorResponse(400, "ApplicationForm Page 1 is missing");
    if (!appFormDoc.page4) return errorResponse(400, "ApplicationForm Page 4 is missing");

    const body = await parseJsonBody<PatchBody>(req);

    const touchingLicenses = Array.isArray(body.licenses);
    const touchingPage4 =
      "employeeNumber" in body ||
      "hstNumber" in body ||
      "businessNumber" in body ||
      "incorporatePhotos" in body ||
      "hstPhotos" in body ||
      "bankingInfoPhotos" in body ||
      "healthCardPhotos" in body ||
      "medicalCertificationPhotos" in body ||
      "passportPhotos" in body ||
      "prPermitCitizenshipPhotos" in body ||
      "usVisaPhotos" in body ||
      "fastCard" in body;

    if (!touchingLicenses && !touchingPage4) {
      return errorResponse(400, "No identifiable fields provided for update");
    }

    // Country context for Page 4 rules
    const company = COMPANIES.find((c) => c.id === onboardingDoc.companyId);
    if (!company) throw new AppError(400, "Invalid company assigned to applicant");
    const isCanadian = company.countryCode === ECountryCode.CA;
    const isUS = company.countryCode === ECountryCode.US;

    // Keep previous state for diff-based deletions
    const prevP1Licenses = appFormDoc.page1.licenses ?? [];
    const prevP4 = appFormDoc.page4;

    // ---------------------------
    // Phase 1: write subtrees ONLY
    // ---------------------------

    // (A) Page 1 — licenses (first must be AZ + both photos)
    let tempLicenses: ILicenseEntry[] | undefined;
    if (touchingLicenses) {
      if (!Array.isArray(body.licenses)) return errorResponse(400, "'licenses' must be an array");
      if (!body.licenses[0] || body.licenses[0].licenseType !== "AZ") {
        return errorResponse(400, "First license must be of type AZ");
      }
      if (!body.licenses[0].licenseFrontPhoto || !body.licenses[0].licenseBackPhoto) {
        return errorResponse(400, "First license must include both front and back photos");
      }
      tempLicenses = body.licenses.map((l) => ({ ...l }));
      appFormDoc.set("page1.licenses", tempLicenses as any);
    }

    // (B) Page 4 — subset (copy + limits + country rules)
    if (touchingPage4) {
      const PHOTO_LIMITS: Partial<Record<keyof IApplicationFormPage4, number>> = {
        hstPhotos: 2,
        incorporatePhotos: 10,
        bankingInfoPhotos: 2,
        healthCardPhotos: 2,
        medicalCertificationPhotos: 2,
        passportPhotos: 2,
        usVisaPhotos: 2,
        prPermitCitizenshipPhotos: 2,
      };

      const ensureMaxPhotos = <K extends keyof IApplicationFormPage4>(key: K, arr: IApplicationFormPage4[K], max?: number) => {
        if (typeof max !== "number") return;
        const count = Array.isArray(arr) ? arr.length : 0;
        if (count > max) throw new AppError(400, `${String(key)} cannot exceed ${max} photo${max === 1 ? "" : "s"}. You sent ${count}.`);
      };

      const nextP4: IApplicationFormPage4 = {
        ...prevP4,
        employeeNumber: body.employeeNumber ?? prevP4.employeeNumber,
        hstNumber: body.hstNumber ?? prevP4.hstNumber,
        businessNumber: body.businessNumber ?? prevP4.businessNumber,

        incorporatePhotos: body.incorporatePhotos ?? prevP4.incorporatePhotos,
        hstPhotos: body.hstPhotos ?? prevP4.hstPhotos,
        bankingInfoPhotos: body.bankingInfoPhotos ?? prevP4.bankingInfoPhotos,

        healthCardPhotos: body.healthCardPhotos ?? prevP4.healthCardPhotos,
        medicalCertificationPhotos: body.medicalCertificationPhotos ?? prevP4.medicalCertificationPhotos,
        passportPhotos: body.passportPhotos ?? prevP4.passportPhotos,
        prPermitCitizenshipPhotos: body.prPermitCitizenshipPhotos ?? prevP4.prPermitCitizenshipPhotos,
        usVisaPhotos: body.usVisaPhotos ?? prevP4.usVisaPhotos,

        fastCard: body.fastCard !== undefined ? body.fastCard : prevP4.fastCard,

        // untouched booleans/fields remain untouched
        deniedLicenseOrPermit: prevP4.deniedLicenseOrPermit,
        suspendedOrRevoked: prevP4.suspendedOrRevoked,
        suspensionNotes: prevP4.suspensionNotes,
        testedPositiveOrRefused: prevP4.testedPositiveOrRefused,
        completedDOTRequirements: prevP4.completedDOTRequirements,
        hasAccidentalInsurance: prevP4.hasAccidentalInsurance,
        criminalRecords: prevP4.criminalRecords,
      };

      // enforce photo caps
      ensureMaxPhotos("hstPhotos", nextP4.hstPhotos, PHOTO_LIMITS.hstPhotos);
      ensureMaxPhotos("incorporatePhotos", nextP4.incorporatePhotos, PHOTO_LIMITS.incorporatePhotos);
      ensureMaxPhotos("bankingInfoPhotos", nextP4.bankingInfoPhotos, PHOTO_LIMITS.bankingInfoPhotos);
      ensureMaxPhotos("healthCardPhotos", nextP4.healthCardPhotos, PHOTO_LIMITS.healthCardPhotos);
      ensureMaxPhotos("medicalCertificationPhotos", nextP4.medicalCertificationPhotos, PHOTO_LIMITS.medicalCertificationPhotos);
      ensureMaxPhotos("passportPhotos", nextP4.passportPhotos, PHOTO_LIMITS.passportPhotos);
      ensureMaxPhotos("usVisaPhotos", nextP4.usVisaPhotos, PHOTO_LIMITS.usVisaPhotos);
      ensureMaxPhotos("prPermitCitizenshipPhotos", nextP4.prPermitCitizenshipPhotos, PHOTO_LIMITS.prPermitCitizenshipPhotos);

      // country rules
      if (isCanadian) {
        const required: (keyof IApplicationFormPage4)[] = ["healthCardPhotos", "passportPhotos", "usVisaPhotos", "prPermitCitizenshipPhotos"];
        for (const field of required) {
          const now = nextP4[field];
          const hasNow = Array.isArray(now) ? now.length > 0 : false;
          if (!hasNow) throw new AppError(400, `${field} required for Canadian applicants.`);
        }
      }

      if (isUS) {
        const medCount = Array.isArray(nextP4.medicalCertificationPhotos) ? nextP4.medicalCertificationPhotos.length : 0;
        if (medCount === 0) throw new AppError(400, "Medical certificate required for US drivers");

        const passportCount = Array.isArray(nextP4.passportPhotos) ? nextP4.passportPhotos.length : 0;
        const prCount = Array.isArray(nextP4.prPermitCitizenshipPhotos) ? nextP4.prPermitCitizenshipPhotos.length : 0;
        if (passportCount === 0 && prCount === 0) {
          throw new AppError(400, "US drivers must provide passport or PR/citizenship photo");
        }
      }

      // fast card rule (CA)
      if (isCanadian && nextP4.fastCard) {
        const { fastCardNumber, fastCardExpiry, fastCardFrontPhoto, fastCardBackPhoto } = nextP4.fastCard;
        const oldFront = prevP4.fastCard?.fastCardFrontPhoto;
        const oldBack = prevP4.fastCard?.fastCardBackPhoto;

        if (!fastCardNumber?.trim() || !fastCardExpiry) {
          throw new AppError(400, "Fast card must have number and expiry if provided");
        }
        const hasFront = fastCardFrontPhoto?.s3Key || oldFront?.s3Key;
        const hasBack = fastCardBackPhoto?.s3Key || oldBack?.s3Key;
        if (!hasFront || !hasBack) {
          throw new AppError(400, "Fast card must include both front and back photo if provided");
        }
      }

      appFormDoc.set("page4", nextP4 as IApplicationFormPage4);
    }

    // validate only affected pages
    const validatePaths: string[] = [];
    if (touchingLicenses) validatePaths.push("page1");
    if (touchingPage4) validatePaths.push("page4");
    if (validatePaths.length) await appFormDoc.validate(validatePaths);

    await appFormDoc.save({ validateBeforeSave: false });

    // ---------------------------
    // Section-clear detection (Business + Fast Card)
    // ---------------------------
    const emptyStr = (v?: string | null) => !v || v.trim() === "";
    const arrLen = (a?: IPhoto[]) => (Array.isArray(a) ? a.length : 0);

    const keysToHardDelete: string[] = [];

    if (touchingPage4) {
      const curP4 = appFormDoc.page4 as IApplicationFormPage4;

      // Business section clear
      const businessNowEmpty =
        emptyStr(curP4.employeeNumber) &&
        emptyStr(curP4.businessNumber) &&
        emptyStr(curP4.hstNumber) &&
        arrLen(curP4.incorporatePhotos) === 0 &&
        arrLen(curP4.bankingInfoPhotos) === 0 &&
        arrLen(curP4.hstPhotos) === 0;

      const prevBusinessHadAny =
        !emptyStr(prevP4.employeeNumber) ||
        !emptyStr(prevP4.businessNumber) ||
        !emptyStr(prevP4.hstNumber) ||
        arrLen(prevP4.incorporatePhotos) > 0 ||
        arrLen(prevP4.bankingInfoPhotos) > 0 ||
        arrLen(prevP4.hstPhotos) > 0;

      const finalizedOnly = (ks: (string | undefined)[]) => ks.filter((k): k is string => !!k && !k.startsWith(`${S3_TEMP_FOLDER}/`));

      if (businessNowEmpty && prevBusinessHadAny) {
        const collect = (arr?: IPhoto[]) => (Array.isArray(arr) ? arr.map((p) => p.s3Key).filter(Boolean) : []);
        keysToHardDelete.push(...finalizedOnly(collect(prevP4.incorporatePhotos)), ...finalizedOnly(collect(prevP4.bankingInfoPhotos)), ...finalizedOnly(collect(prevP4.hstPhotos)));

        appFormDoc.set("page4.employeeNumber", "");
        appFormDoc.set("page4.businessNumber", "");
        appFormDoc.set("page4.hstNumber", "");
        appFormDoc.set("page4.incorporatePhotos", []);
        appFormDoc.set("page4.bankingInfoPhotos", []);
        appFormDoc.set("page4.hstPhotos", []);
        await appFormDoc.save({ validateBeforeSave: false });
      }

      // Fast card clear
      const curHasFastCard =
        !!curP4.fastCard && (!!curP4.fastCard.fastCardNumber?.trim() || !!curP4.fastCard.fastCardExpiry || !!curP4.fastCard.fastCardFrontPhoto || !!curP4.fastCard.fastCardBackPhoto);

      if (!curHasFastCard && prevP4.fastCard) {
        keysToHardDelete.push(...finalizedOnly([prevP4.fastCard.fastCardFrontPhoto?.s3Key, prevP4.fastCard.fastCardBackPhoto?.s3Key]));
        appFormDoc.set("page4.fastCard", undefined);
        await appFormDoc.save({ validateBeforeSave: false });
      }

      if (keysToHardDelete.length) {
        try {
          await deleteS3Objects(keysToHardDelete);
        } catch (e) {
          console.warn("Failed to delete section-cleared finalized S3 keys:", e);
        }
      }
    }

    // ---------------------------
    // Phase 2: finalize S3 files (no pre-check; finalizePhoto no-ops if final)
    // ---------------------------

    // (A) Page 1 licenses
    let p1FinalLicenses: ILicenseEntry[] | undefined;
    if (touchingLicenses) {
      p1FinalLicenses = JSON.parse(JSON.stringify(appFormDoc.page1.licenses)) as ILicenseEntry[];
      const dest = buildFinalDest(onboardingDoc.id, ES3Folder.LICENSES);
      for (const lic of p1FinalLicenses) {
        if (lic.licenseFrontPhoto) lic.licenseFrontPhoto = await finalizePhoto(lic.licenseFrontPhoto, dest);
        if (lic.licenseBackPhoto) lic.licenseBackPhoto = await finalizePhoto(lic.licenseBackPhoto, dest);
      }
    }

    // (B) Page 4 arrays + fast card
    let p4Final: IApplicationFormPage4 | undefined;
    if (touchingPage4) {
      p4Final = JSON.parse(JSON.stringify(appFormDoc.page4)) as IApplicationFormPage4;

      p4Final.hstPhotos = (await finalizeVector(p4Final.hstPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.HST_PHOTOS))) as IPhoto[];

      p4Final.incorporatePhotos = (await finalizeVector(p4Final.incorporatePhotos, buildFinalDest(onboardingDoc.id, ES3Folder.INCORPORATION_PHOTOS))) as IPhoto[];

      p4Final.bankingInfoPhotos = (await finalizeVector(p4Final.bankingInfoPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.BANKING_INFO_PHOTOS))) as IPhoto[];

      p4Final.healthCardPhotos = (await finalizeVector(p4Final.healthCardPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.HEALTH_CARD_PHOTOS))) as IPhoto[];

      p4Final.medicalCertificationPhotos = (await finalizeVector(p4Final.medicalCertificationPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.MEDICAL_CERT_PHOTOS))) as IPhoto[];

      p4Final.passportPhotos = (await finalizeVector(p4Final.passportPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.PASSPORT_PHOTOS))) as IPhoto[];

      p4Final.usVisaPhotos = (await finalizeVector(p4Final.usVisaPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.US_VISA_PHOTOS))) as IPhoto[];

      p4Final.prPermitCitizenshipPhotos = (await finalizeVector(p4Final.prPermitCitizenshipPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.PR_CITIZENSHIP_PHOTOS))) as IPhoto[];

      if (p4Final.fastCard?.fastCardFrontPhoto) {
        p4Final.fastCard.fastCardFrontPhoto = await finalizePhoto(p4Final.fastCard.fastCardFrontPhoto, buildFinalDest(onboardingDoc.id, ES3Folder.FAST_CARD_PHOTOS));
      }
      if (p4Final.fastCard?.fastCardBackPhoto) {
        p4Final.fastCard.fastCardBackPhoto = await finalizePhoto(p4Final.fastCard.fastCardBackPhoto, buildFinalDest(onboardingDoc.id, ES3Folder.FAST_CARD_PHOTOS));
      }
    }

    // ---------------------------
    // Deletions: remove finalized keys that were dropped by the update
    // ---------------------------
    function collectLicenseKeys(licenses?: ILicenseEntry[]): string[] {
      if (!Array.isArray(licenses)) return [];
      const keys: string[] = [];
      for (const lic of licenses) {
        if (lic.licenseFrontPhoto?.s3Key) keys.push(lic.licenseFrontPhoto.s3Key);
        if (lic.licenseBackPhoto?.s3Key) keys.push(lic.licenseBackPhoto.s3Key);
      }
      return keys;
    }

    function collectP4Keys(p?: IApplicationFormPage4): string[] {
      if (!p) return [];
      const keys: string[] = [];
      const pushArr = (arr?: IPhoto[]) => {
        if (Array.isArray(arr)) for (const ph of arr) if (ph?.s3Key) keys.push(ph.s3Key);
      };
      pushArr(p.hstPhotos);
      pushArr(p.incorporatePhotos);
      pushArr(p.bankingInfoPhotos);
      pushArr(p.healthCardPhotos);
      pushArr(p.medicalCertificationPhotos);
      pushArr(p.passportPhotos);
      pushArr(p.usVisaPhotos);
      pushArr(p.prPermitCitizenshipPhotos);
      if (p.fastCard?.fastCardFrontPhoto?.s3Key) keys.push(p.fastCard.fastCardFrontPhoto.s3Key);
      if (p.fastCard?.fastCardBackPhoto?.s3Key) keys.push(p.fastCard.fastCardBackPhoto.s3Key);
      return keys;
    }

    const alreadyDeleted = new Set(keysToHardDelete);

    if (touchingLicenses && p1FinalLicenses) {
      const prevKeys = new Set(collectLicenseKeys(prevP1Licenses));
      const newKeys = new Set(collectLicenseKeys(p1FinalLicenses));
      const removedFinalKeys = [...prevKeys].filter((k) => !newKeys.has(k) && !k.startsWith(`${S3_TEMP_FOLDER}/`) && !alreadyDeleted.has(k));
      if (removedFinalKeys.length) {
        try {
          await deleteS3Objects(removedFinalKeys);
        } catch (e) {
          console.warn("Failed to delete removed finalized license S3 keys:", e);
        }
      }
    }

    if (touchingPage4 && p4Final) {
      const prevKeys = new Set(collectP4Keys(prevP4));
      const newKeys = new Set(collectP4Keys(p4Final));
      const removedFinalKeys = [...prevKeys].filter((k) => !newKeys.has(k) && !k.startsWith(`${S3_TEMP_FOLDER}/`) && !alreadyDeleted.has(k));
      if (removedFinalKeys.length) {
        try {
          await deleteS3Objects(removedFinalKeys);
        } catch (e) {
          console.warn("Failed to delete removed finalized Page4 S3 keys:", e);
        }
      }
    }

    // ---------------------------
    // Phase 3: persist finalized subtrees (only what we touched)
    // ---------------------------
    if (touchingLicenses && p1FinalLicenses) {
      if (!p1FinalLicenses[0].licenseFrontPhoto || !p1FinalLicenses[0].licenseBackPhoto) {
        return errorResponse(400, "First license must include both front and back photos");
      }
      appFormDoc.set("page1.licenses", p1FinalLicenses as any);
      await appFormDoc.validate(["page1"]);
      await appFormDoc.save({ validateBeforeSave: false });
    }

    if (touchingPage4 && p4Final) {
      appFormDoc.set("page4", p4Final);
      await appFormDoc.validate(["page4"]);
      await appFormDoc.save({ validateBeforeSave: false });
    }

    // ---------------------------
    // Tracker & resume expiry
    // ---------------------------
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.APPLICATION_PAGE_4);
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    return successResponse(200, "Identifications updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_4, true),
      licenses: appFormDoc.page1.licenses,
      employeeNumber: appFormDoc.page4.employeeNumber,
      hstNumber: appFormDoc.page4.hstNumber,
      businessNumber: appFormDoc.page4.businessNumber,
      incorporatePhotos: appFormDoc.page4.incorporatePhotos,
      hstPhotos: appFormDoc.page4.hstPhotos,
      bankingInfoPhotos: appFormDoc.page4.bankingInfoPhotos,
      healthCardPhotos: appFormDoc.page4.healthCardPhotos,
      medicalCertificationPhotos: appFormDoc.page4.medicalCertificationPhotos,
      passportPhotos: appFormDoc.page4.passportPhotos,
      prPermitCitizenshipPhotos: appFormDoc.page4.prPermitCitizenshipPhotos,
      usVisaPhotos: appFormDoc.page4.usVisaPhotos,
      fastCard: appFormDoc.page4.fastCard,
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

    if (!hasCompletedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_4)) {
      return errorResponse(401, "Driver hasn't completed this step yet");
    }

    if (!appFormDoc.page1) return errorResponse(400, "ApplicationForm Page 1 is missing");
    if (!appFormDoc.page4) return errorResponse(400, "ApplicationForm Page 4 is missing");

    return successResponse(200, "Identifications retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      licenses: appFormDoc.page1.licenses,
      employeeNumber: appFormDoc.page4.employeeNumber,
      hstNumber: appFormDoc.page4.hstNumber,
      businessNumber: appFormDoc.page4.businessNumber,
      incorporatePhotos: appFormDoc.page4.incorporatePhotos,
      hstPhotos: appFormDoc.page4.hstPhotos,
      bankingInfoPhotos: appFormDoc.page4.bankingInfoPhotos,
      healthCardPhotos: appFormDoc.page4.healthCardPhotos,
      medicalCertificationPhotos: appFormDoc.page4.medicalCertificationPhotos,
      passportPhotos: appFormDoc.page4.passportPhotos,
      prPermitCitizenshipPhotos: appFormDoc.page4.prPermitCitizenshipPhotos,
      usVisaPhotos: appFormDoc.page4.usVisaPhotos,
      fastCard: appFormDoc.page4.fastCard,
    });
  } catch (err) {
    return errorResponse(err);
  }
};
