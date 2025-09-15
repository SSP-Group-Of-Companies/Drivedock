import { NextRequest } from "next/server";
import { AppError, errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import { IApplicationFormPage4 } from "@/types/applicationForm.types";
import { advanceProgress, buildTrackerContext, hasReachedStep, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { deleteS3Objects, finalizeAsset, finalizeAssetVector, buildFinalDest } from "@/lib/utils/s3Upload";
import { COMPANIES } from "@/constants/companies";
import { EStepPath } from "@/types/onboardingTracker.types";
import { ECountryCode, IFileAsset } from "@/types/shared.types";
import { isValidObjectId } from "mongoose";
import { S3_TEMP_FOLDER } from "@/constants/aws";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { ES3Folder } from "@/types/aws.types";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { requireOnboardingSession } from "@/lib/utils/auth/onboardingSession";
import { attachCookies } from "@/lib/utils/auth/attachCookie";

/** ======== helpers ======== */
const hasKey = <T extends object>(o: T, k: keyof any) => Object.prototype.hasOwnProperty.call(o, k);

const isNonEmptyString = (v?: string | null) => !!v && v.trim().length > 0;

const dedupeByS3Key = (arr?: IFileAsset[]) => {
  if (!Array.isArray(arr)) return [] as IFileAsset[];
  const seen = new Set<string>();
  const out: IFileAsset[] = [];
  for (const p of arr) {
    const k = p?.s3Key?.trim();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out;
};
const len = (arr?: IFileAsset[]) => (Array.isArray(arr) ? dedupeByS3Key(arr).length : 0);

/** validate array count ONLY if key exists in body (strict “body defines truth”) */
function expectCountExact(body: any, key: keyof IApplicationFormPage4, exact: number, label: string) {
  if (!hasKey(body, key)) throw new AppError(400, `${label} is required.`);
  const n = len(body[key as keyof IApplicationFormPage4] as IFileAsset[]);
  if (n !== exact) throw new AppError(400, `${label} must have exactly ${exact} photo${exact === 1 ? "" : "s"}. You sent ${n}.`);
}
function expectCountRange(body: any, key: keyof IApplicationFormPage4, min: number, max: number, label: string) {
  if (!hasKey(body, key)) throw new AppError(400, `${label} is required.`);
  const n = len(body[key as keyof IApplicationFormPage4] as IFileAsset[]);
  if (n < min || n > max) throw new AppError(400, `${label} must have between ${min} and ${max} photos. You sent ${n}.`);
}

/** forbid sending non-empty photos for certain fields; empty array is tolerated (but better to omit) */
function forbidNonEmpty(body: any, key: keyof IApplicationFormPage4, label: string) {
  if (!hasKey(body, key)) return;
  const n = len(body[key as keyof IApplicationFormPage4] as IFileAsset[]);
  if (n > 0) throw new AppError(400, `${label} is not accepted for this applicant.`);
}

/** business section presence detectors (in body) */
function businessKeysPresentInBody(b: Partial<IApplicationFormPage4>) {
  const keys: (keyof IApplicationFormPage4)[] = ["businessName", "hstNumber", "incorporatePhotos", "bankingInfoPhotos", "hstPhotos"];
  return keys.some((k) => hasKey(b, k));
}

function isBusinessClearIntent(b: Partial<IApplicationFormPage4>) {
  const emptyStrings = (!hasKey(b, "businessName") || !isNonEmptyString(b.businessName)) && (!hasKey(b, "hstNumber") || !isNonEmptyString(b.hstNumber));

  const emptyPhotos =
    (!hasKey(b, "incorporatePhotos") || len(b.incorporatePhotos) === 0) && (!hasKey(b, "bankingInfoPhotos") || len(b.bankingInfoPhotos) === 0) && (!hasKey(b, "hstPhotos") || len(b.hstPhotos) === 0);

  // Clear intent only if ALL keys are present AND all are empty
  const allKeysPresent = hasKey(b, "businessName") && hasKey(b, "hstNumber") && hasKey(b, "incorporatePhotos") && hasKey(b, "bankingInfoPhotos") && hasKey(b, "hstPhotos");

  return allKeysPresent && emptyStrings && emptyPhotos;
}

function validateBusinessAllOrNothing(b: Partial<IApplicationFormPage4>) {
  if (!businessKeysPresentInBody(b)) return { mode: "skip" as const };

  if (isBusinessClearIntent(b)) return { mode: "clear" as const };

  // Otherwise, require all keys present and valid
  const missing: string[] = [];
  const requireKey = (k: keyof IApplicationFormPage4, label: string) => {
    if (!hasKey(b, k)) missing.push(label);
  };
  requireKey("businessName", "businessName");
  requireKey("hstNumber", "hstNumber");
  requireKey("incorporatePhotos", "incorporatePhotos");
  requireKey("bankingInfoPhotos", "bankingInfoPhotos");
  requireKey("hstPhotos", "hstPhotos");

  if (missing.length) {
    throw new AppError(400, `Business section is partial. Missing: ${missing.join(", ")}. Provide all fields or explicitly clear all.`);
  }

  // strings non-empty
  if (!isNonEmptyString(b.businessName)) throw new AppError(400, "businessName is required in Business section.");
  if (!isNonEmptyString(b.hstNumber)) throw new AppError(400, "hstNumber is required in Business section.");

  // photos within limits
  const inc = len(b.incorporatePhotos);
  const bank = len(b.bankingInfoPhotos);
  const hst = len(b.hstPhotos);

  if (inc < 1 || inc > 10) throw new AppError(400, `incorporatePhotos must have 1–10 photos. You sent ${inc}.`);
  if (bank < 1 || bank > 2) throw new AppError(400, `bankingInfoPhotos must have 1–2 photos. You sent ${bank}.`);
  if (hst < 1 || hst > 2) throw new AppError(400, `hstPhotos must have 1–2 photos. You sent ${hst}.`);

  return { mode: "validate" as const };
}

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "Invalid onboarding ID");

    const { tracker: onboardingDoc, refreshCookie } = await requireOnboardingSession(id);

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    if (!hasReachedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_4)) {
      return errorResponse(400, "Please complete previous steps first");
    }

    const body = await parseJsonBody<IApplicationFormPage4>(req);

    // Determine country
    const company = COMPANIES.find((c) => c.id === onboardingDoc.companyId);
    if (!company) throw new AppError(400, "Invalid company assigned to applicant");
    const isCanadian = company.countryCode === ECountryCode.CA;
    const isUS = company.countryCode === ECountryCode.US;

    // =========================
    // 1) Required-for-all logic
    // =========================
    // For US drivers: either passport OR PR/citizenship is required (not both)
    // For Canadian drivers: both are required
    if (isUS) {
      const hasPassport = body.passportPhotos && body.passportPhotos.length === 2;
      const hasPRCitizenship = body.prPermitCitizenshipPhotos && body.prPermitCitizenshipPhotos.length >= 1 && body.prPermitCitizenshipPhotos.length <= 2;

      if (!hasPassport && !hasPRCitizenship) {
        throw new AppError(400, "US drivers must provide either passport photos (2 photos) or PR/Permit/Citizenship photos (1-2 photos)");
      }

      // If passport is provided, validate it has exactly 2 photos
      if (hasPassport) {
        expectCountExact(body, "passportPhotos", 2, "Passport photos");
      }

      // If PR/citizenship is provided, validate it has 1-2 photos
      if (hasPRCitizenship) {
        expectCountRange(body, "prPermitCitizenshipPhotos", 1, 2, "PR/Permit/Citizenship photos");
      }
    } else {
      // Canadian drivers: both are required
      expectCountExact(body, "passportPhotos", 2, "Passport photos");
      expectCountRange(body, "prPermitCitizenshipPhotos", 1, 2, "PR/Permit/Citizenship photos");
    }

    // =========================
    // 2) Country-specific logic
    // =========================
    if (isCanadian) {
      expectCountExact(body, "healthCardPhotos", 2, "Health card photos");
      expectCountRange(body, "usVisaPhotos", 1, 2, "US visa photos");

      // Forbidden for CA
      forbidNonEmpty(body, "medicalCertificationPhotos", "Medical certification photos");
    } else if (isUS) {
      expectCountRange(body, "medicalCertificationPhotos", 1, 2, "Medical certification photos");

      // Forbidden for US
      forbidNonEmpty(body, "healthCardPhotos", "Health card photos");
      forbidNonEmpty(body, "usVisaPhotos", "US visa photos");
    } else {
      // In case new regions ever appear, be explicit
      throw new AppError(400, "Unsupported applicant country for Page 4 rules.");
    }

    // =========================
    // 3) Business section (all-or-nothing on BODY)
    // =========================
    const prev = appFormDoc.page4; // keep previous to handle deletion on explicit clear
    const bizDecision = validateBusinessAllOrNothing(body);

    // =========================
    // 4) FAST Card section
    // =========================
    // Fast card remains optional. If key present in body but all fields are empty/undefined → treat as clearing.
    const bodyHasFastCard =
      hasKey(body, "fastCard") &&
      body.fastCard &&
      (isNonEmptyString(body.fastCard.fastCardNumber) || !!body.fastCard.fastCardExpiry || !!body.fastCard.fastCardFrontPhoto || !!body.fastCard.fastCardBackPhoto);

    // =========================
    // Phase 1: write page4 only (raw body, no S3 finalize yet)
    // =========================
    appFormDoc.set("page4", body as IApplicationFormPage4);
    await appFormDoc.validate(["page4"]);
    await appFormDoc.save({ validateBeforeSave: false });

    // =========================
    // Section clear detection & hard delete (Business + Fast Card)
    // =========================
    const keysToHardDelete: string[] = [];
    const finalizedOnly = (ks: (string | undefined)[]) => ks.filter((k): k is string => !!k && !k.startsWith(`${S3_TEMP_FOLDER}/`));
    const collect = (arr?: IFileAsset[]) => (Array.isArray(arr) ? arr.map((p) => p.s3Key).filter(Boolean) : []);

    if (bizDecision.mode === "clear") {
      if (prev) {
        keysToHardDelete.push(...finalizedOnly(collect(prev.incorporatePhotos)), ...finalizedOnly(collect(prev.bankingInfoPhotos)), ...finalizedOnly(collect(prev.hstPhotos)));
      }
      // overwrite to empty in DB (already set above by body), ensure saved
      appFormDoc.set("page4.businessName", "");
      appFormDoc.set("page4.hstNumber", "");
      appFormDoc.set("page4.incorporatePhotos", []);
      appFormDoc.set("page4.bankingInfoPhotos", []);
      appFormDoc.set("page4.hstPhotos", []);
      await appFormDoc.save({ validateBeforeSave: false });
    }

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

    // =========================
    // Phase 2: finalize S3 files
    // =========================
    const page4Final: IApplicationFormPage4 = JSON.parse(JSON.stringify(appFormDoc.page4)) as IApplicationFormPage4;

    page4Final.hstPhotos = (await finalizeAssetVector(page4Final.hstPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.HST_PHOTOS))) as IFileAsset[];
    page4Final.incorporatePhotos = (await finalizeAssetVector(page4Final.incorporatePhotos, buildFinalDest(onboardingDoc.id, ES3Folder.INCORPORATION_PHOTOS))) as IFileAsset[];
    page4Final.bankingInfoPhotos = (await finalizeAssetVector(page4Final.bankingInfoPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.BANKING_INFO_PHOTOS))) as IFileAsset[];
    page4Final.healthCardPhotos = (await finalizeAssetVector(page4Final.healthCardPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.HEALTH_CARD_PHOTOS))) as IFileAsset[];
    page4Final.medicalCertificationPhotos = (await finalizeAssetVector(page4Final.medicalCertificationPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.MEDICAL_CERT_PHOTOS))) as IFileAsset[];
    page4Final.passportPhotos = (await finalizeAssetVector(page4Final.passportPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.PASSPORT_PHOTOS))) as IFileAsset[];
    page4Final.usVisaPhotos = (await finalizeAssetVector(page4Final.usVisaPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.US_VISA_PHOTOS))) as IFileAsset[];
    page4Final.prPermitCitizenshipPhotos = (await finalizeAssetVector(page4Final.prPermitCitizenshipPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.PR_CITIZENSHIP_PHOTOS))) as IFileAsset[];

    if (page4Final.fastCard?.fastCardFrontPhoto) {
      page4Final.fastCard.fastCardFrontPhoto = await finalizeAsset(page4Final.fastCard.fastCardFrontPhoto, buildFinalDest(onboardingDoc.id, ES3Folder.FAST_CARD_PHOTOS));
    }
    if (page4Final.fastCard?.fastCardBackPhoto) {
      page4Final.fastCard.fastCardBackPhoto = await finalizeAsset(page4Final.fastCard.fastCardBackPhoto, buildFinalDest(onboardingDoc.id, ES3Folder.FAST_CARD_PHOTOS));
    }

    // =========================
    // Deletions: remove finalized keys that were dropped by the user
    // =========================
    function collectAllKeys(p?: IApplicationFormPage4): string[] {
      if (!p) return [];
      const keys: string[] = [];
      const pushArr = (arr?: IFileAsset[]) => {
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

    const prevKeys = new Set(collectAllKeys(prev));
    const newKeys = new Set(collectAllKeys(page4Final));
    const alreadyDeleted = new Set(keysToHardDelete);
    const removedFinalKeys = [...prevKeys].filter((k) => !newKeys.has(k) && !k.startsWith(`${S3_TEMP_FOLDER}/`) && !alreadyDeleted.has(k));

    if (removedFinalKeys.length) {
      try {
        await deleteS3Objects(removedFinalKeys);
      } catch (e) {
        console.warn("Failed to delete removed finalized S3 keys:", e);
      }
    }

    // =========================
    // Phase 3: persist finalized page4 only
    // =========================
    appFormDoc.set("page4", page4Final);
    await appFormDoc.validate(["page4"]);
    await appFormDoc.save({ validateBeforeSave: false });

    // Tracker & resume expiry
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.APPLICATION_PAGE_4);
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    const res = successResponse(200, "ApplicationForm Page 4 updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_4),
      page4: page4Final,
    });

    return attachCookies(res, refreshCookie);
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

    const { tracker: onboardingDoc, refreshCookie } = await requireOnboardingSession(onboardingId);

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) {
      return errorResponse(404, "ApplicationForm not linked");
    }

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) {
      return errorResponse(404, "ApplicationForm not found");
    }

    if (!hasReachedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_4)) {
      return errorResponse(403, "Please complete previous steps first");
    }

    const res = successResponse(200, "Page 4 data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_4),
      page4: appFormDoc.page4,
    });

    return attachCookies(res, refreshCookie);
  } catch (error) {
    return errorResponse(error);
  }
};
