// api/v1/onboarding/[id]/application-form/page-4/route.ts
import { NextRequest } from "next/server";
import { AppError, errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import { IApplicationFormPage4 } from "@/types/applicationForm.types";
import { advanceProgress, buildTrackerContext, hasReachedStep, isInvitationApproved, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { deleteS3Objects, finalizeAsset, finalizeAssetVector, buildFinalDest } from "@/lib/utils/s3Upload";
import { COMPANIES } from "@/constants/companies";
import { EStepPath } from "@/types/onboardingTracker.types";
import { ECountryCode, EFileMimeType, IFileAsset } from "@/types/shared.types";
import { isValidObjectId } from "mongoose";
import { S3_TEMP_FOLDER } from "@/constants/aws";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { ES3Folder } from "@/types/aws.types";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import PreQualifications from "@/mongoose/models/Prequalifications";
import { EDriverType } from "@/types/preQualifications.types";
import { requireOnboardingSession } from "@/lib/utils/auth/onboardingSession";
import { attachCookies } from "@/lib/utils/auth/attachCookie";
// duplicates removed

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
  // Banking removed from Business section
  const keys: (keyof IApplicationFormPage4)[] = ["businessName", "hstNumber", "incorporatePhotos", "hstPhotos"];
  return keys.some((k) => hasKey(b, k));
}

function isBusinessClearIntent(b: Partial<IApplicationFormPage4>) {
  const emptyStrings = (!hasKey(b, "businessName") || !isNonEmptyString(b.businessName)) && (!hasKey(b, "hstNumber") || !isNonEmptyString(b.hstNumber));

  const emptyPhotos = (!hasKey(b, "incorporatePhotos") || len(b.incorporatePhotos) === 0) && (!hasKey(b, "hstPhotos") || len(b.hstPhotos) === 0);

  // Clear intent only if ALL business keys are present AND all are empty (banking excluded)
  const allKeysPresent = hasKey(b, "businessName") && hasKey(b, "hstNumber") && hasKey(b, "incorporatePhotos") && hasKey(b, "hstPhotos");

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
  requireKey("hstPhotos", "hstPhotos");

  if (missing.length) {
    throw new AppError(400, `Business section is partial. Missing: ${missing.join(", ")}. Provide all fields or explicitly clear all.`);
  }

  // strings non-empty
  if (!isNonEmptyString(b.businessName)) throw new AppError(400, "businessName is required in Business section.");
  if (!isNonEmptyString(b.hstNumber)) throw new AppError(400, "hstNumber is required in Business section.");
  if ((b.hstNumber?.trim().length ?? 0) < 9) throw new AppError(400, "hstNumber must be at least 9 characters.");

  // photos within limits
  const inc = len(b.incorporatePhotos);
  const hst = len(b.hstPhotos);

  if (inc < 1 || inc > 10) throw new AppError(400, `incorporatePhotos must have 1–10 photos. You sent ${inc}.`);
  if (hst < 1 || hst > 2) throw new AppError(400, `hstPhotos must have 1–2 photos. You sent ${hst}.`);

  return { mode: "validate" as const };
}

const isPdfMime = (asset?: IFileAsset | null) => {
  if (!asset) return false;
  const mime = String(asset.mimeType || "").toLowerCase();
  return mime === EFileMimeType.PDF;
};

function ensurePdfArray(files: IFileAsset[] | undefined, label: string) {
  if (!Array.isArray(files)) return;
  files.forEach((file, idx) => {
    if (!isPdfMime(file)) {
      throw new AppError(400, `${label} file #${idx + 1} must be a PDF document`);
    }
  });
}

function ensurePdfSingle(file: IFileAsset | undefined | null, label: string) {
  if (!file) return;
  if (!isPdfMime(file)) {
    throw new AppError(400, `${label} must be a PDF document`);
  }
}

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "Invalid onboarding ID");

    const { tracker: onboardingDoc, refreshCookie } = await requireOnboardingSession(id);

    if (!isInvitationApproved(onboardingDoc)) return errorResponse(401, "pending approval");

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
    if (!isCanadian && !isUS) {
      throw new AppError(400, "Unsupported applicant country for Page 4 rules.");
    }

    // HST is Canadian-only
    if (isUS) {
      if (hasKey(body, "hstNumber")) {
        throw new AppError(400, "HST number is not accepted for US applicants.");
      }
      if (hasKey(body, "hstPhotos")) {
        throw new AppError(400, "HST photos are not accepted for US applicants.");
      }
    }

    // =========================
    // 1) Required-for-all logic
    // =========================
    // For US drivers: either
    //   (passportPhotos + passportDetails)
    // or
    //   (prPermitCitizenshipPhotos + prPermitCitizenshipDetails)
    // is required (not both).
    // For Canadian drivers: existing rules stay the same.
    
    // Bundle detection variables (used later in merge logic to explicitly clear opposite bundle)
    // CRITICAL: When frontend selects a bundle, it DELETES the opposite bundle's fields from payload.
    // Without explicit clearing, hasKey() returns false and merge logic preserves old data (BUG).
    // Solution: Detect which bundle is selected during validation, then explicitly clear opposite
    // bundle in merge logic. This ensures old data doesn't persist when switching bundles.
    let hasPassportBundle = false;
    let hasPRBundle = false;
    
    if (isUS) {
      // 1.1 Immigration status is required for US applicants
      if (!hasKey(body, "immigrationStatusInUS") || !isNonEmptyString(body.immigrationStatusInUS)) {
        throw new AppError(400, "Immigration status in US is required.");
      }

      // 1.2 Bundle detection: photos + details
      const passportPhotoCount = len(body.passportPhotos);
      const prPhotoCount = len(body.prPermitCitizenshipPhotos);

      const hasPassportPhotos = passportPhotoCount > 0;
      const hasPassportDetails = !!body.passportDetails;
      hasPassportBundle = hasPassportPhotos || hasPassportDetails;

      const hasPRPhotos = prPhotoCount > 0;
      const hasPRDetails = !!body.prPermitCitizenshipDetails;
      hasPRBundle = hasPRPhotos || hasPRDetails;

      // Must choose exactly one bundle
      if (!hasPassportBundle && !hasPRBundle) {
        throw new AppError(400, "US drivers must provide either passport (photos and details) or PR/Permit/Citizenship (photos and details).");
      }

      if (hasPassportBundle && hasPRBundle) {
        throw new AppError(400, "Provide either passport (photos and details) OR PR/Permit/Citizenship (photos and details), not both.");
      }

      // If passport path selected → require both photos and details
      if (hasPassportBundle) {
        if (!hasPassportPhotos) {
          throw new AppError(400, "Passport photos are required when providing passport details.");
        }
        if (!hasPassportDetails) {
          throw new AppError(400, "Passport details are required when providing passport photos.");
        }

        // photos must be exactly 2, using existing helper
        expectCountExact(body, "passportPhotos", 2, "Passport photos");
      }

      // If PR/Permit/Citizenship path selected → require both photos and details
      if (hasPRBundle) {
        if (!hasPRPhotos) {
          throw new AppError(400, "PR/Permit/Citizenship photos are required when providing PR/Permit/Citizenship details.");
        }
        if (!hasPRDetails) {
          throw new AppError(400, "PR/Permit/Citizenship details are required when providing PR/Permit/Citizenship photos.");
        }

        // photos must be 1–2, using existing helper
        expectCountRange(body, "prPermitCitizenshipPhotos", 1, 2, "PR/Permit/Citizenship photos");
      }
    } else {
      // Canadian drivers: keep existing behaviour
      // - Passport photos always required
      // - PR/Permit/Citizenship photos only required when passportType === "others"
      expectCountExact(body, "passportPhotos", 2, "Passport photos");

      if (body.passportType === "others") {
        expectCountRange(body, "prPermitCitizenshipPhotos", 1, 2, "PR/Permit/Citizenship photos");
      }
      // For Canadian passports, PR/Permit/Citizenship is not required
    }

    // =========================
    // 2) Country-specific logic
    // =========================
    if (isCanadian) {
      expectCountExact(body, "healthCardPhotos", 2, "Health card photos");

      // US Visa only required for cross-border work authorization
      if (body.passportType === "others" && body.workAuthorizationType === "cross_border") {
        expectCountRange(body, "usVisaPhotos", 1, 2, "US visa photos");
      }

      // Forbidden for CA
      forbidNonEmpty(body, "medicalCertificationPhotos", "Medical certification photos");
    } else if (isUS) {
      // Medical cert photos required for US
      expectCountRange(body, "medicalCertificationPhotos", 1, 2, "Medical certification photos");

      // medicalCertificateDetails required for US applicants
      if (!body.medicalCertificateDetails) {
        throw new AppError(400, "Medical certificate details are required for US applicants.");
      }

      const { documentNumber, issuingAuthority } = body.medicalCertificateDetails;

      if (!isNonEmptyString(documentNumber)) {
        throw new AppError(400, "Medical certificate document number is required for US applicants.");
      }
      if (!isNonEmptyString(issuingAuthority)) {
        throw new AppError(400, "Medical certificate issuing authority is required for US applicants.");
      }
      // expiryDate remains optional

      // Forbidden for US
      forbidNonEmpty(body, "healthCardPhotos", "Health card photos");
      forbidNonEmpty(body, "usVisaPhotos", "US visa photos");
    }

    // =========================
    // 3) Business section (all-or-nothing on BODY)
    // =========================
    const prev = appFormDoc.page4; // keep previous to handle deletion on explicit clear
    const bizDecision = isCanadian ? validateBusinessAllOrNothing(body) : { mode: "skip" as const };

    // =========================
    // 3.5) Banking requiredness based on driverType from PreQualifications
    // =========================
    try {
      const preQualId = onboardingDoc.forms?.preQualification;
      if (preQualId) {
        const preQualDoc = await PreQualifications.findById(preQualId);
        const driverType = preQualDoc?.driverType as EDriverType | undefined;
        if (driverType === EDriverType.Company || driverType === EDriverType.OwnerOperator) {
          // For these applicants, require banking info photos to be present in body
          expectCountRange(body, "bankingInfoPhotos", 1, 2, "Banking info photos");
        }
      }
    } catch {
      // fallthrough: if we cannot determine, leave to FE validation
    }

    // =========================
    // 4) FAST Card section
    // =========================
    // Fast card remains optional. If key present in body but all fields are empty/undefined → treat as clearing.
    const bodyHasFastCard =
      hasKey(body, "fastCard") &&
      body.fastCard &&
      (isNonEmptyString(body.fastCard.fastCardNumber) || !!body.fastCard.fastCardExpiry || !!body.fastCard.fastCardFrontPhoto || !!body.fastCard.fastCardBackPhoto);

    // =========================
    // 4.5) Enforce all documents are PDFs
    // =========================
    ensurePdfArray(body.passportPhotos, "Passport photos");
    ensurePdfArray(body.prPermitCitizenshipPhotos, "PR/Permit/Citizenship photos");
    ensurePdfArray(body.healthCardPhotos, "Health card photos");
    ensurePdfArray(body.medicalCertificationPhotos, "Medical certification photos");
    ensurePdfArray(body.usVisaPhotos, "US visa photos");
    ensurePdfArray(body.hstPhotos, "HST photos");
    ensurePdfArray(body.incorporatePhotos, "Incorporation photos");
    ensurePdfArray(body.bankingInfoPhotos, "Banking info photos");

    if (body.fastCard) {
      ensurePdfSingle(body.fastCard.fastCardFrontPhoto, "FAST card front photo");
      ensurePdfSingle(body.fastCard.fastCardBackPhoto, "FAST card back photo");
    }

    // =========================
    // Phase 1: merge page4 with body (preserve existing fields not in body)
    // =========================
    // Merge pattern: preserve existing data, only update fields explicitly in body
    // This prevents overwriting fields like bankingInfoPhotos when they're not touched
    const prevP4 = prev || ({} as IApplicationFormPage4);
    const mergedPage4: IApplicationFormPage4 = {
      ...prevP4,
      // Always update fields that are required/always present in body
      ...(isUS
        ? {
            immigrationStatusInUS: body.immigrationStatusInUS as any,
            // US Bundle Logic: Explicitly clear opposite bundle to prevent data persistence issues
            // When frontend selects a bundle, it deletes the opposite bundle's fields from payload.
            // Without explicit clearing, hasKey() returns false and we preserve old data (BUG).
            // Solution: Use bundle detection from validation to explicitly clear opposite bundle.
            passportPhotos: hasPassportBundle
              ? body.passportPhotos ?? []
              : [], // Explicitly clear when PR bundle is selected
            prPermitCitizenshipPhotos: hasPRBundle
              ? body.prPermitCitizenshipPhotos ?? []
              : [], // Explicitly clear when passport bundle is selected
            passportDetails: hasPassportBundle
              ? hasKey(body, "passportDetails")
                ? body.passportDetails ?? undefined
                : prevP4.passportDetails
              : undefined, // Explicitly clear when PR bundle is selected
            prPermitCitizenshipDetails: hasPRBundle
              ? hasKey(body, "prPermitCitizenshipDetails")
                ? body.prPermitCitizenshipDetails ?? undefined
                : prevP4.prPermitCitizenshipDetails
              : undefined, // Explicitly clear when passport bundle is selected
            medicalCertificateDetails: body.medicalCertificateDetails!,
            medicalCertificationPhotos: body.medicalCertificationPhotos ?? [],
            healthCardPhotos: [], // forbidden for US
            usVisaPhotos: [], // forbidden for US
          }
        : {
            // Canada: passport photos always required
            passportPhotos: body.passportPhotos ?? [],
            prPermitCitizenshipPhotos: body.prPermitCitizenshipPhotos ?? [],
            healthCardPhotos: body.healthCardPhotos ?? [],
            usVisaPhotos: body.usVisaPhotos ?? [],
            medicalCertificationPhotos: [], // forbidden for CA
          }),
      // Business section: only update if explicitly provided in body
      ...(hasKey(body, "businessName")
        ? { businessName: body.businessName ?? "" }
        : {}),
      ...(hasKey(body, "hstNumber")
        ? { hstNumber: body.hstNumber ?? "" }
        : {}),
      ...(hasKey(body, "incorporatePhotos")
        ? { incorporatePhotos: body.incorporatePhotos ?? [] }
        : {}),
      ...(hasKey(body, "hstPhotos")
        ? { hstPhotos: body.hstPhotos ?? [] }
        : {}),
      // Banking: use body value if it has photos, otherwise preserve existing data
      // This handles the case where form sends empty array [] for untouched fields
      // but we want to preserve existing banking data that was previously saved
      bankingInfoPhotos:
        Array.isArray(body.bankingInfoPhotos) && body.bankingInfoPhotos.length > 0
          ? body.bankingInfoPhotos
          : Array.isArray(prevP4.bankingInfoPhotos) && prevP4.bankingInfoPhotos.length > 0
          ? prevP4.bankingInfoPhotos
          : body.bankingInfoPhotos ?? [],
      // Criminal records
      hasCriminalRecords: body.hasCriminalRecords ?? prevP4.hasCriminalRecords,
      criminalRecords: body.criminalRecords ?? prevP4.criminalRecords ?? [],
      // Additional info fields
      deniedLicenseOrPermit: hasKey(body, "deniedLicenseOrPermit")
        ? body.deniedLicenseOrPermit
        : prevP4.deniedLicenseOrPermit,
      suspendedOrRevoked: hasKey(body, "suspendedOrRevoked")
        ? body.suspendedOrRevoked
        : prevP4.suspendedOrRevoked,
      suspensionNotes: hasKey(body, "suspensionNotes")
        ? body.suspensionNotes ?? ""
        : prevP4.suspensionNotes ?? "",
      testedPositiveOrRefused: hasKey(body, "testedPositiveOrRefused")
        ? body.testedPositiveOrRefused
        : prevP4.testedPositiveOrRefused,
      completedDOTRequirements: hasKey(body, "completedDOTRequirements")
        ? body.completedDOTRequirements
        : prevP4.completedDOTRequirements,
      hasAccidentalInsurance: hasKey(body, "hasAccidentalInsurance")
        ? body.hasAccidentalInsurance
        : prevP4.hasAccidentalInsurance,
      // Passport type selection (Canadian companies only)
      passportType: hasKey(body, "passportType")
        ? body.passportType
        : prevP4.passportType,
      workAuthorizationType: hasKey(body, "workAuthorizationType")
        ? body.workAuthorizationType
        : prevP4.workAuthorizationType,
      // Fast card: only update if explicitly provided
      ...(hasKey(body, "fastCard") ? { fastCard: body.fastCard } : {}),
      // Truck details: only update if explicitly provided
      ...(hasKey(body, "truckDetails") ? { truckDetails: body.truckDetails } : {}),
    };

    appFormDoc.set("page4", mergedPage4);
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
        // Only delete business-related S3 files, NOT banking (banking is independent)
        keysToHardDelete.push(...finalizedOnly(collect(prev.incorporatePhotos)), ...finalizedOnly(collect(prev.hstPhotos)));
      }
      // overwrite business fields to empty in DB (bankingInfoPhotos is NOT part of business section)
      appFormDoc.set("page4.businessName", "");
      appFormDoc.set("page4.hstNumber", "");
      appFormDoc.set("page4.incorporatePhotos", []);
      appFormDoc.set("page4.hstPhotos", []);
      // NOTE: bankingInfoPhotos is intentionally NOT cleared here - it's independent of business section
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

    // For US applicants, HST must not be stored
    if (isUS) {
      page4Final.hstNumber = "";
      page4Final.hstPhotos = [];
    }

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

    // Determine company / country
    const company = COMPANIES.find((c) => c.id === onboardingDoc.companyId);
    if (!company) {
      return errorResponse(400, "Invalid company assigned to applicant");
    }
    const isUS = company.countryCode === ECountryCode.US;
    const isCanadian = company.countryCode === ECountryCode.CA;

    if (!isUS && !isCanadian) {
      return errorResponse(400, "Unsupported applicant country for Page 4 rules.");
    }

    // Pull DB prequalification driverType – MUST exist
    const preQualId = onboardingDoc.forms?.preQualification;
    if (!preQualId) {
      return errorResponse(404, "PreQualifications not linked");
    }

    const preQualDoc = await PreQualifications.findById(preQualId);
    if (!preQualDoc) {
      return errorResponse(404, "PreQualifications not found");
    }

    const prequalificationData: { driverType?: EDriverType } = {
      driverType: preQualDoc.driverType as EDriverType,
    };

    // Sanitize page4 for US drivers: do not expose HST fields
    const rawPage4 = appFormDoc.page4 ? (JSON.parse(JSON.stringify(appFormDoc.page4)) as IApplicationFormPage4) : undefined;

    const page4: IApplicationFormPage4 | undefined = rawPage4
      ? {
          ...rawPage4,
          ...(isUS
            ? {
                // US drivers should never see HST values, even if legacy data exists
                hstNumber: "",
                hstPhotos: [],
              }
            : {}),
        }
      : undefined;

    const res = successResponse(200, "Page 4 data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_4),
      page4,
      prequalificationData,
    });

    return attachCookies(res, refreshCookie);
  } catch (error) {
    return errorResponse(error);
  }
};
