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
import { IPhoto } from "@/types/shared.types";
import { validateImageFile } from "@/lib/utils/validationUtils";
import {
  IApplicationFormPage1,
  ILicenseEntry,
} from "@/types/applicationForm.types";
import { IPreQualifications } from "@/types/preQualifications.types";

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

    if (!page1Raw) return errorResponse(400, "Missing applicationFormPage1");
    if (!prequalRaw) return errorResponse(400, "Missing prequalifications");
    if (!companyId) return errorResponse(400, "Missing companyId");

    const isValidCompanyId = COMPANIES.some((c) => c.id === companyId);
    if (!isValidCompanyId) return errorResponse(400, "Invalid company id");

    let page1: IApplicationFormPage1, prequalifications: IPreQualifications;
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!page1.email || !emailRegex.test(page1.email)) {
      return errorResponse(400, "Invalid email format");
    }

    // Validate phone numbers (must be at least 10 digits, numbers only)
    const phoneRegex = /^\d{10,}$/;
    if (!page1.phoneHome || !phoneRegex.test(page1.phoneHome)) {
      return errorResponse(400, "Invalid home phone number format");
    }
    if (!page1.phoneCell || !phoneRegex.test(page1.phoneCell)) {
      return errorResponse(400, "Invalid cell phone number format");
    }
    if (
      !page1.emergencyContactPhone ||
      !phoneRegex.test(page1.emergencyContactPhone)
    ) {
      return errorResponse(
        400,
        "Invalid emergency contact phone number format"
      );
    }

    // Validate date of birth (must be reasonable age)
    const dob = new Date(page1.dob);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    if (isNaN(dob.getTime()) || age < 18 || age > 100) {
      return errorResponse(400, "Invalid date of birth");
    }

    const sinHash = hashString(sin);
    const existingTracker = await OnboardingTracker.findOne({ sinHash });
    if (existingTracker) {
      return errorResponse(400, "Application with this SIN already exists.");
    }

    if (!hasRecentAddressCoverage(page1.addresses)) {
      return errorResponse(
        400,
        "Total address history must cover at least 5 years."
      );
    }

    // Step 1: Create OnboardingTracker
    onboardingDoc = await OnboardingTracker.create({
      sinHash,
      sinEncrypted: encryptString(sin),
      resumeExpiresAt: new Date(
        Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
      ),
      status: { currentStep: 1, completedStep: 0, completed: false },
      forms: {},
      companyId,
    });
    const trackerId = onboardingDoc.id;

    const abortWithTrackerCleanup = async (status: number, message: string) => {
      if (uploadedKeys.length > 0) await deleteS3Objects(uploadedKeys);
      if (onboardingDoc?._id)
        await OnboardingTracker.findByIdAndDelete(onboardingDoc._id);
      return errorResponse(status, message);
    };

    // ✅ Step 2–3: Upload sinPhoto and license photos in parallel
    const uploadTasks: Promise<void>[] = [];
    const updatedLicenses: ILicenseEntry[] = [];

    // Validate sin photo
    const sinPhotoRaw = formData.get("sinPhoto");
    const sinPhotoResult = validateImageFile(sinPhotoRaw, "sin photo");

    if (!sinPhotoResult.isValid) {
      return abortWithTrackerCleanup(400, sinPhotoResult.errorMessage);
    }

    // Defer sin photo upload to its own promise, typed
    const sinPhotoUploadResultPromise: Promise<IPhoto> = (async () => {
      const buffer = Buffer.from(await sinPhotoResult.safeFile.arrayBuffer());
      const upload = await uploadImageToS3({
        fileBuffer: buffer,
        fileType: sinPhotoResult.safeFile.type,
        folder: `sin/${trackerId}`,
      });
      uploadedKeys.push(upload.key);
      return { url: upload.url, s3Key: upload.key };
    })();

    // Validate and prepare license uploads
    if (!Array.isArray(page1.licenses)) {
      return abortWithTrackerCleanup(400, "`licenses` must be an array");
    }

    const firstLicense = page1.licenses[0];
    if (!firstLicense || firstLicense.licenseType !== "AZ") {
      return abortWithTrackerCleanup(
        400,
        "The first license must be of type AZ."
      );
    }

    for (let i = 0; i < page1.licenses.length; i++) {
      const input = page1.licenses[i];
      const isFirst = i === 0;

      const frontRaw = formData.get(`license_${i}_front`);
      const backRaw = formData.get(`license_${i}_back`);

      let frontFile: File | null = null;
      let backFile: File | null = null;

      if (frontRaw) {
        const result = validateImageFile(frontRaw, `license ${i + 1} front`);
        if (!result.isValid) {
          return abortWithTrackerCleanup(400, result.errorMessage);
        }
        frontFile = result.safeFile;
      }

      if (backRaw) {
        const result = validateImageFile(backRaw, `license ${i + 1} back`);
        if (!result.isValid) {
          return abortWithTrackerCleanup(400, result.errorMessage);
        }
        backFile = result.safeFile;
      }

      if (
        isFirst &&
        (!frontFile || !backFile || frontFile.size === 0 || backFile.size === 0)
      ) {
        return abortWithTrackerCleanup(
          400,
          "The first license must include both front and back photo."
        );
      }

      updatedLicenses[i] = {
        ...input,
        licenseFrontPhoto: null as any,
        licenseBackPhoto: null as any,
      };

      if (frontFile) {
        uploadTasks.push(
          (async () => {
            const buffer = Buffer.from(await frontFile.arrayBuffer());
            const upload = await uploadImageToS3({
              fileBuffer: buffer,
              fileType: frontFile.type,
              folder: `licenses/${trackerId}`,
            });
            uploadedKeys.push(upload.key);
            updatedLicenses[i].licenseFrontPhoto = {
              url: upload.url,
              s3Key: upload.key,
            };
          })()
        );
      }

      if (backFile) {
        uploadTasks.push(
          (async () => {
            const buffer = Buffer.from(await backFile.arrayBuffer());
            const upload = await uploadImageToS3({
              fileBuffer: buffer,
              fileType: backFile.type,
              folder: `licenses/${trackerId}`,
            });
            uploadedKeys.push(upload.key);
            updatedLicenses[i].licenseBackPhoto = {
              url: upload.url,
              s3Key: upload.key,
            };
          })()
        );
      }
    }

    // Run license uploads concurrently
    await Promise.all(uploadTasks);

    // Wait for sin photo upload to finish
    const sinPhotoUploadResult = await sinPhotoUploadResultPromise;

    // ✅ Step 4: Save ApplicationForm
    page1.sinEncrypted = encryptString(sin);
    page1.sinPhoto = {
      url: sinPhotoUploadResult.url,
      s3Key: sinPhotoUploadResult.s3Key,
    };
    delete page1.sin;

    appFormDoc = new ApplicationForm({
      page1: { ...page1, licenses: updatedLicenses },
      currentStep: 2,
      completedStep: 1,
      completed: false,
    });
    await appFormDoc.save();

    // ✅ Step 5: Validate prequal fields for Canadian applicants
    const company = COMPANIES.find((c) => c.id === companyId);
    if (!company) {
      return abortWithTrackerCleanup(400, "Invalid companyId provided");
    }
    const isCanadian = company.countryCode === "CA";

    if (isCanadian) {
      const { canCrossBorderUSA, hasFASTCard } = prequalifications;
      if (typeof canCrossBorderUSA !== "boolean") {
        return abortWithTrackerCleanup(
          400,
          "Field 'canCrossBorderUSA' is required for Canadian applicants"
        );
      }
      if (typeof hasFASTCard !== "boolean") {
        return abortWithTrackerCleanup(
          400,
          "Field 'hasFASTCard' is required for Canadian applicants"
        );
      }
    }

    // ✅ Now save PreQualifications
    preQualDoc = await PreQualifications.create({
      ...prequalifications,
      completed: true,
    });

    // ✅ Step 6: Update onboardingDoc
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
    if (uploadedKeys.length > 0) await deleteS3Objects(uploadedKeys);
    if (onboardingDoc?._id)
      await OnboardingTracker.findByIdAndDelete(onboardingDoc._id);
    if (preQualDoc?._id)
      await PreQualifications.findByIdAndDelete(preQualDoc._id);
    if (appFormDoc?._id)
      await ApplicationForm.findByIdAndDelete(appFormDoc._id);

    console.error("Error creating application form:", error);
    return errorResponse(500, "Failed to create application form");
  }
}
