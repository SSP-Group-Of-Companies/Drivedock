import { encryptString, hashString } from "@/lib/utils/cryptoUtils";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import PreQualifications from "@/mongoose/models/Prequalifications";
import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { uploadImageToS3, deleteS3Objects } from "@/lib/utils/s3Upload";
import { HydratedDocument } from "mongoose";
import { IOnboardingTrackerDoc } from "@/types/onboardingTracker.type";
import { hasRecentAddressCoverage } from "@/lib/utils/hasMinimumAddressDuration";
import { COMPANIES } from "@/constants/companies";

export const config = {
  api: { bodyParser: false },
};

export async function POST(req: Request) {
  const uploadedKeys: string[] = [];
  let appFormDoc = null;
  let preQualDoc = null;
  let onboardingDoc: HydratedDocument<IOnboardingTrackerDoc> | null = null;

  try {
    await connectDB();
    const formData = await req.formData();

    const page1Raw = formData.get("applicationFormPage1") as string;
    const prequalRaw = formData.get("prequalifications") as string;
    const companyId = formData.get("companyId") as string;

    if (!page1Raw) {
      return errorResponse(400, "Missing applicationFormPage1");
    }
    if (!prequalRaw) {
      return errorResponse(400, "Missing prequalifications");
    }
    if (!companyId) {
      return errorResponse(400, "Missing companyId");
    }
    
    const isValidCompanyId = COMPANIES.some(c => c.id === companyId);
    if (!isValidCompanyId) {
      return errorResponse(400, "invalid company id");
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

    // validate at least 5 years of address history
    if (!hasRecentAddressCoverage(page1.addresses)) {
      return errorResponse(400, "Total address history must cover at least 5 years.");
    }

   // Step 1: Create onboardingDoc first so we get the ID
    onboardingDoc = await OnboardingTracker.create({
      sinHash,
      sinEncrypted: encryptString(sin),
      resumeExpiresAt: new Date(Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)),
      status: { currentStep: 1, completedStep: 0, completed: false },
      forms: {},
      companyId
    });
    const trackerId = onboardingDoc.id; // Use in S3 folder

     // Helper to abort and clean up onboarding doc
     const abortWithTrackerCleanup = async (status: number, message: string) => {
      if (uploadedKeys.length > 0) {
        await deleteS3Objects(uploadedKeys);
      }
      if (onboardingDoc?._id) {
        await OnboardingTracker.findByIdAndDelete(onboardingDoc._id);
      }
      return errorResponse(status, message);
    };
    
    // Step 2: Validate and upload license photos
    const updatedLicenses = [];

    if (!Array.isArray(page1.licenses)) {
      return abortWithTrackerCleanup(400, "`licenses` must be an array");
    }

    const firstLicense = page1.licenses[0];
    if (!firstLicense || firstLicense.licenseType !== "AZ") {
      return abortWithTrackerCleanup(400, "The first license must be of type AZ.");
    }

    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

    for (let i = 0; i < page1.licenses.length; i++) {
      const input = page1.licenses[i];
      const isFirst = i === 0;

      const frontFile = formData.get(`license_${i}_front`) as File | null;
      const backFile = formData.get(`license_${i}_back`) as File | null;

      if (frontFile) {
        if (!allowedImageTypes.includes(frontFile.type)) {
          return abortWithTrackerCleanup(400, `License #${i + 1} front photo must be an image.`);
        }
        if (frontFile.size > MAX_IMAGE_SIZE) {
          return abortWithTrackerCleanup(400, `License #${i + 1} front photo exceeds 10MB.`);
        }
      }

      if (backFile) {
        if (!allowedImageTypes.includes(backFile.type)) {
          return abortWithTrackerCleanup(400, `License #${i + 1} back photo must be an image.`);
        }
        if (backFile.size > MAX_IMAGE_SIZE) {
          return abortWithTrackerCleanup(400, `License #${i + 1} back photo exceeds 10MB.`);
        }
      }

      if (isFirst && (!frontFile || !backFile || frontFile.size === 0 || backFile.size === 0)) {
        return abortWithTrackerCleanup(400, "The first license must include both front and back photo.");
      }

      let licenseFrontPhoto = null;
      let licenseBackPhoto = null;

      if (frontFile && frontFile.size > 0) {
        const frontBuffer = Buffer.from(await frontFile.arrayBuffer());
        const frontUpload = await uploadImageToS3({
          fileBuffer: frontBuffer,
          fileType: frontFile.type,
          folder: `licenses/${trackerId}`,
        });
        uploadedKeys.push(frontUpload.key);
        licenseFrontPhoto = {
          url: frontUpload.url,
          s3Key: frontUpload.key,
        };
      }

      if (backFile && backFile.size > 0) {
        const backBuffer = Buffer.from(await backFile.arrayBuffer());
        const backUpload = await uploadImageToS3({
          fileBuffer: backBuffer,
          fileType: backFile.type,
          folder: `licenses/${trackerId}`,
        });
        uploadedKeys.push(backUpload.key);
        licenseBackPhoto = {
          url: backUpload.url,
          s3Key: backUpload.key,
        };
      }

      updatedLicenses.push({
        ...input,
        licenseFrontPhoto,
        licenseBackPhoto,
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

    return errorResponse(error);
  }
}
