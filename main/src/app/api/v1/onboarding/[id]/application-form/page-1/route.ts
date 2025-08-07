import { NextRequest } from "next/server";
import {
  decryptString,
  encryptString,
  hashString,
} from "@/lib/utils/cryptoUtils";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import {
  isValidSIN,
  isValidPhoneNumber,
  isValidEmail,
  isValidDOB,
} from "@/lib/utils/validationUtils";
import { hasRecentAddressCoverage } from "@/lib/utils/hasMinimumAddressDuration";
import {
  onboardingExpired,
  buildTrackerContext,
  advanceStatus,
} from "@/lib/utils/onboardingUtils";
import { deleteS3Objects, finalizePhoto } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import {
  IApplicationFormPage1,
  ILicenseEntry,
} from "@/types/applicationForm.types";
import { EStepPath } from "@/types/onboardingTracker.type";
import { isValidObjectId } from "mongoose";
import { parseJsonBody } from "@/lib/utils/reqParser";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId))
      return errorResponse(400, "Invalid onboarding ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc)
      return errorResponse(404, "Onboarding document not found");

    const oldSin = decryptString(onboardingDoc.sinEncrypted);

    const page1 = await parseJsonBody<IApplicationFormPage1>(req);

    const newSin = page1?.sin;
    if (!isValidSIN(newSin)) return errorResponse(400, "Invalid SIN");
    if (!isValidEmail(page1.email)) return errorResponse(400, "Invalid email");
    if (page1.phoneHome && !isValidPhoneNumber(page1.phoneHome))
      return errorResponse(400, "Invalid home phone");
    if (!isValidPhoneNumber(page1.phoneCell))
      return errorResponse(400, "Invalid cell phone");
    if (!isValidPhoneNumber(page1.emergencyContactPhone))
      return errorResponse(400, "Invalid emergency contact phone");
    if (!isValidDOB(page1.dob))
      return errorResponse(400, "Invalid date of birth");
    if (!hasRecentAddressCoverage(page1.addresses))
      return errorResponse(400, "Address history must cover 5 years");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    const sinChanged = oldSin !== newSin;
    const sinHash = hashString(newSin);
    const sinEncrypted = encryptString(newSin);
    const trackerId = onboardingDoc.id;

    if (!Array.isArray(page1.licenses))
      return errorResponse(400, "'licenses' must be an array");
    const firstLicense = page1.licenses[0];
    if (!firstLicense || firstLicense.licenseType !== "AZ")
      return errorResponse(400, "First license must be of type AZ");
    if (!firstLicense.licenseFrontPhoto || !firstLicense.licenseBackPhoto)
      return errorResponse(
        400,
        "First license must include both front and back photos"
      );

    // Step 1 — Update with TEMP FILES FIRST
    const tempLicenses: ILicenseEntry[] = page1.licenses.map((lic) => ({
      ...lic,
    }));
    const tempSinPhoto = page1.sinPhoto;

    const page1ToSave = {
      ...page1,
      sinEncrypted,
      sinPhoto: tempSinPhoto,
      licenses: tempLicenses,
    };
    delete (page1ToSave as any).sin;

    const updatedForm = await ApplicationForm.findByIdAndUpdate(
      appFormId,
      { $set: { page1: page1ToSave } },
      { new: true }
    );
    if (!updatedForm)
      return errorResponse(500, "Failed to update ApplicationForm");

    // Step 2a — Delete old S3 keys if they exist
    const tempPrefix = `${S3_TEMP_FOLDER}/`;
    const previousSinPhoto = appFormDoc.page1?.sinPhoto;
    const previousLicensePhotos = appFormDoc.page1?.licenses || [];

    const s3KeysToDelete: string[] = [];

    if (
      previousSinPhoto?.s3Key &&
      tempSinPhoto?.s3Key?.startsWith(tempPrefix) &&
      previousSinPhoto.s3Key !== tempSinPhoto.s3Key
    ) {
      s3KeysToDelete.push(previousSinPhoto.s3Key);
    }

    for (let i = 0; i < tempLicenses.length; i++) {
      const tempLic = tempLicenses[i];
      const prevLic = previousLicensePhotos[i];

      if (prevLic) {
        if (
          prevLic.licenseFrontPhoto?.s3Key &&
          tempLic.licenseFrontPhoto?.s3Key?.startsWith(tempPrefix) &&
          prevLic.licenseFrontPhoto.s3Key !== tempLic.licenseFrontPhoto.s3Key
        ) {
          s3KeysToDelete.push(prevLic.licenseFrontPhoto.s3Key);
        }

        if (
          prevLic.licenseBackPhoto?.s3Key &&
          tempLic.licenseBackPhoto?.s3Key?.startsWith(tempPrefix) &&
          prevLic.licenseBackPhoto.s3Key !== tempLic.licenseBackPhoto.s3Key
        ) {
          s3KeysToDelete.push(prevLic.licenseBackPhoto.s3Key);
        }
      }
    }

    // Step 2 — Only now finalize photos
    const finalizeTasks: (() => Promise<void>)[] = [];

    if (tempSinPhoto?.s3Key?.startsWith(tempPrefix)) {
      finalizeTasks.push(async () => {
        const finalized = await finalizePhoto(
          tempSinPhoto,
          `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.SIN_PHOTOS}/${trackerId}`
        );
        page1.sinPhoto = finalized;
      });
    }

    for (let i = 0; i < tempLicenses.length; i++) {
      const lic = tempLicenses[i];

      if (lic.licenseFrontPhoto?.s3Key?.startsWith(tempPrefix)) {
        finalizeTasks.push(async () => {
          lic.licenseFrontPhoto = await finalizePhoto(
            lic.licenseFrontPhoto!,
            `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.LICENSES}/${trackerId}`
          );
        });
      }

      if (lic.licenseBackPhoto?.s3Key?.startsWith(tempPrefix)) {
        finalizeTasks.push(async () => {
          lic.licenseBackPhoto = await finalizePhoto(
            lic.licenseBackPhoto!,
            `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.LICENSES}/${trackerId}`
          );
        });
      }

      if (i === 0 && (!lic.licenseFrontPhoto || !lic.licenseBackPhoto)) {
        throw new Error(
          "First license must include both front and back photos"
        );
      }
    }

    const finalizeResults = await Promise.allSettled(
      finalizeTasks.map((task) => task())
    );
    const failed = finalizeResults.find((r) => r.status === "rejected");
    if (failed) return errorResponse(500, "Failed to finalize uploaded photos");

    // Step 3 — Update with FINALIZED S3 KEYS
    const finalSave = await ApplicationForm.findByIdAndUpdate(
      appFormId,
      {
        $set: {
          "page1.sinPhoto": page1.sinPhoto,
          "page1.licenses": tempLicenses,
        },
      },
      { new: true }
    );
    if (!finalSave)
      return errorResponse(500, "Failed to update finalized photos");

    // Delete old S3 keys
    if (s3KeysToDelete.length > 0) {
      try {
        await deleteS3Objects(s3KeysToDelete);
      } catch (err) {
        console.error("Failed to delete old S3 keys:", err);
      }
    }

    // Update Tracker
    if (sinChanged) {
      onboardingDoc.sinHash = sinHash;
      onboardingDoc.sinEncrypted = sinEncrypted;
    }

    // Update onboarding tracker
    onboardingDoc.status = advanceStatus(
      onboardingDoc.status,
      EStepPath.APPLICATION_PAGE_1
    );
    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 1 updated", {
      onboardingContext: buildTrackerContext(
        onboardingDoc,
        EStepPath.APPLICATION_PAGE_1
      ),
      page1: finalSave.page1,
    });
  } catch (error) {
    console.error("PATCH /application-form/page-1 error:", error);
    return errorResponse(error);
  }
}

export const GET = async (
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
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

    if (onboardingExpired(onboardingDoc))
      return errorResponse(400, "Onboarding session expired");

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

    // update tracker current step
    onboardingDoc.status.currentStep = EStepPath.APPLICATION_PAGE_1;
    await onboardingDoc.save();

    return successResponse(200, "Page 1 data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc),
      page1: appFormDoc.page1,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
