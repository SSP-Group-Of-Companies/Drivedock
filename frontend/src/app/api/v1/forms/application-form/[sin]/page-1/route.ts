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

export const config = {
  api: { bodyParser: false },
};

export async function PATCH(
  req: Request,
  { params }: { params: { sin: string } }
) {
  try {
    await connectDB();

    const oldSin = params.sin;
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
    const uploadedKeys: string[] = [];

    if (!Array.isArray(page1.licenses)) {
      return errorResponse(400, "`licenses` must be an array");
    }

    // Step 1: Validate file presence before uploading
    for (let i = 0; i < page1.licenses.length; i++) {
      const existing = existingLicenses[i];
      const hasFront =
        formData.get(`license_${i}_front`) || existing?.licenseFrontPhoto?.url;
      const hasBack =
        formData.get(`license_${i}_back`) || existing?.licenseBackPhoto?.url;

      if (!hasFront || !hasBack) {
        if (!hasFront)
          return errorResponse(
            400,
            `License #${i + 1} is missing required front photo`
          );
        return errorResponse(
          400,
          `License #${i + 1} is missing required back photo`
        );
      }
    }

    // Step 2: Upload files and delete old ones if replaced
    for (let i = 0; i < page1.licenses.length; i++) {
      const input = page1.licenses[i];
      const existing = existingLicenses[i];

      const license = {
        ...input,
        licenseFrontPhoto: existing?.licenseFrontPhoto || null,
        licenseBackPhoto: existing?.licenseBackPhoto || null,
      };

      const frontFile = formData.get(`license_${i}_front`) as File;
      const backFile = formData.get(`license_${i}_back`) as File;

      // Handle front photo
      if (frontFile && frontFile.size > 0) {
        // Delete old photo if key exists
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

      // Handle back photo
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
          currentStep: 1,
          completed: false,
        },
      },
      { new: true }
    );

    if (!updatedForm) {
      await deleteS3Objects(uploadedKeys);
      return errorResponse(500, "Failed to update ApplicationForm");
    }

    // Step 4: Update tracker if needed
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
    console.error("Upload error:", error);
    return errorResponse(
      500,
      error instanceof Error ? error.message : "Internal server error"
    );
  }
}
