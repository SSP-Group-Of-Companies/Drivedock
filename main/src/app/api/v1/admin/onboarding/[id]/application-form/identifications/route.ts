// app/api/v1/admin/onboarding/[id]/application-form/identifications/route.ts
import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse, AppError } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/utils/auth/authUtils";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";

import { buildTrackerContext, advanceProgress, nextResumeExpiry, hasCompletedStep, isInvitationApproved } from "@/lib/utils/onboardingUtils";

import { deleteS3Objects, finalizeAsset, finalizeAssetVector, buildFinalDest } from "@/lib/utils/s3Upload";
import { parseJsonBody } from "@/lib/utils/reqParser";

import { COMPANIES } from "@/constants/companies";
import PreQualifications from "@/mongoose/models/Prequalifications";
import { EDriverType } from "@/types/preQualifications.types";
import { S3_TEMP_FOLDER } from "@/constants/aws";

import { ES3Folder } from "@/types/aws.types";
import { EStepPath } from "@/types/onboardingTracker.types";
import { ECountryCode, IFileAsset } from "@/types/shared.types";
import type { ILicenseEntry, IApplicationFormDoc, IApplicationFormPage4 } from "@/types/applicationForm.types";

/**
 * ===============================================================
 * Admin — Identifications (Licenses + Docs)
 * Strict version: admin must always send all required photos.
 * ===============================================================
 */

type PatchBody = {
  // Page 1
  licenses?: ILicenseEntry[];

  // Page 4 subset (BODY defines truth for provided keys; required keys must be present)
  employeeNumber?: string;
  hstNumber?: string;
  businessName?: string;

  incorporatePhotos?: IFileAsset[];
  hstPhotos?: IFileAsset[];
  bankingInfoPhotos?: IFileAsset[];

  healthCardPhotos?: IFileAsset[];
  medicalCertificationPhotos?: IFileAsset[];

  // Passport type selection (Canadian companies only)
  passportType?: IApplicationFormPage4["passportType"];
  workAuthorizationType?: IApplicationFormPage4["workAuthorizationType"];

  passportPhotos?: IFileAsset[];
  prPermitCitizenshipPhotos?: IFileAsset[];
  usVisaPhotos?: IFileAsset[];

  fastCard?: IApplicationFormPage4["fastCard"];

  // Truck Details (Admin-only, all optional)
  truckDetails?: IApplicationFormPage4["truckDetails"];
};

/* ----------------------------- helpers ----------------------------- */
const hasKey = <T extends object, K extends PropertyKey>(o: T, k: K): k is K => Object.prototype.hasOwnProperty.call(o, k);

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
const alen = (arr?: IFileAsset[]) => (Array.isArray(arr) ? dedupeByS3Key(arr).length : 0);

function requirePresence(b: PatchBody, key: keyof IApplicationFormPage4, label: string) {
  if (!hasKey(b, key)) throw new AppError(400, `${label} is required for this applicant.`);
}
function expectCountExact(b: PatchBody, key: keyof IApplicationFormPage4, exact: number, label: string) {
  requirePresence(b, key, label);
  const n = alen((b as any)[key]);
  if (n !== exact) throw new AppError(400, `${label} must have exactly ${exact} photo${exact === 1 ? "" : "s"}. You sent ${n}.`);
}
function expectCountRange(b: PatchBody, key: keyof IApplicationFormPage4, min: number, max: number, label: string) {
  requirePresence(b, key, label);
  const n = alen((b as any)[key]);
  if (n < min || n > max) throw new AppError(400, `${label} must have between ${min} and ${max} photos. You sent ${n}.`);
}
/** Forbid the field from being included at all (even empty) */
function forbidPresence(b: PatchBody, key: keyof IApplicationFormPage4, label: string) {
  if (hasKey(b, key)) throw new AppError(400, `${label} must not be included for this applicant.`);
}

/** Business section presence in BODY (any of the 5 keys appears) */
function businessKeysPresentInBody(b: PatchBody) {
  // Banking no longer part of Business all-or-nothing
  return hasKey(b, "businessName") || hasKey(b, "hstNumber") || hasKey(b, "incorporatePhotos") || hasKey(b, "hstPhotos");
}

/** Business clear intent: ALL five keys present and all empty */
function isBusinessClearIntent(b: PatchBody) {
  const allKeysPresent = hasKey(b, "businessName") && hasKey(b, "hstNumber") && hasKey(b, "incorporatePhotos") && hasKey(b, "hstPhotos");

  if (!allKeysPresent) return false;

  const emptyStrings = (!b.businessName || b.businessName.trim() === "") && (!b.hstNumber || b.hstNumber.trim() === "");

  const emptyPhotos = alen(b.incorporatePhotos) === 0 && alen(b.hstPhotos) === 0;

  return emptyStrings && emptyPhotos;
}

/** Business validator (BODY defines truth if any business key is present) */
function validateBusinessAllOrNothingOnBody(b: PatchBody) {
  if (!businessKeysPresentInBody(b)) return { mode: "skip" as const };
  if (isBusinessClearIntent(b)) return { mode: "clear" as const };

  // else require all 7 keys present & valid
  const missing: string[] = [];
  const req = (k: keyof IApplicationFormPage4) => {
    if (!hasKey(b, k)) missing.push(k as string);
  };
  req("businessName");
  req("hstNumber");
  req("incorporatePhotos");
  req("hstPhotos");

  if (missing.length) throw new AppError(400, `Business section is partial. Missing: ${missing.join(", ")}. Provide all fields or clear all.`);

  if (!isNonEmptyString(b.businessName)) throw new AppError(400, "businessName is required in Business section.");
  if (!isNonEmptyString(b.hstNumber)) throw new AppError(400, "hstNumber is required in Business section.");
  if ((b.hstNumber?.trim().length ?? 0) < 9) throw new AppError(400, "hstNumber must be at least 9 characters.");

  const inc = alen(b.incorporatePhotos);
  const hst = alen(b.hstPhotos);

  if (inc < 1 || inc > 10) throw new AppError(400, `incorporatePhotos must have 1–10 photos. You sent ${inc}.`);
  if (hst < 1 || hst > 2) throw new AppError(400, `hstPhotos must have 1–2 photos. You sent ${hst}.`);

  return { mode: "validate" as const };
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
    if (!isInvitationApproved(onboardingDoc)) return errorResponse(400, "driver not yet approved for onboarding process");

    // Admin path: require Page 4 completed first
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
    const touchingAnyPage4Key =
      businessKeysPresentInBody(body) ||
      hasKey(body, "healthCardPhotos") ||
      hasKey(body, "medicalCertificationPhotos") ||
      hasKey(body, "passportPhotos") ||
      hasKey(body, "prPermitCitizenshipPhotos") ||
      hasKey(body, "usVisaPhotos") ||
      hasKey(body, "fastCard");

    if (!touchingLicenses && !touchingAnyPage4Key) {
      return errorResponse(400, "No identifiable fields provided for update");
    }

    // Country context
    const company = COMPANIES.find((c) => c.id === onboardingDoc.companyId);
    if (!company) throw new AppError(400, "Invalid company assigned to applicant");
    const isCanadian = company.countryCode === ECountryCode.CA;
    const isUS = company.countryCode === ECountryCode.US;
    if (!isCanadian && !isUS) throw new AppError(400, "Unsupported applicant country for Page 4 rules.");

    // Keep previous state for deletions
    const prevP1Licenses = appFormDoc.page1.licenses ?? [];
    const prevP4 = appFormDoc.page4;

    /* -------------------- 0) ALWAYS require required groups in BODY (explicit contract) -------------------- */
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
      // Canadian drivers: passport type determines requirements
      requirePresence(body, "passportPhotos", "Passport photos");
      expectCountExact(body, "passportPhotos", 2, "Passport photos");

      // Only require PR/Permit/Citizenship for non-Canadian passports
      if (body.passportType === "others") {
        requirePresence(body, "prPermitCitizenshipPhotos", "PR/Permit/Citizenship photos");
        expectCountRange(body, "prPermitCitizenshipPhotos", 1, 2, "PR/Permit/Citizenship photos");
      }
      // For Canadian passports, PR/Permit/Citizenship is not required
    }

    if (isCanadian) {
      requirePresence(body, "healthCardPhotos", "Health card photos");
      expectCountExact(body, "healthCardPhotos", 2, "Health card photos");

      // US Visa only required for cross-border work authorization
      if (body.passportType === "others" && body.workAuthorizationType === "cross_border") {
        requirePresence(body, "usVisaPhotos", "US visa photos");
        expectCountRange(body, "usVisaPhotos", 1, 2, "US visa photos");
      }

      // STRICT: even an empty medicalCertificationPhotos key is disallowed
      forbidPresence(body, "medicalCertificationPhotos", "Medical certification photos");
    } else if (isUS) {
      requirePresence(body, "medicalCertificationPhotos", "Medical certification photos");
      expectCountRange(body, "medicalCertificationPhotos", 1, 2, "Medical certification photos");
      // STRICT: even empty keys are disallowed
      forbidPresence(body, "healthCardPhotos", "Health card photos");
      forbidPresence(body, "usVisaPhotos", "US visa photos");
    }

    /* -------------------- Phase 1: set ONLY touched subtrees -------------------- */

    // (A) Page 1 — licenses
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

    // (B) Page 4 — explicit, body-driven
    {
      // Business all-or-nothing on BODY (only if they touched business keys)
      const bizDecision = validateBusinessAllOrNothingOnBody(body);

      // Driver-type requiredness from DB: enforce business + banking for Company/Owner Operator
      try {
        const preQualId = onboardingDoc.forms?.preQualification as any;
        if (preQualId) {
          const preQualDoc = await PreQualifications.findById(preQualId);
          const driverType = preQualDoc?.driverType as EDriverType | undefined;
          if (driverType === EDriverType.Company || driverType === EDriverType.OwnerOperator) {
            // Business required
            requirePresence(body, "businessName", "Business name");
            if (!isNonEmptyString(body.businessName)) throw new AppError(400, "Business name is required for this applicant.");
            requirePresence(body, "hstNumber", "HST number");
            if (!isNonEmptyString(body.hstNumber)) throw new AppError(400, "HST number is required for this applicant.");
            expectCountRange(body, "incorporatePhotos", 1, 10, "Incorporation photos");
            expectCountRange(body, "hstPhotos", 1, 2, "HST photos");

            // Banking required
            expectCountRange(body, "bankingInfoPhotos", 1, 2, "Banking info photos");
          }
        }
      } catch {
        // If driver type can't be determined, leave as-is
      }

      // Fast card: if present at all, it must be complete (number+expiry+front+back)
      if (hasKey(body, "fastCard")) {
        const fc = body.fastCard;
        const anyProvided = !!fc && (isNonEmptyString(fc.fastCardNumber) || !!fc.fastCardExpiry || !!fc.fastCardFrontPhoto || !!fc.fastCardBackPhoto);
        if (anyProvided) {
          if (!isNonEmptyString(fc?.fastCardNumber) || !fc?.fastCardExpiry) {
            throw new AppError(400, "Fast card must include number and expiry.");
          }
          if (!fc?.fastCardFrontPhoto || !fc?.fastCardBackPhoto) {
            throw new AppError(400, "Fast card must include both front and back photos.");
          }
        }
      }

      // Apply BODY keys; required groups are guaranteed present by now
      const nextP4: IApplicationFormPage4 = {
        ...prevP4,

        // Business (respect BODY if present)
        ...(hasKey(body, "businessName") ? { businessName: body.businessName ?? "" } : {}),
        ...(hasKey(body, "hstNumber") ? { hstNumber: body.hstNumber ?? "" } : {}),
        ...(hasKey(body, "incorporatePhotos") ? { incorporatePhotos: body.incorporatePhotos ?? [] } : {}),
        ...(hasKey(body, "bankingInfoPhotos") ? { bankingInfoPhotos: body.bankingInfoPhotos ?? [] } : {}),
        ...(hasKey(body, "hstPhotos") ? { hstPhotos: body.hstPhotos ?? [] } : {}),

        // Required groups — conditionally present based on country
        ...(isUS
          ? {
              // For US drivers: include only what was provided
              ...(body.passportPhotos ? { passportPhotos: body.passportPhotos } : {}),
              ...(body.prPermitCitizenshipPhotos ? { prPermitCitizenshipPhotos: body.prPermitCitizenshipPhotos } : {}),
            }
          : {
              // For Canadian drivers: both are always present
              passportPhotos: body.passportPhotos!,
              prPermitCitizenshipPhotos: body.prPermitCitizenshipPhotos!,
            }),
        ...(isCanadian
          ? {
              healthCardPhotos: body.healthCardPhotos!,
              usVisaPhotos: body.usVisaPhotos!,
              medicalCertificationPhotos: [], // forbidden
            }
          : {
              medicalCertificationPhotos: body.medicalCertificationPhotos!,
              healthCardPhotos: [], // forbidden
              usVisaPhotos: [], // forbidden
            }),

        // Optional fast card
        ...(hasKey(body, "fastCard") ? { fastCard: body.fastCard } : {}),

        // Optional truck details
        ...(hasKey(body, "truckDetails") ? { truckDetails: body.truckDetails } : {}),
      };

      // Final-state enforcement based on driverType (protects against partial bodies)
      try {
        const preQualId = onboardingDoc.forms?.preQualification as any;
        if (preQualId) {
          const preQualDoc = await PreQualifications.findById(preQualId);
          const driverType = preQualDoc?.driverType as EDriverType | undefined;
          if (driverType === EDriverType.Company || driverType === EDriverType.OwnerOperator) {
            const nameOk = isNonEmptyString(nextP4.businessName);
            const hstOk = isNonEmptyString(nextP4.hstNumber);
            const incOk = (nextP4.incorporatePhotos?.length ?? 0) >= 1;
            const hstPhotosOk = (nextP4.hstPhotos?.length ?? 0) >= 1;
            const bankingOk = (nextP4.bankingInfoPhotos?.length ?? 0) >= 1;
            if (!nameOk || !hstOk || !incOk || !hstPhotosOk || !bankingOk) {
              throw new AppError(400, "For Company/Owner Operator, business and banking info are required.");
            }
          }
        }
      } catch (e) {
        if (e instanceof AppError) throw e;
      }

      if (bizDecision.mode === "clear") {
        nextP4.businessName = "";
        nextP4.hstNumber = "";
        nextP4.incorporatePhotos = [];
        nextP4.bankingInfoPhotos = [];
        nextP4.hstPhotos = [];
      }

      appFormDoc.set("page4", nextP4);
    }

    // Validate only what we touched
    const validatePaths: string[] = [];
    if (touchingLicenses) validatePaths.push("page1");
    validatePaths.push("page4"); // explicit required groups means we always touched page4
    await appFormDoc.validate(validatePaths);
    await appFormDoc.save({ validateBeforeSave: false });

    /* -------------------- Section-clear deletions (Business + Fast Card) -------------------- */
    const keysToHardDelete: string[] = [];

    const curP4 = appFormDoc.page4 as IApplicationFormPage4;

    // Use prevP4 snapshot (no Mongoose internals)
    const prevHadBiz =
      isNonEmptyString(prevP4.businessName) ||
      isNonEmptyString(prevP4.hstNumber) ||
      (prevP4.incorporatePhotos?.length ?? 0) > 0 ||
      (prevP4.bankingInfoPhotos?.length ?? 0) > 0 ||
      (prevP4.hstPhotos?.length ?? 0) > 0;

    const nowBizEmpty =
      !isNonEmptyString(curP4.businessName) &&
      !isNonEmptyString(curP4.hstNumber) &&
      (curP4.incorporatePhotos?.length ?? 0) === 0 &&
      (curP4.bankingInfoPhotos?.length ?? 0) === 0 &&
      (curP4.hstPhotos?.length ?? 0) === 0;

    const finalizedOnly = (ks: (string | undefined)[]) => ks.filter((k): k is string => !!k && !k.startsWith(`${S3_TEMP_FOLDER}/`));
    const collect = (arr?: IFileAsset[]) => (Array.isArray(arr) ? arr.map((p) => p.s3Key).filter(Boolean) : []);

    if (prevHadBiz && nowBizEmpty) {
      keysToHardDelete.push(...finalizedOnly(collect(prevP4.incorporatePhotos)), ...finalizedOnly(collect(prevP4.bankingInfoPhotos)), ...finalizedOnly(collect(prevP4.hstPhotos)));
    }

    // Fast card cleared
    const hadFast = prevP4.fastCard;
    const hasFast =
      !!curP4.fastCard && (isNonEmptyString(curP4.fastCard.fastCardNumber) || !!curP4.fastCard.fastCardExpiry || !!curP4.fastCard.fastCardFrontPhoto || !!curP4.fastCard.fastCardBackPhoto);

    if (!hasFast && hadFast) {
      keysToHardDelete.push(...finalizedOnly([hadFast.fastCardFrontPhoto?.s3Key, hadFast.fastCardBackPhoto?.s3Key]));
    }

    if (keysToHardDelete.length) {
      try {
        await deleteS3Objects(keysToHardDelete);
      } catch (e) {
        console.warn("Failed to delete section-cleared finalized S3 keys:", e);
      }
    }

    /* -------------------- Phase 2: finalize S3 files -------------------- */
    // Page 1
    let p1FinalLicenses: ILicenseEntry[] | undefined;
    if (touchingLicenses) {
      p1FinalLicenses = JSON.parse(JSON.stringify(appFormDoc.page1.licenses)) as ILicenseEntry[];
      const dest = buildFinalDest(onboardingDoc.id, ES3Folder.LICENSES);
      for (const lic of p1FinalLicenses) {
        if (lic.licenseFrontPhoto) lic.licenseFrontPhoto = await finalizeAsset(lic.licenseFrontPhoto, dest);
        if (lic.licenseBackPhoto) lic.licenseBackPhoto = await finalizeAsset(lic.licenseBackPhoto, dest);
      }
    }

    // Page 4 (finalize; finalizeAssetVector no-ops existing submissions)
    const p4Final: IApplicationFormPage4 = JSON.parse(JSON.stringify(appFormDoc.page4)) as IApplicationFormPage4;

    p4Final.hstPhotos = (await finalizeAssetVector(p4Final.hstPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.HST_PHOTOS))) as IFileAsset[];
    p4Final.incorporatePhotos = (await finalizeAssetVector(p4Final.incorporatePhotos, buildFinalDest(onboardingDoc.id, ES3Folder.INCORPORATION_PHOTOS))) as IFileAsset[];
    p4Final.bankingInfoPhotos = (await finalizeAssetVector(p4Final.bankingInfoPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.BANKING_INFO_PHOTOS))) as IFileAsset[];
    p4Final.healthCardPhotos = (await finalizeAssetVector(p4Final.healthCardPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.HEALTH_CARD_PHOTOS))) as IFileAsset[];
    p4Final.medicalCertificationPhotos = (await finalizeAssetVector(p4Final.medicalCertificationPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.MEDICAL_CERT_PHOTOS))) as IFileAsset[];
    p4Final.passportPhotos = (await finalizeAssetVector(p4Final.passportPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.PASSPORT_PHOTOS))) as IFileAsset[];
    p4Final.usVisaPhotos = (await finalizeAssetVector(p4Final.usVisaPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.US_VISA_PHOTOS))) as IFileAsset[];
    p4Final.prPermitCitizenshipPhotos = (await finalizeAssetVector(p4Final.prPermitCitizenshipPhotos, buildFinalDest(onboardingDoc.id, ES3Folder.PR_CITIZENSHIP_PHOTOS))) as IFileAsset[];

    if (p4Final.fastCard?.fastCardFrontPhoto) {
      p4Final.fastCard.fastCardFrontPhoto = await finalizeAsset(p4Final.fastCard.fastCardFrontPhoto, buildFinalDest(onboardingDoc.id, ES3Folder.FAST_CARD_PHOTOS));
    }
    if (p4Final.fastCard?.fastCardBackPhoto) {
      p4Final.fastCard.fastCardBackPhoto = await finalizeAsset(p4Final.fastCard.fastCardBackPhoto, buildFinalDest(onboardingDoc.id, ES3Folder.FAST_CARD_PHOTOS));
    }

    /* -------------------- Phase 2.5: delete removed finalized keys -------------------- */
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

    const prevKeysP1 = new Set(collectLicenseKeys(prevP1Licenses));
    const newKeysP1 = new Set(collectLicenseKeys(p1FinalLicenses ?? appFormDoc.page1.licenses));
    const removedP1 = [...prevKeysP1].filter((k) => !newKeysP1.has(k) && !k.startsWith(`${S3_TEMP_FOLDER}/`));
    if (removedP1.length) {
      try {
        await deleteS3Objects(removedP1);
      } catch (e) {
        console.warn("Failed to delete removed finalized license S3 keys:", e);
      }
    }

    const prevKeysP4 = new Set(collectP4Keys(prevP4));
    const newKeysP4 = new Set(collectP4Keys(p4Final));
    const removedP4 = [...prevKeysP4].filter((k) => !newKeysP4.has(k) && !k.startsWith(`${S3_TEMP_FOLDER}/`));
    if (removedP4.length) {
      try {
        await deleteS3Objects(removedP4);
      } catch (e) {
        console.warn("Failed to delete removed finalized Page4 S3 keys:", e);
      }
    }

    /* -------------------- Phase 3: persist finalized subtrees -------------------- */
    if (touchingLicenses && p1FinalLicenses) {
      if (!p1FinalLicenses[0].licenseFrontPhoto || !p1FinalLicenses[0].licenseBackPhoto) {
        return errorResponse(400, "First license must include both front and back photos");
      }
      appFormDoc.set("page1.licenses", p1FinalLicenses as any);
      await appFormDoc.validate(["page1"]);
      await appFormDoc.save({ validateBeforeSave: false });
    }

    appFormDoc.set("page4", p4Final);
    await appFormDoc.validate(["page4"]);
    await appFormDoc.save({ validateBeforeSave: false });

    // Tracker & resume expiry
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.APPLICATION_PAGE_4);
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    return successResponse(200, "Identifications updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_4, true),
      licenses: appFormDoc.page1.licenses,
      // Page 4 subset echo
      hstNumber: appFormDoc.page4.hstNumber,
      businessName: appFormDoc.page4.businessName,
      incorporatePhotos: appFormDoc.page4.incorporatePhotos,
      hstPhotos: appFormDoc.page4.hstPhotos,
      bankingInfoPhotos: appFormDoc.page4.bankingInfoPhotos,
      healthCardPhotos: appFormDoc.page4.healthCardPhotos,
      medicalCertificationPhotos: appFormDoc.page4.medicalCertificationPhotos,

      // Passport type selection (Canadian companies only)
      passportType: appFormDoc.page4.passportType,
      workAuthorizationType: appFormDoc.page4.workAuthorizationType,

      passportPhotos: appFormDoc.page4.passportPhotos,
      prPermitCitizenshipPhotos: appFormDoc.page4.prPermitCitizenshipPhotos,
      usVisaPhotos: appFormDoc.page4.usVisaPhotos,
      fastCard: appFormDoc.page4.fastCard,
      truckDetails: appFormDoc.page4.truckDetails,
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
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");
    if (!isInvitationApproved(onboardingDoc)) return errorResponse(400, "driver not yet approved for onboarding process");

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
      hstNumber: appFormDoc.page4.hstNumber,
      businessName: appFormDoc.page4.businessName,
      incorporatePhotos: appFormDoc.page4.incorporatePhotos,
      hstPhotos: appFormDoc.page4.hstPhotos,
      bankingInfoPhotos: appFormDoc.page4.bankingInfoPhotos,
      healthCardPhotos: appFormDoc.page4.healthCardPhotos,
      medicalCertificationPhotos: appFormDoc.page4.medicalCertificationPhotos,

      // Passport type selection (Canadian companies only)
      passportType: appFormDoc.page4.passportType,
      workAuthorizationType: appFormDoc.page4.workAuthorizationType,

      passportPhotos: appFormDoc.page4.passportPhotos,
      prPermitCitizenshipPhotos: appFormDoc.page4.prPermitCitizenshipPhotos,
      usVisaPhotos: appFormDoc.page4.usVisaPhotos,
      fastCard: appFormDoc.page4.fastCard,
      truckDetails: appFormDoc.page4.truckDetails,
    });
  } catch (err) {
    return errorResponse(err);
  }
};
