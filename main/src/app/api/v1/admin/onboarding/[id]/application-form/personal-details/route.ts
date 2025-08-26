import { NextRequest } from "next/server";
import { decryptString, encryptString, hashString } from "@/lib/utils/cryptoUtils";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { isValidSIN, isValidPhoneNumber, isValidEmail, isValidDOB } from "@/lib/utils/validationUtils";
import { hasRecentAddressCoverage } from "@/lib/utils/hasMinimumAddressDuration";
import { advanceProgress, buildTrackerContext, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { deleteS3Objects, finalizePhoto } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { IApplicationFormPage1, ILicenseEntry } from "@/types/applicationForm.types";
import { EStepPath } from "@/types/onboardingTracker.types";
import { isValidObjectId } from "mongoose";
import { parseJsonBody } from "@/lib/utils/reqParser";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { guard } from "@/lib/auth/authUtils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;

    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Invalid onboarding ID");
    }

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");

    const oldSin = decryptString(onboardingDoc.sinEncrypted);

    // unwrap the payload
    const body = await parseJsonBody<any>(req);
    const page1 = body?.personalDetails as IApplicationFormPage1 | undefined;
    if (!page1) return errorResponse(400, "Missing 'presonalDetails' in request body");

    // Sanitize + basic validations (business rules for page1 only)
    const newSin = String(page1.sin ?? "").replace(/\D/g, "");
    if (!isValidSIN(newSin)) return errorResponse(400, "Invalid SIN");

    if (!isValidEmail(page1.email)) return errorResponse(400, "Invalid email");
    if (page1.phoneHome && !isValidPhoneNumber(page1.phoneHome)) return errorResponse(400, "Invalid home phone");
    if (!isValidPhoneNumber(page1.phoneCell)) return errorResponse(400, "Invalid cell phone");
    if (!isValidPhoneNumber(page1.emergencyContactPhone)) return errorResponse(400, "Invalid emergency contact phone");
    if (!isValidDOB(page1.dob)) return errorResponse(400, "Invalid date of birth");
    if (!hasRecentAddressCoverage(page1.addresses)) return errorResponse(400, "Address history must cover 5 years");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // check if driver has filled page1 first
    if (!appFormDoc.page1) return errorResponse(401, "driver hasn't filled in personal details yet");

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

    // ----------------------------------------------------------------
    // Phase 1 — Write *only page1* subtree, validate *only page1*
    // ----------------------------------------------------------------
    const tempLicenses: ILicenseEntry[] = page1.licenses.map((lic) => ({
      ...lic,
    }));
    const tempSinPhoto = page1.sinPhoto;

    const page1ToSave: Omit<IApplicationFormPage1, "sin"> = {
      ...page1,
      sinEncrypted,
      sinPhoto: tempSinPhoto,
      licenses: tempLicenses,
    };

    appFormDoc.set("page1", page1ToSave as any);
    // validate only page1
    await appFormDoc.validate(["page1"]);
    // Save without triggering full-document validation
    await appFormDoc.save({ validateBeforeSave: false });

    // ----------------------------------------------------------------
    // Phase 2 — Finalize S3 files for page1 only
    // ----------------------------------------------------------------
    const tempPrefix = `${S3_TEMP_FOLDER}/`;
    const previousSinPhoto = appFormDoc.page1?.sinPhoto;
    const previousLicensePhotos = appFormDoc.page1?.licenses || [];

    const s3KeysToDelete: string[] = [];

    // Collect old keys to delete (only if *replaced* by a new temp key)
    if (previousSinPhoto?.s3Key && tempSinPhoto?.s3Key?.startsWith(tempPrefix) && previousSinPhoto.s3Key !== tempSinPhoto.s3Key) {
      s3KeysToDelete.push(previousSinPhoto.s3Key);
    }

    for (let i = 0; i < tempLicenses.length; i++) {
      const tempLic = tempLicenses[i];
      const prevLic = previousLicensePhotos[i];

      if (prevLic) {
        if (prevLic.licenseFrontPhoto?.s3Key && tempLic.licenseFrontPhoto?.s3Key?.startsWith(tempPrefix) && prevLic.licenseFrontPhoto.s3Key !== tempLic.licenseFrontPhoto.s3Key) {
          s3KeysToDelete.push(prevLic.licenseFrontPhoto.s3Key);
        }

        if (prevLic.licenseBackPhoto?.s3Key && tempLic.licenseBackPhoto?.s3Key?.startsWith(tempPrefix) && prevLic.licenseBackPhoto.s3Key !== tempLic.licenseBackPhoto.s3Key) {
          s3KeysToDelete.push(prevLic.licenseBackPhoto.s3Key);
        }
      }
    }

    // Finalize page1 photos only
    const finalizeTasks: (() => Promise<void>)[] = [];

    if (tempSinPhoto?.s3Key?.startsWith(tempPrefix)) {
      finalizeTasks.push(async () => {
        const finalized = await finalizePhoto(tempSinPhoto, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.SIN_PHOTOS}/${trackerId}`);
        page1.sinPhoto = finalized;
      });
    }

    for (let i = 0; i < tempLicenses.length; i++) {
      const lic = tempLicenses[i];

      if (lic.licenseFrontPhoto?.s3Key?.startsWith(tempPrefix)) {
        finalizeTasks.push(async () => {
          lic.licenseFrontPhoto = await finalizePhoto(lic.licenseFrontPhoto!, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.LICENSES}/${trackerId}`);
        });
      }

      if (lic.licenseBackPhoto?.s3Key?.startsWith(tempPrefix)) {
        finalizeTasks.push(async () => {
          lic.licenseBackPhoto = await finalizePhoto(lic.licenseBackPhoto!, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.LICENSES}/${trackerId}`);
        });
      }

      if (i === 0 && (!lic.licenseFrontPhoto || !lic.licenseBackPhoto)) {
        throw new Error("First license must include both front and back photos");
      }
    }

    const finalizeResults = await Promise.allSettled(finalizeTasks.map((task) => task()));
    const failed = finalizeResults.find((r) => r.status === "rejected");
    if (failed) return errorResponse(500, "Failed to finalize uploaded photos");

    // ----------------------------------------------------------------
    // Phase 3 — Persist finalized page1 only (re-validate page1 only)
    // ----------------------------------------------------------------
    appFormDoc.set("page1.sinPhoto", page1.sinPhoto as any);
    appFormDoc.set("page1.licenses", tempLicenses as any);

    await appFormDoc.validate(["page1"]);
    await appFormDoc.save({ validateBeforeSave: false });

    // Best-effort delete of old temp keys
    if (s3KeysToDelete.length > 0) {
      try {
        await deleteS3Objects(s3KeysToDelete);
      } catch (err) {
        console.error("Failed to delete old S3 keys:", err);
      }
    }

    // ----------------------------------------------------------------
    // Phase 4 — Tracker updates (no cross-page validation)
    // ----------------------------------------------------------------
    if (sinChanged) {
      onboardingDoc.sinHash = sinHash;
      onboardingDoc.sinEncrypted = sinEncrypted;
    }
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.APPLICATION_PAGE_1);
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm personalDetails updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_1, true),
      personalDetails: appFormDoc.page1,
    });
  } catch (error) {
    console.error("PATCH /application-form/page-1 error:", error);
    return errorResponse(error);
  }
}

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;

    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    // Fetch onboarding tracker
    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) {
      return errorResponse(404, "Onboarding document not found");
    }

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) {
      return errorResponse(404, "ApplicationForm not linked");
    }

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) {
      return errorResponse(404, "ApplicationForm not found");
    }

    if (!appFormDoc.page1) {
      return errorResponse(404, "personalDetails of the application form not found");
    }

    return successResponse(200, "personalDetails data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      personalDetails: appFormDoc.page1,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
