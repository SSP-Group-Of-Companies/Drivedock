import { encryptString, hashString } from "@/lib/utils/cryptoUtils";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import PreQualifications from "@/mongoose/models/Prequalifications";
import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { uploadImageToS3, deleteS3Objects } from "@/lib/utils/s3Upload";

export const config = {
  api: { bodyParser: false },
};

export async function POST(req: Request) {
  const uploadedKeys: string[] = [];
  let appFormDoc = null;
  let preQualDoc = null;
  let onboardingDoc = null;

  try {
    await connectDB();
    const formData = await req.formData();

    const page1Raw = formData.get("applicationFormPage1") as string;
    const prequalRaw = formData.get("prequalifications") as string;

    if (!page1Raw || !prequalRaw) {
      return errorResponse(400, "Missing form fields");
    }

    let page1, prequalifications;
    try {
      page1 = JSON.parse(page1Raw);
      prequalifications = JSON.parse(prequalRaw);
    } catch {
      return errorResponse(400, "Invalid JSON in request");
    }

    const sin = page1?.sin;
    if (!sin || typeof sin !== "string" || sin.length !== 9) {
      return errorResponse(400, "Invalid SIN");
    }

    const sinHash = hashString(sin);
    const existingTracker = await OnboardingTracker.findOne({ sinHash });
    if (existingTracker) {
      return errorResponse(400, "Application with this SIN already exists.");
    }

    // Step 1: Create onboardingDoc first
    onboardingDoc = await OnboardingTracker.create({
      sinHash,
      sinEncrypted: encryptString(sin),
      resumeExpiresAt: new Date(Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)),
      status: { currentStep: 1, completedStep: 0, completed: false },
      forms: {},
    });
    const trackerId = onboardingDoc.id; // used for S3 folder

    // Step 2: Process licenses
    const updatedLicenses = [];

    if (!Array.isArray(page1.licenses)) {
      return errorResponse(400, "`licenses` must be an array");
    }

    // First license must be AZ
    const firstLicense = page1.licenses[0];
    if (!firstLicense || firstLicense.licenseType !== "AZ") {
      return errorResponse(400, "The first license must be of type AZ.");
    }


    for (let i = 0; i < page1.licenses.length; i++) {
      const input = page1.licenses[i];
      const frontFile = formData.get(`license_${i}_front`) as File;
      const backFile = formData.get(`license_${i}_back`) as File;

      if (
        !frontFile ||
        !backFile ||
        frontFile.size === 0 ||
        backFile.size === 0
      ) {
        return errorResponse(
          400,
          `License #${i + 1} is missing front or back photo`
        );
      }

      const frontBuffer = Buffer.from(await frontFile.arrayBuffer());
      const backBuffer = Buffer.from(await backFile.arrayBuffer());

      const frontUpload = await uploadImageToS3({
        fileBuffer: frontBuffer,
        fileType: frontFile.type,
        folder: `licenses/${trackerId}`,
      });
      uploadedKeys.push(frontUpload.key);

      const backUpload = await uploadImageToS3({
        fileBuffer: backBuffer,
        fileType: backFile.type,
        folder: `licenses/${trackerId}`,
      });
      uploadedKeys.push(backUpload.key);

      updatedLicenses.push({
        ...input,
        licenseFrontPhoto: {
          url: frontUpload.url,
          s3Key: frontUpload.key,
        },
        licenseBackPhoto: {
          url: backUpload.url,
          s3Key: backUpload.key,
        },
      });
    }

    // Step 3: Save ApplicationForm
    page1.sinEncrypted = encryptString(sin);
    delete page1.sin;

    appFormDoc = new ApplicationForm({
      page1: { ...page1, licenses: updatedLicenses },
      currentStep: 2,
      completedStep: 1,
      completed: false,
    });
    await appFormDoc.save();

    // Step 4: Save PreQualifications
    preQualDoc = await PreQualifications.create({
      ...prequalifications,
      completed: true,
    });

    // Step 5: Update onboardingDoc
    onboardingDoc.forms = {
      preQualification: preQualDoc.id,
      driverApplication: appFormDoc.id,
    };
    onboardingDoc.status.completedStep = 1;
    await onboardingDoc.save();

    return successResponse(200, "Onboarding created successfully", {
      preQualifications: preQualDoc.toObject(),
      applicationForm: appFormDoc.toObject({ virtuals: true }),
      onboardingTracker: onboardingDoc.toObject({ virtuals: true }),
    });
  } catch (error) {
    // Cleanup
    if (uploadedKeys.length > 0) {
      await deleteS3Objects(uploadedKeys);
    }
    if (onboardingDoc?._id) await OnboardingTracker.findByIdAndDelete(onboardingDoc._id);
    if (preQualDoc?._id) await PreQualifications.findByIdAndDelete(preQualDoc._id);
    if (appFormDoc?._id) await ApplicationForm.findByIdAndDelete(appFormDoc._id);

    console.error(error);
    return errorResponse(500, error instanceof Error ? error.message : String(error));
  }
}
