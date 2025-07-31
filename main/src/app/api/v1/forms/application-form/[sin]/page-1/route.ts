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
import { validateImageFile } from "@/lib/utils/validationUtils";

export const config = {
  api: { bodyParser: false },
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ sin: string }> }
) {
  const uploadedKeys: string[] = [];

  const cleanupUploadedKeys = async () => {
    if (uploadedKeys.length > 0) {
      await deleteS3Objects(uploadedKeys);
    }
  };

  try {
    await connectDB();

    // Step 1: Validate SIN from URL
    const oldSin = (await params).sin;
    if (!oldSin || oldSin.length !== 9)
      return errorResponse(400, "Invalid SIN in URL");

    const formData = await req.formData();

    // Step 2: Parse and validate page1 data
    const page1Raw = formData.get("page1") as string;
    if (!page1Raw) return errorResponse(400, "Missing `page1` field");

    let page1: IApplicationFormPage1;
    try {
      page1 = JSON.parse(page1Raw);
    } catch {
      return errorResponse(400, "Invalid JSON in `page1` field");
    }

    const newSin = page1?.sin;
    if (!newSin || newSin.length !== 9)
      return errorResponse(400, "Invalid SIN in page1");

    // Step 3: Lookup existing onboarding & application documents
    const oldSinHash = hashString(oldSin);
    const onboardingDoc = await OnboardingTracker.findOne({
      sinHash: oldSinHash,
    });
    if (!onboardingDoc)
      return errorResponse(404, "OnboardingTracker not found");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // Step 4: Compute updated SIN values
    const currentDecryptedSin = appFormDoc.page1?.sinEncrypted
      ? decryptString(appFormDoc.page1.sinEncrypted)
      : null;

    const sinChanged = currentDecryptedSin !== newSin;
    const sinHash = hashString(newSin);
    const sinEncrypted = encryptString(newSin);
    const trackerId = onboardingDoc.id;

    const existingLicenses = appFormDoc.page1?.licenses || [];
    const updatedLicenses = [];

    // Step 5: Address validation
    if (!hasRecentAddressCoverage(page1.addresses)) {
      return errorResponse(
        400,
        "Total address history must cover at least 5 years."
      );
    }

    // Step 6: License array & AZ check
    if (!Array.isArray(page1.licenses)) {
      return errorResponse(400, "`licenses` must be an array");
    }

    const firstLicense = page1.licenses[0];
    if (!firstLicense || firstLicense.licenseType !== "AZ") {
      return errorResponse(400, "The first license must be of type AZ.");
    }

    // Step 7: Validate and prepare SIN photo upload (if provided)
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

    // Step 8: Prepare license photo uploads
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

      // Schedule upload for front photo
      if (frontFile && frontFile.size > 0) {
        if (existing?.licenseFrontPhoto?.s3Key) {
          await deleteS3Objects([existing.licenseFrontPhoto.s3Key]);
        }
        uploadTasks.push(
          (async () => {
            const buffer = Buffer.from(await frontFile!.arrayBuffer());
            const upload = await uploadImageToS3({
              fileBuffer: buffer,
              fileType: frontFile!.type,
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

      // Schedule upload for back photo
      if (backFile && backFile.size > 0) {
        if (existing?.licenseBackPhoto?.s3Key) {
          await deleteS3Objects([existing.licenseBackPhoto.s3Key]);
        }
        uploadTasks.push(
          (async () => {
            const buffer = Buffer.from(await backFile!.arrayBuffer());
            const upload = await uploadImageToS3({
              fileBuffer: buffer,
              fileType: backFile!.type,
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

    // Step 9: Execute all uploads
    await Promise.all(uploadTasks);
    const sinPhoto = sinPhotoUploadPromise
      ? await sinPhotoUploadPromise
      : appFormDoc.page1?.sinPhoto;

    // Step 10: Save updated form to DB
    page1.sinEncrypted = sinEncrypted;
    page1.sinPhoto = sinPhoto;
    delete page1.sin;

    const updatedForm = await ApplicationForm.findByIdAndUpdate(
      appFormId,
      {
        $set: {
          page1: { ...page1, licenses: updatedLicenses },
          currentStep: 2,
          completedStep: 1,
          completed: false,
        },
      },
      { new: true }
    );

    if (!updatedForm) {
      await cleanupUploadedKeys();
      return errorResponse(500, "Failed to update ApplicationForm");
    }

    // Step 11: Update onboarding tracker
    if (sinChanged) {
      onboardingDoc.sinHash = sinHash;
      onboardingDoc.sinEncrypted = sinEncrypted;
    }

    onboardingDoc.status.currentStep = 2;
    onboardingDoc.status.completedStep = Math.max(
      onboardingDoc.status.completedStep,
      2
    );
    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    // ✅ Success
    return successResponse(200, "ApplicationForm Page 1 updated", {
      onboardingTracker: onboardingDoc.toObject({ virtuals: true }),
      applicationForm: updatedForm.toObject({ virtuals: true }),
    });
  } catch (error) {
    await cleanupUploadedKeys();
    return errorResponse(error);
  }
}
