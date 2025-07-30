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

    const oldSin = (await params).sin;
    if (!oldSin || oldSin.length !== 9)
      return errorResponse(400, "Invalid SIN in URL");

    const formData = await req.formData();

    const page1Raw = formData.get("page1") as string;
    if (!page1Raw) return errorResponse(400, "Missing `page1` field");

    let page1;
    try {
      page1 = JSON.parse(page1Raw);
    } catch {
      return errorResponse(400, "Invalid JSON in `page1` field");
    }

    const newSin = page1?.sin;
    if (!newSin || newSin.length !== 9)
      return errorResponse(400, "Invalid SIN in page1");

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

    const currentDecryptedSin = appFormDoc.page1?.sinEncrypted
      ? decryptString(appFormDoc.page1.sinEncrypted)
      : null;

    const sinChanged = currentDecryptedSin !== newSin;
    const sinHash = hashString(newSin);
    const sinEncrypted = encryptString(newSin);
    const trackerId = onboardingDoc.id;

    const existingLicenses = appFormDoc.page1?.licenses || [];
    const updatedLicenses = [];

    // validate at least 5 years of address history
    if (!hasRecentAddressCoverage(page1.addresses)) {
      return errorResponse(
        400,
        "Total address history must cover at least 5 years."
      );
    }

    if (!Array.isArray(page1.licenses)) {
      return errorResponse(400, "`licenses` must be an array");
    }

    const firstLicense = page1.licenses[0];
    if (!firstLicense || firstLicense.licenseType !== "AZ") {
      return errorResponse(400, "The first license must be of type AZ.");
    }

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

    // Step 1: Validate presence, type, and size
    for (let i = 0; i < page1.licenses.length; i++) {
      const isFirst = i === 0;
      const frontFile = formData.get(`license_${i}_front`) as File | null;
      const backFile = formData.get(`license_${i}_back`) as File | null;
      const existing = existingLicenses[i];

      const hasFront = frontFile || existing?.licenseFrontPhoto?.url;
      const hasBack = backFile || existing?.licenseBackPhoto?.url;

      if (isFirst && (!hasFront || !hasBack)) {
        if (!hasFront)
          return errorResponse(400, `License #1 must include front photo.`);
        if (!hasBack)
          return errorResponse(400, `License #1 must include back photo.`);
      }

      if (frontFile) {
        if (!allowedImageTypes.includes(frontFile.type)) {
          return errorResponse(
            400,
            `License #${i + 1} front photo must be a valid image.`
          );
        }
        if (frontFile.size > MAX_IMAGE_SIZE) {
          return errorResponse(
            400,
            `License #${i + 1} front photo exceeds 10MB.`
          );
        }
      }

      if (backFile) {
        if (!allowedImageTypes.includes(backFile.type)) {
          return errorResponse(
            400,
            `License #${i + 1} back photo must be a valid image.`
          );
        }
        if (backFile.size > MAX_IMAGE_SIZE) {
          return errorResponse(
            400,
            `License #${i + 1} back photo exceeds 10MB.`
          );
        }
      }
    }

    // Step 2: Upload images
    for (let i = 0; i < page1.licenses.length; i++) {
      const input = page1.licenses[i];
      const existing = existingLicenses[i];

      const license = {
        ...input,
        licenseFrontPhoto: existing?.licenseFrontPhoto || null,
        licenseBackPhoto: existing?.licenseBackPhoto || null,
      };

      const frontFile = formData.get(`license_${i}_front`) as File | null;
      const backFile = formData.get(`license_${i}_back`) as File | null;

      if (frontFile && frontFile.size > 0) {
        if (existing?.licenseFrontPhoto?.s3Key) {
          await deleteS3Objects([existing.licenseFrontPhoto.s3Key]);
        }

        const buffer = Buffer.from(await frontFile.arrayBuffer());
        const frontUpload = await uploadImageToS3({
          fileBuffer: buffer,
          fileType: frontFile.type,
          folder: `licenses/${trackerId}`,
        });

        license.licenseFrontPhoto = {
          url: frontUpload.url,
          s3Key: frontUpload.key,
        };
        uploadedKeys.push(frontUpload.key);
      }

      if (backFile && backFile.size > 0) {
        if (existing?.licenseBackPhoto?.s3Key) {
          await deleteS3Objects([existing.licenseBackPhoto.s3Key]);
        }

        const buffer = Buffer.from(await backFile.arrayBuffer());
        const backUpload = await uploadImageToS3({
          fileBuffer: buffer,
          fileType: backFile.type,
          folder: `licenses/${trackerId}`,
        });

        license.licenseBackPhoto = {
          url: backUpload.url,
          s3Key: backUpload.key,
        };
        uploadedKeys.push(backUpload.key);
      }

      updatedLicenses.push(license);
    }

    // Step 3: Save to DB
    page1.sinEncrypted = sinEncrypted;
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

    // Step 4: Update onboarding tracker
    if (sinChanged) {
      onboardingDoc.sinHash = sinHash;
      onboardingDoc.sinEncrypted = sinEncrypted;
    }

    onboardingDoc.status.currentStep = 2;
    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 1 updated", {
      onboardingTracker: onboardingDoc.toObject({ virtuals: true }),
      applicationForm: updatedForm.toObject({ virtuals: true }),
    });
  } catch (error) {
    console.error("Error updating application form:", error);
    return errorResponse(500, "Failed to update application form");
  }
}
