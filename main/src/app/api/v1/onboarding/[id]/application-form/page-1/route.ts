// app/api/v1/onboarding/[id]/application-form/page-1/route.ts
import { NextRequest } from "next/server";
import { decryptString, encryptString, hashString } from "@/lib/utils/cryptoUtils";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { isValidSIN, isValidPhoneNumber, isValidEmail, isValidDOB, isValidSINIssueDate, isValidGender } from "@/lib/utils/validationUtils";
import { hasRecentAddressCoverage } from "@/lib/utils/hasMinimumAddressDuration";
import { advanceProgress, buildTrackerContext, nextResumeExpiry, onboardingExpired } from "@/lib/utils/onboardingUtils";
import { deleteS3Objects, finalizeAsset, buildFinalDest } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { S3_TEMP_FOLDER } from "@/constants/aws";
import { IApplicationFormPage1, ILicenseEntry } from "@/types/applicationForm.types";
import { EStepPath } from "@/types/onboardingTracker.types";
import { isValidObjectId } from "mongoose";
import { parseJsonBody } from "@/lib/utils/reqParser";
import ApplicationForm from "@/mongoose/models/ApplicationForm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id: onboardingId } = await params;

    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Invalid onboarding ID");
    }

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.status.completed === true) return errorResponse(401, "onboarding process already completed");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    const oldSin = decryptString(onboardingDoc.sinEncrypted);

    // unwrap the payload
    const body = await parseJsonBody<any>(req);
    const page1 = body?.page1 as IApplicationFormPage1 | undefined;
    if (!page1) return errorResponse(400, "Missing 'page1' in request body");

    // Sanitize + basic validations (business rules for page1 only)
    const newSin = String(page1.sin ?? "").replace(/\D/g, "");
    if (!isValidSIN(newSin)) return errorResponse(400, "Invalid SIN");

    if (!isValidEmail(page1.email)) return errorResponse(400, "Invalid email");
    if (page1.phoneHome && !isValidPhoneNumber(page1.phoneHome)) return errorResponse(400, "Invalid home phone");
    if (!isValidPhoneNumber(page1.phoneCell)) return errorResponse(400, "Invalid cell phone");
    if (!isValidPhoneNumber(page1.emergencyContactPhone)) return errorResponse(400, "Invalid emergency contact phone");
    if (!isValidDOB(page1.dob)) return errorResponse(400, "Invalid date of birth");
    if (!isValidSINIssueDate(page1.sinIssueDate)) return errorResponse(400, "Invalid SIN issue date");
    if (!isValidGender(page1.gender)) return errorResponse(400, "Invalid gender");
    if (!hasRecentAddressCoverage(page1.addresses)) return errorResponse(400, "Address history must cover 5 years");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    if (!Array.isArray(page1.licenses)) {
      return errorResponse(400, "'licenses' must be an array");
    }

    const firstLicense = page1.licenses[0];
    if (!firstLicense || firstLicense.licenseType !== "AZ") {
      return errorResponse(400, "First license must be of type AZ");
    }
    if (!firstLicense.licenseFrontPhoto || !firstLicense.licenseBackPhoto) {
      return errorResponse(400, "First license must include both front and back photos");
    }

    const sinChanged = oldSin !== newSin;
    const sinHash = hashString(newSin);
    const sinEncrypted = encryptString(newSin);
    const trackerId = onboardingDoc.id;

    // check if there's already an application with the same sin
    if (sinChanged) {
      const existingOnboarding = await OnboardingTracker.findOne({ sinHash: sinHash });
      if (existingOnboarding) return errorResponse(400, "application with this sin already exists");
    }

    // ----------------------------------------------------------------
    // Phase 1 — Write *only page1* subtree, validate *only page1*
    // ----------------------------------------------------------------
    const tempLicenses: ILicenseEntry[] = page1.licenses.map((lic) => ({ ...lic }));
    const tempSinPhoto = page1.sinPhoto;

    // keep previous keys for diff-based deletion later
    const prevSinPhotoKey = appFormDoc.page1?.sinPhoto?.s3Key;
    const prevLicenseKeys = collectLicenseKeys(appFormDoc.page1?.licenses);

    const page1ToSave: Omit<IApplicationFormPage1, "sin"> = {
      ...page1,
      sinEncrypted,
      sinPhoto: tempSinPhoto,
      licenses: tempLicenses,
    };

    appFormDoc.set("page1", page1ToSave as any);
    await appFormDoc.validate(["page1"]);
    await appFormDoc.save({ validateBeforeSave: false });

    // ----------------------------------------------------------------
    // Phase 2 — Finalize S3 files for page1 (no temp checks; finalizeAsset no-ops if already final)
    // ----------------------------------------------------------------
    const destSin = buildFinalDest(trackerId, ES3Folder.SIN_PHOTOS);
    const destLic = buildFinalDest(trackerId, ES3Folder.LICENSES);

    // finalize sin photo
    if (page1.sinPhoto) {
      page1.sinPhoto = await finalizeAsset(page1.sinPhoto, destSin);
    }

    // finalize license photos
    for (const lic of tempLicenses) {
      if (lic.licenseFrontPhoto) {
        lic.licenseFrontPhoto = await finalizeAsset(lic.licenseFrontPhoto, destLic);
      }
      if (lic.licenseBackPhoto) {
        lic.licenseBackPhoto = await finalizeAsset(lic.licenseBackPhoto, destLic);
      }
    }

    // Ensure first license still has both sides after finalize
    if (!tempLicenses[0].licenseFrontPhoto || !tempLicenses[0].licenseBackPhoto) {
      return errorResponse(400, "First license must include both front and back photos");
    }

    // ----------------------------------------------------------------
    // Phase 3 — Persist finalized page1 only (re-validate page1 only)
    // ----------------------------------------------------------------
    appFormDoc.set("page1.sinPhoto", page1.sinPhoto as any);
    appFormDoc.set("page1.licenses", tempLicenses as any);

    await appFormDoc.validate(["page1"]);
    await appFormDoc.save({ validateBeforeSave: false });

    // ----------------------------------------------------------------
    // Phase 4 — Delete finalized keys that were removed by the update
    // (diff between previous finalized keys and new finalized keys)
    // ----------------------------------------------------------------
    const newSinKey = page1.sinPhoto?.s3Key;
    const newLicenseKeys = collectLicenseKeys(tempLicenses);

    const prevKeys = new Set<string>([...(prevSinPhotoKey ? [prevSinPhotoKey] : []), ...prevLicenseKeys]);

    const newKeys = new Set<string>([...(newSinKey ? [newSinKey] : []), ...newLicenseKeys]);

    const removedFinalKeys = [...prevKeys].filter((k) => !newKeys.has(k) && !k.startsWith(`${S3_TEMP_FOLDER}/`));

    if (removedFinalKeys.length) {
      try {
        await deleteS3Objects(removedFinalKeys);
      } catch (err) {
        console.error("Failed to delete removed finalized S3 keys:", err);
      }
    }

    // ----------------------------------------------------------------
    // Phase 5 — Tracker updates (no cross-page validation)
    // ----------------------------------------------------------------
    if (sinChanged) {
      onboardingDoc.sinHash = sinHash;
      onboardingDoc.sinEncrypted = sinEncrypted;
    }
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.APPLICATION_PAGE_1);
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 1 updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_1),
      page1: appFormDoc.page1,
    });
  } catch (error) {
    console.error("PATCH /application-form/page-1 error:", error);
    return errorResponse(error);
  }
}

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;

    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    // Fetch onboarding tracker
    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) {
      return errorResponse(404, "Onboarding document not found");
    }

    if (onboardingDoc.status.completed === true) return errorResponse(401, "onboarding process already completed");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) {
      return errorResponse(404, "ApplicationForm not linked");
    }

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) {
      return errorResponse(404, "ApplicationForm not found");
    }

    if (!appFormDoc.page1) {
      return errorResponse(404, "Page 1 of the application form not found");
    }

    return successResponse(200, "Page 1 data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_1),
      page1: appFormDoc.page1,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

/* ------------------------------ helpers ------------------------------ */
function collectLicenseKeys(licenses?: ILicenseEntry[]): string[] {
  if (!Array.isArray(licenses)) return [];
  const keys: string[] = [];
  for (const lic of licenses) {
    if (lic.licenseFrontPhoto?.s3Key) keys.push(lic.licenseFrontPhoto.s3Key);
    if (lic.licenseBackPhoto?.s3Key) keys.push(lic.licenseBackPhoto.s3Key);
  }
  return keys;
}
