import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import {
  decryptString,
  encryptString,
  hashString,
} from "@/lib/utils/cryptoUtils";
import { uploadImageToS3, deleteS3Objects } from "@/lib/utils/s3Upload";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { hasRecentAddressCoverage } from "@/lib/utils/hasMinimumAddressDuration";
import { IPhoto } from "@/types/shared.types";
import { IApplicationFormPage1 } from "@/types/applicationForm.types";
import { isValidSIN, validateImageFile } from "@/lib/utils/validationUtils";
import { EStepPath } from "@/types/onboardingTracker.type";
import {
  buildTrackerContext,
  getHigherStep,
  onboardingExpired,
} from "@/lib/utils/onboardingUtils";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";

export const config = {
  api: { bodyParser: false },
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uploadedKeys: string[] = [];

  const cleanupUploadedKeys = async () => {
    if (uploadedKeys.length > 0) {
      await deleteS3Objects(uploadedKeys);
    }
  };

  try {
    await connectDB();

    const { id: onboardingId } = await params;

    if (!isValidObjectId(onboardingId))
      return errorResponse(400, "not a valid id");

    // Step 1: Lookup OnboardingTracker by ID
    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc)
      return errorResponse(404, "OnboardingTracker not found");

    // Step 2: Get and decrypt existing SIN
    const oldSin = decryptString(onboardingDoc.sinEncrypted);

    const formData = await req.formData();

    // Step 3: Parse and validate page1 data
    const page1Raw = formData.get("page1") as string;
    if (!page1Raw) return errorResponse(400, "Missing `page1` field");

    let page1: IApplicationFormPage1;
    try {
      page1 = JSON.parse(page1Raw);
    } catch {
      return errorResponse(400, "Invalid JSON in `page1` field");
    }

    const newSin = page1?.sin;
    if (!isValidSIN(newSin)) return errorResponse(400, "Invalid SIN in page1");

    // Step 4: Lookup ApplicationForm
    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // Step 5: Compare old and new SIN values
    const sinChanged = oldSin !== newSin;
    const sinHash = hashString(newSin);
    const sinEncrypted = encryptString(newSin);
    const trackerId = onboardingDoc.id;

    const existingLicenses = appFormDoc.page1?.licenses || [];
    const updatedLicenses = [];

    // Step 6: Address validation
    if (!hasRecentAddressCoverage(page1.addresses)) {
      return errorResponse(
        400,
        "Total address history must cover at least 5 years."
      );
    }

    // Step 7: License array & AZ check
    if (!Array.isArray(page1.licenses)) {
      return errorResponse(400, "`licenses` must be an array");
    }

    const firstLicense = page1.licenses[0];
    if (!firstLicense || firstLicense.licenseType !== "AZ") {
      return errorResponse(400, "The first license must be of type AZ.");
    }

    // Step 8: Validate and prepare SIN photo upload (if provided)
    const sinPhotoRaw = formData.get("sinPhoto");
    let sinPhotoUploadPromise: Promise<IPhoto> | null = null;

    if (sinPhotoRaw) {
      const result = validateImageFile(sinPhotoRaw, "SIN photo");
      if (!result.isValid) return errorResponse(400, result.errorMessage);

      const prevSinPhotoKey = appFormDoc.page1?.sinPhoto?.s3Key;
      if (prevSinPhotoKey) await deleteS3Objects([prevSinPhotoKey]);

      sinPhotoUploadPromise = (async () => {
        const buffer = Buffer.from(await result.safeFile.arrayBuffer());
        const upload = await uploadImageToS3({
          fileBuffer: buffer,
          fileType: result.safeFile.type,
          folder: `sin/${trackerId}`,
        });
        uploadedKeys.push(upload.key);
        return { url: upload.url, s3Key: upload.key };
      })();
    }

    // Step 9: Prepare license photo uploads
    const uploadTasks: Promise<void>[] = [];

    for (let i = 0; i < page1.licenses.length; i++) {
      const input = page1.licenses[i];
      const existing = existingLicenses[i];
      const isFirst = i === 0;

      const frontRaw = formData.get(`license_${i}_front`);
      const backRaw = formData.get(`license_${i}_back`);

      let frontFile: File | null = null;
      let backFile: File | null = null;

      if (frontRaw) {
        const result = validateImageFile(frontRaw, `License #${i + 1} front`);
        if (!result.isValid) return errorResponse(400, result.errorMessage);
        frontFile = result.safeFile;
      }

      if (backRaw) {
        const result = validateImageFile(backRaw, `License #${i + 1} back`);
        if (!result.isValid) return errorResponse(400, result.errorMessage);
        backFile = result.safeFile;
      }

      const hasFront = frontFile || existing?.licenseFrontPhoto?.url;
      const hasBack = backFile || existing?.licenseBackPhoto?.url;

      if (isFirst && (!hasFront || !hasBack)) {
        if (!hasFront)
          return errorResponse(400, "License #1 must include front photo.");
        if (!hasBack)
          return errorResponse(400, "License #1 must include back photo.");
      }

      const license = {
        ...input,
        licenseFrontPhoto: existing?.licenseFrontPhoto || null,
        licenseBackPhoto: existing?.licenseBackPhoto || null,
      };

      // Upload front
      if (frontFile && frontFile.size > 0) {
        if (existing?.licenseFrontPhoto?.s3Key) {
          await deleteS3Objects([existing.licenseFrontPhoto.s3Key]);
        }
        uploadTasks.push(
          (async () => {
            const buffer = Buffer.from(await frontFile.arrayBuffer());
            const upload = await uploadImageToS3({
              fileBuffer: buffer,
              fileType: frontFile.type,
              folder: `licenses/${trackerId}`,
            });
            uploadedKeys.push(upload.key);
            license.licenseFrontPhoto = {
              url: upload.url,
              s3Key: upload.key,
            };
          })()
        );
      }

      // Upload back
      if (backFile && backFile.size > 0) {
        if (existing?.licenseBackPhoto?.s3Key) {
          await deleteS3Objects([existing.licenseBackPhoto.s3Key]);
        }
        uploadTasks.push(
          (async () => {
            const buffer = Buffer.from(await backFile.arrayBuffer());
            const upload = await uploadImageToS3({
              fileBuffer: buffer,
              fileType: backFile.type,
              folder: `licenses/${trackerId}`,
            });
            uploadedKeys.push(upload.key);
            license.licenseBackPhoto = {
              url: upload.url,
              s3Key: upload.key,
            };
          })()
        );
      }

      updatedLicenses.push(license);
    }

    // Step 10: Execute uploads
    await Promise.all(uploadTasks);
    const sinPhoto = sinPhotoUploadPromise
      ? await sinPhotoUploadPromise
      : appFormDoc.page1?.sinPhoto;

    // Step 11: Save updated form
    page1.sinEncrypted = sinEncrypted;
    page1.sinPhoto = sinPhoto;
    delete page1.sin;

    const updatedForm = await ApplicationForm.findByIdAndUpdate(
      appFormId,
      {
        $set: {
          page1: { ...page1, licenses: updatedLicenses },
        },
      },
      { new: true }
    );

    if (!updatedForm) {
      await cleanupUploadedKeys();
      return errorResponse(500, "Failed to update ApplicationForm");
    }

    // Step 12: Update onboarding tracker
    if (sinChanged) {
      onboardingDoc.sinHash = sinHash;
      onboardingDoc.sinEncrypted = sinEncrypted;
    }

    onboardingDoc.status.currentStep = EStepPath.APPLICATION_PAGE_2;
    onboardingDoc.status.completedStep = getHigherStep(
      onboardingDoc.status.completedStep,
      EStepPath.APPLICATION_PAGE_1
    );
    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    // ✅ Success
    return successResponse(200, "ApplicationForm Page 1 updated", {
      onboardingContext: buildTrackerContext(
        onboardingDoc,
        EStepPath.APPLICATION_PAGE_1
      ),
      page1: updatedForm.page1,
    });
  } catch (error) {
    await cleanupUploadedKeys();
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

    return successResponse(200, "Page 1 data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc),
      page1: appFormDoc.page1,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
