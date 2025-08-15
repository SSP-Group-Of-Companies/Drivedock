import { NextRequest } from "next/server";
import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { AppError, errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { IApplicationFormPage4 } from "@/types/applicationForm.types";
import { advanceStatus, buildTrackerContext, hasCompletedStep, onboardingExpired } from "@/lib/utils/onboardingUtils";
import { deleteS3Objects, finalizePhoto } from "@/lib/utils/s3Upload";
import { COMPANIES } from "@/constants/companies";
import { EStepPath } from "@/types/onboardingTracker.type";
import { ECountryCode, IPhoto } from "@/types/shared.types";
import { isValidObjectId } from "mongoose";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { ES3Folder } from "@/types/aws.types";
import ApplicationForm from "@/mongoose/models/ApplicationForm";

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "Invalid onboarding ID");

    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    if (!hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_3)) {
      return errorResponse(400, "Please complete previous step first");
    }

    const body = await parseJsonBody<IApplicationFormPage4>(req);

    // --- Photo limits (enforced at route level)
    const PHOTO_LIMITS: Record<keyof IApplicationFormPage4, number | undefined> = {
      hstPhotos: 2,
      incorporatePhotos: 10,
      bankingInfoPhotos: 2,
      healthCardPhotos: 2,
      medicalCertificationPhotos: 2,
      passportPhotos: 2,
      usVisaPhotos: 2,
      prPermitCitizenshipPhotos: 2,

      // non-array fields (no limits)
      criminalRecords: undefined,
      employeeNumber: undefined,
      hstNumber: undefined,
      businessNumber: undefined,
      fastCard: undefined,
      deniedLicenseOrPermit: undefined,
      suspendedOrRevoked: undefined,
      suspensionNotes: undefined,
      testedPositiveOrRefused: undefined,
      completedDOTRequirements: undefined,
      hasAccidentalInsurance: undefined,
    };

    function ensureMaxPhotos<K extends keyof IApplicationFormPage4>(key: K, arr: IApplicationFormPage4[K], max?: number) {
      if (typeof max !== "number") return;
      const count = Array.isArray(arr) ? arr.length : 0;
      if (count > max) {
        throw new AppError(400, `${String(key)} cannot exceed ${max} photo${max === 1 ? "" : "s"}. You sent ${count}.`);
      }
    }

    ensureMaxPhotos("hstPhotos", body.hstPhotos, PHOTO_LIMITS.hstPhotos);
    ensureMaxPhotos("incorporatePhotos", body.incorporatePhotos, PHOTO_LIMITS.incorporatePhotos);
    ensureMaxPhotos("bankingInfoPhotos", body.bankingInfoPhotos, PHOTO_LIMITS.bankingInfoPhotos);
    ensureMaxPhotos("healthCardPhotos", body.healthCardPhotos, PHOTO_LIMITS.healthCardPhotos);
    ensureMaxPhotos("medicalCertificationPhotos", body.medicalCertificationPhotos, PHOTO_LIMITS.medicalCertificationPhotos);
    ensureMaxPhotos("passportPhotos", body.passportPhotos, PHOTO_LIMITS.passportPhotos);
    ensureMaxPhotos("usVisaPhotos", body.usVisaPhotos, PHOTO_LIMITS.usVisaPhotos);
    ensureMaxPhotos("prPermitCitizenshipPhotos", body.prPermitCitizenshipPhotos, PHOTO_LIMITS.prPermitCitizenshipPhotos);

    // --- Country context
    const company = COMPANIES.find((c) => c.id === onboardingDoc.companyId);
    if (!company) throw new AppError(400, "Invalid company assigned to applicant");
    const isCanadian = company.countryCode === ECountryCode.CA;
    const isUS = company.countryCode === ECountryCode.US;

    // --- Server-side business rules (page-4 only)
    const employeeProvided = !!body.employeeNumber?.trim();
    const businessProvided = !!body.businessNumber?.trim();
    const hstProvided = !!body.hstNumber?.trim();
    const incorporateProvided = (body.incorporatePhotos ?? []).length > 0;
    const bankingProvided = (body.bankingInfoPhotos ?? []).length > 0;
    const hstPhotosProvided = (body.hstPhotos ?? []).length > 0;

    const anyBusinessProvided = employeeProvided || businessProvided || hstProvided || incorporateProvided || bankingProvided || hstPhotosProvided;

    const prev = appFormDoc.page4; // previous saved state

    const allBusinessProvided =
      employeeProvided &&
      businessProvided &&
      hstProvided &&
      (incorporateProvided || (prev?.incorporatePhotos?.length ?? 0) > 0) &&
      (bankingProvided || (prev?.bankingInfoPhotos?.length ?? 0) > 0) &&
      (hstPhotosProvided || (prev?.hstPhotos?.length ?? 0) > 0);

    if (anyBusinessProvided && !allBusinessProvided) {
      throw new AppError(400, "All business section fields and files must be provided if any are.");
    }

    if (isCanadian) {
      const requiredFields: (keyof IApplicationFormPage4)[] = ["healthCardPhotos", "passportPhotos", "usVisaPhotos", "prPermitCitizenshipPhotos"];
      for (const field of requiredFields) {
        const nowVal = body[field];
        const oldVal = prev?.[field];
        const hasNow = Array.isArray(nowVal) && nowVal.length > 0;
        const hasOld = Array.isArray(oldVal) && oldVal.length > 0;
        if (!hasNow && !hasOld) {
          throw new AppError(400, `${field} required for Canadian applicants.`);
        }
      }
    }

    if (isUS) {
      const medNow = body.medicalCertificationPhotos?.length ?? 0;
      const medOld = prev?.medicalCertificationPhotos?.length ?? 0;
      if (medNow === 0 && medOld === 0) {
        throw new AppError(400, "Medical certificate required for US drivers");
      }

      const passport = (body.passportPhotos?.length ?? 0) + (prev?.passportPhotos?.length ?? 0);
      const pr = (body.prPermitCitizenshipPhotos?.length ?? 0) + (prev?.prPermitCitizenshipPhotos?.length ?? 0);

      if (passport === 0 && pr === 0) {
        throw new AppError(400, "US drivers must provide passport or PR/citizenship photo");
      }
    }

    if (isCanadian && body.fastCard) {
      const { fastCardNumber, fastCardExpiry, fastCardFrontPhoto, fastCardBackPhoto } = body.fastCard;

      const oldFront = prev?.fastCard?.fastCardFrontPhoto;
      const oldBack = prev?.fastCard?.fastCardBackPhoto;

      if (!fastCardNumber?.trim() || !fastCardExpiry) {
        throw new AppError(400, "Fast card must have number and expiry if provided");
      }
      const hasFront = fastCardFrontPhoto?.s3Key || oldFront?.s3Key;
      const hasBack = fastCardBackPhoto?.s3Key || oldBack?.s3Key;
      if (!hasFront || !hasBack) {
        throw new AppError(400, "Fast card must include both front and back photo if provided");
      }
    }

    // ---------------------------
    // Phase 1: write page4 only
    // ---------------------------
    appFormDoc.set("page4", body as IApplicationFormPage4);
    await appFormDoc.validate(["page4"]);
    await appFormDoc.save({ validateBeforeSave: false });

    // ---------------------------
    // Section-clear detection (Business + Fast Card)
    // Place AFTER Phase 1 and BEFORE Phase 2
    // ---------------------------
    const emptyStr = (v?: string | null) => !v || v.trim() === "";
    const arrLen = (a?: IPhoto[]) => (Array.isArray(a) ? a.length : 0);

    const businessNowEmpty =
      emptyStr(body.employeeNumber) &&
      emptyStr(body.businessNumber) &&
      emptyStr(body.hstNumber) &&
      arrLen(body.incorporatePhotos) === 0 &&
      arrLen(body.bankingInfoPhotos) === 0 &&
      arrLen(body.hstPhotos) === 0;

    const prevBusinessHadAny =
      !emptyStr(prev?.employeeNumber) ||
      !emptyStr(prev?.businessNumber) ||
      !emptyStr(prev?.hstNumber) ||
      arrLen(prev?.incorporatePhotos) > 0 ||
      arrLen(prev?.bankingInfoPhotos) > 0 ||
      arrLen(prev?.hstPhotos) > 0;

    const keysToHardDelete: string[] = [];
    const finalizedOnly = (ks: (string | undefined)[]) => ks.filter((k): k is string => !!k && !k.startsWith(`${S3_TEMP_FOLDER}/`));

    if (businessNowEmpty && prevBusinessHadAny) {
      const collect = (arr?: IPhoto[]) => (Array.isArray(arr) ? arr.map((p) => p.s3Key).filter(Boolean) : []);

      keysToHardDelete.push(...finalizedOnly(collect(prev?.incorporatePhotos)), ...finalizedOnly(collect(prev?.bankingInfoPhotos)), ...finalizedOnly(collect(prev?.hstPhotos)));

      appFormDoc.set("page4.employeeNumber", "");
      appFormDoc.set("page4.businessNumber", "");
      appFormDoc.set("page4.hstNumber", "");
      appFormDoc.set("page4.incorporatePhotos", []);
      appFormDoc.set("page4.bankingInfoPhotos", []);
      appFormDoc.set("page4.hstPhotos", []);
      await appFormDoc.save({ validateBeforeSave: false });
    }

    const bodyHasFastCard = !!body.fastCard && (!emptyStr(body.fastCard.fastCardNumber) || !!body.fastCard.fastCardExpiry || !!body.fastCard.fastCardFrontPhoto || !!body.fastCard.fastCardBackPhoto);

    if (!bodyHasFastCard && prev?.fastCard) {
      keysToHardDelete.push(...finalizedOnly([prev.fastCard.fastCardFrontPhoto?.s3Key, prev.fastCard.fastCardBackPhoto?.s3Key]));
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

    // ---------------------------
    // Phase 2: finalize S3 files
    // ---------------------------
    const tempPrefix = `${S3_TEMP_FOLDER}/`;
    const page4Final: IApplicationFormPage4 = JSON.parse(JSON.stringify(appFormDoc.page4)) as IApplicationFormPage4;

    // helper to finalize a vector of photos
    async function finalizeVector(vec: IPhoto[] | undefined, dest: string) {
      if (!Array.isArray(vec)) return vec as any;
      const out: IPhoto[] = [];
      for (const p of vec) {
        if (p?.s3Key?.startsWith(tempPrefix)) {
          // finalizePhoto moves + deletes temp internally
          out.push(await finalizePhoto(p, dest));
        } else {
          out.push(p);
        }
      }
      return out;
    }

    // finalize arrays
    page4Final.hstPhotos = (await finalizeVector(page4Final.hstPhotos, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.HST_PHOTOS}/${onboardingDoc.id}`)) as IPhoto[];
    page4Final.incorporatePhotos = (await finalizeVector(page4Final.incorporatePhotos, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.INCORPORATION_PHOTOS}/${onboardingDoc.id}`)) as IPhoto[];
    page4Final.bankingInfoPhotos = (await finalizeVector(page4Final.bankingInfoPhotos, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.BANKING_INFO_PHOTOS}/${onboardingDoc.id}`)) as IPhoto[];
    page4Final.healthCardPhotos = (await finalizeVector(page4Final.healthCardPhotos, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.HEALTH_CARD_PHOTOS}/${onboardingDoc.id}`)) as IPhoto[];
    page4Final.medicalCertificationPhotos = (await finalizeVector(page4Final.medicalCertificationPhotos, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.MEDICAL_CERT_PHOTOS}/${onboardingDoc.id}`)) as IPhoto[];
    page4Final.passportPhotos = (await finalizeVector(page4Final.passportPhotos, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.PASSPORT_PHOTOS}/${onboardingDoc.id}`)) as IPhoto[];
    page4Final.usVisaPhotos = (await finalizeVector(page4Final.usVisaPhotos, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.US_VISA_PHOTOS}/${onboardingDoc.id}`)) as IPhoto[];
    page4Final.prPermitCitizenshipPhotos = (await finalizeVector(page4Final.prPermitCitizenshipPhotos, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.PR_CITIZENSHIP_PHOTOS}/${onboardingDoc.id}`)) as IPhoto[];

    // finalize fast card singles
    if (page4Final.fastCard?.fastCardFrontPhoto?.s3Key?.startsWith(tempPrefix)) {
      page4Final.fastCard.fastCardFrontPhoto = await finalizePhoto(page4Final.fastCard.fastCardFrontPhoto, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.FAST_CARD_PHOTOS}/${onboardingDoc.id}`);
    }
    if (page4Final.fastCard?.fastCardBackPhoto?.s3Key?.startsWith(tempPrefix)) {
      page4Final.fastCard.fastCardBackPhoto = await finalizePhoto(page4Final.fastCard.fastCardBackPhoto, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.FAST_CARD_PHOTOS}/${onboardingDoc.id}`);
    }

    // ---------------------------
    // Deletions: remove finalized keys that were dropped by user
    // ---------------------------
    function collectAllKeys(p?: IApplicationFormPage4): string[] {
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

    // Keys before this PATCH (saved state), and keys that will exist after finalize
    const prevKeys = new Set(collectAllKeys(prev));
    const newKeys = new Set(collectAllKeys(page4Final));

    // Avoid double-delete: exclude keys already deleted in section-clear
    const alreadyDeleted = new Set(keysToHardDelete);

    // Delete finalized objects that were removed by the user (present before, absent now)
    const removedFinalKeys = [...prevKeys].filter((k) => !newKeys.has(k) && !k.startsWith(`${S3_TEMP_FOLDER}/`) && !alreadyDeleted.has(k));

    if (removedFinalKeys.length) {
      try {
        await deleteS3Objects(removedFinalKeys);
      } catch (e) {
        console.warn("Failed to delete removed finalized S3 keys:", e);
      }
    }

    // ---------------------------
    // Phase 3: persist finalized page4 only
    // ---------------------------
    appFormDoc.set("page4", page4Final);
    await appFormDoc.validate(["page4"]);
    await appFormDoc.save({ validateBeforeSave: false });

    // Tracker & resume expiry
    onboardingDoc.status = advanceStatus(onboardingDoc.status, EStepPath.APPLICATION_PAGE_4);
    onboardingDoc.resumeExpiresAt = new Date(Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC));
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 4 updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_4),
      page4: page4Final,
    });
  } catch (err) {
    return errorResponse(err);
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

    if (!hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_3)) {
      return errorResponse(403, "Please complete previous step first");
    }

    // update tracker current step
    onboardingDoc.status.currentStep = EStepPath.APPLICATION_PAGE_4;
    await onboardingDoc.save();

    return successResponse(200, "Page 4 data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc),
      page4: appFormDoc.page4,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
