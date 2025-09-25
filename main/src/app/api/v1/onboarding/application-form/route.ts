import { NextRequest } from "next/server";
import { encryptString, hashString } from "@/lib/utils/cryptoUtils";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import PreQualifications from "@/mongoose/models/Prequalifications";
import { finalizeAsset } from "@/lib/utils/s3Upload";
import { COMPANIES, ECompanyId, needsFlatbedTraining } from "@/constants/companies";
import { EStepPath, ICreateOnboardingPayload, IOnboardingTrackerDoc } from "@/types/onboardingTracker.types";
import { ECompanyApplicationType } from "@/constants/companies";
import { ILicenseEntry } from "@/types/applicationForm.types";
import { HydratedDocument } from "mongoose";
import { hasRecentAddressCoverage } from "@/lib/utils/hasMinimumAddressDuration";
import { advanceProgress, buildTrackerContext, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { ES3Folder } from "@/types/aws.types";
import { ECountryCode, ELicenseType } from "@/types/shared.types";
import { isValidEmail, isValidPhoneNumber, isValidDOB, isValidSIN, isValidSINIssueDate, isValidGender } from "@/lib/utils/validationUtils";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { createOnboardingSessionAndCookie } from "@/lib/utils/auth/onboardingSession";
import { attachCookies } from "@/lib/utils/auth/attachCookie";

export async function POST(req: NextRequest) {
  await connectDB();
  let onboardingDoc: HydratedDocument<IOnboardingTrackerDoc> | null = null;
  let appFormDoc = null;
  let preQualDoc = null;

  try {
    const { applicationFormPage1: page1, prequalifications, companyId, applicationType }: ICreateOnboardingPayload = await req.json();

    if (!page1 || !prequalifications || !companyId) return errorResponse(400, "Missing required fields. 'page1', 'prequalifications', and 'companyId' are required.");

    if (companyId === ECompanyId.SSP_CA && (!applicationType || !Object.values(ECompanyApplicationType).includes(applicationType))) {
      return errorResponse(400, "Invalid or missing application type for SSP-Canada.");
    }

    const company = COMPANIES.find((c) => c.id === companyId);
    if (!company) return errorResponse(400, "Invalid company id");

    const sin = page1.sin;
    if (!isValidSIN(sin)) return errorResponse(400, "Invalid SIN");

    if (!isValidEmail(page1.email)) return errorResponse(400, "Invalid email");
    if (page1.phoneHome && !isValidPhoneNumber(page1.phoneHome)) return errorResponse(400, "Invalid home phone");
    if (!isValidPhoneNumber(page1.phoneCell)) return errorResponse(400, "Invalid cell phone");
    if (!isValidPhoneNumber(page1.emergencyContactPhone)) return errorResponse(400, "Invalid emergency contact phone");
    if (!isValidDOB(page1.dob)) return errorResponse(400, "Invalid DOB");
    if (!isValidSINIssueDate(page1.sinIssueDate)) return errorResponse(400, "Invalid SIN issue date");
    if (!isValidGender(page1.gender)) return errorResponse(400, "Invalid gender");
    if (!hasRecentAddressCoverage(page1.addresses)) return errorResponse(400, "Address history must cover 5 years");

    const licenses = page1.licenses;
    if (!Array.isArray(licenses) || licenses.length === 0) return errorResponse(400, "'licenses' must be a non-empty array");

    const firstLicense = licenses[0];
    if (firstLicense.licenseType !== ELicenseType.AZ) return errorResponse(400, "First license must be of type AZ");

    if (!firstLicense.licenseFrontPhoto || !firstLicense.licenseBackPhoto) return errorResponse(400, "First license must include both front and back photos");

    if (company.countryCode === ECountryCode.CA) {
      const { canCrossBorderUSA, hasFASTCard } = prequalifications;
      if (typeof canCrossBorderUSA !== "boolean") return errorResponse(400, "'canCrossBorderUSA' is required for Canadian applicants");
      if (typeof hasFASTCard !== "boolean") return errorResponse(400, "'hasFASTCard' is required for Canadian applicants");
    }

    const sinHash = hashString(sin);
    const existing = await OnboardingTracker.findOne({ sinHash });
    if (existing) return errorResponse(400, "Application with this SIN already exists");

    onboardingDoc = await OnboardingTracker.create({
      sinHash,
      sinEncrypted: encryptString(sin),
      resumeExpiresAt: nextResumeExpiry(),
      status: {
        currentStep: EStepPath.PRE_QUALIFICATIONS,
        completedStep: EStepPath.PRE_QUALIFICATIONS,
        completed: false,
      },
      companyId,
      ...(companyId === ECompanyId.SSP_CA && { applicationType }),
      forms: {},
    });

    // Save temporary S3 refs
    const page1ToSave = {
      ...page1,
      sinEncrypted: encryptString(sin),
      licenses,
    };
    delete (page1ToSave as any).sin;

    appFormDoc = await ApplicationForm.create({ page1: page1ToSave });
    preQualDoc = await PreQualifications.create({
      ...prequalifications,
      completed: true,
    });

    onboardingDoc.forms = {
      driverApplication: appFormDoc.id,
      preQualification: preQualDoc.id,
    };
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.APPLICATION_PAGE_1);

    // check if flatbed training is required
    onboardingDoc.needsFlatbedTraining = needsFlatbedTraining(companyId, applicationType, prequalifications.flatbedExperience);
    await onboardingDoc.save();

    // Finalize files only after successful DB save
    const trackerId = onboardingDoc.id;
    const movedKeys: string[] = [];

    // Finalize SIN photo
    const finalizedSinPhoto = await finalizeAsset(page1.sinPhoto, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.SIN_PHOTOS}/${trackerId}`);
    movedKeys.push(finalizedSinPhoto.s3Key);

    const tempPrefix = `${S3_TEMP_FOLDER}/`;
    // Finalize license photos
    const finalizedLicenses: ILicenseEntry[] = await Promise.all(
      licenses.map(async (lic) => {
        const updated: ILicenseEntry = { ...lic };

        if (lic.licenseFrontPhoto?.s3Key?.startsWith(tempPrefix)) {
          updated.licenseFrontPhoto = await finalizeAsset(lic.licenseFrontPhoto, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.LICENSES}/${trackerId}`);
          movedKeys.push(updated.licenseFrontPhoto.s3Key);
        }

        if (lic.licenseBackPhoto?.s3Key?.startsWith(tempPrefix)) {
          updated.licenseBackPhoto = await finalizeAsset(lic.licenseBackPhoto, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.LICENSES}/${trackerId}`);
          movedKeys.push(updated.licenseBackPhoto.s3Key);
        }

        return updated;
      })
    );

    // Update with finalized photos
    const updatedForm = await ApplicationForm.findByIdAndUpdate(
      appFormDoc._id,
      {
        $set: {
          "page1.sinPhoto": finalizedSinPhoto,
          "page1.licenses": finalizedLicenses,
        },
      },
      { new: true }
    );

    // Create (or reuse) a 6h session and issue cookie
    const { setCookie } = await createOnboardingSessionAndCookie(String(onboardingDoc._id));

    const res = successResponse(200, "Onboarding created successfully", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_1),
      preQualifications: preQualDoc.toObject(),
      applicationForm: updatedForm?.toObject({ virtuals: true }),
    });

    return attachCookies(res, setCookie);
  } catch (error) {
    // Cleanup
    if (appFormDoc?._id) await ApplicationForm.findByIdAndDelete(appFormDoc._id);
    if (preQualDoc?._id) await PreQualifications.findByIdAndDelete(preQualDoc._id);
    if (onboardingDoc?._id) await OnboardingTracker.findByIdAndDelete(onboardingDoc._id);

    console.error("POST /onboarding error:", error);
    return errorResponse(error);
  }
}
