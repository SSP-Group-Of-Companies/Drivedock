// src/app/api/v1/onboarding/application-form/route.ts
import { NextRequest } from "next/server";
import { encryptString, hashString } from "@/lib/utils/cryptoUtils";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import PreQualifications from "@/mongoose/models/Prequalifications";
import { finalizeAsset } from "@/lib/utils/s3Upload";
import { EStepPath, IOnboardingTrackerDoc } from "@/types/onboardingTracker.types";
import { ILicenseEntry } from "@/types/applicationForm.types";
import { HydratedDocument } from "mongoose";
import { hasRecentAddressCoverage } from "@/lib/utils/hasMinimumAddressDuration";
import { advanceProgress, buildTrackerContext, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { ES3Folder } from "@/types/aws.types";
import { ECountryCode, EFileMimeType, ELicenseType } from "@/types/shared.types";
import { isValidEmail, isValidPhoneNumber, isValidDOB, isValidSIN, isValidSINIssueDate, isValidGender } from "@/lib/utils/validationUtils";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { createOnboardingSessionAndCookie } from "@/lib/utils/auth/onboardingSession";
import { attachCookies } from "@/lib/utils/auth/attachCookie";
import { sendDriverPendingApprovalEmail } from "@/lib/mail/driver/sendDriverPendingApprovalEmail";
import sendSafetyInvitationNotificationEmail from "@/lib/mail/safety/sendSafetyInvitationNotificationEmail";
import { verifyTurnstileToken } from "@/lib/security/verifyTurnstile";

export async function POST(req: NextRequest) {
  await connectDB();
  let onboardingDoc: HydratedDocument<IOnboardingTrackerDoc> | null = null;
  let appFormDoc = null;
  let preQualDoc = null;

  try {
    const body = await req.json();
    const { applicationFormPage1: page1, prequalifications } = body;
    const { countryCode } = body as any;
    const token = page1.turnStileVerificationToken;
    if (!token) return errorResponse(400, `Turnstile verification failed`);
    const verificationResult = await verifyTurnstileToken(token);
    if (!verificationResult.ok) return errorResponse(400, `Turnstile verification failed`);

    if (!page1 || !prequalifications) return errorResponse(400, "Missing required fields. 'page1' and 'prequalifications' are required.");
    // Pre-approval: accept countryCode (CA/US) for validation branching
    if (!countryCode || !["CA", "US"].includes(String(countryCode))) return errorResponse(400, "Missing or invalid 'countryCode'.");

    const sin = page1.sin;
    if (!isValidSIN(sin)) return errorResponse(400, "Invalid SIN");

    if (!isValidEmail(page1.email)) return errorResponse(400, "Invalid email");
    if (page1.phoneHome && !isValidPhoneNumber(page1.phoneHome)) return errorResponse(400, "Invalid home phone");
    if (!isValidPhoneNumber(page1.phoneCell)) return errorResponse(400, "Invalid cell phone");
    if (!isValidPhoneNumber(page1.emergencyContactPhone)) return errorResponse(400, "Invalid emergency contact phone");
    if (page1.phoneCell === page1.emergencyContactPhone) return errorResponse(400, "cell phone and emergency contact phone cannot be the same");
    if (!isValidDOB(page1.dob)) return errorResponse(400, "Invalid DOB");
    if (!isValidSINIssueDate(page1.sinIssueDate)) return errorResponse(400, "Invalid SIN issue date");
    if (!isValidGender(page1.gender)) return errorResponse(400, "Invalid gender");
    if (!hasRecentAddressCoverage(page1.addresses)) return errorResponse(400, "Address history must cover 5 years");
    if (!page1.sinPhoto || !page1.sinPhoto.mimeType) return errorResponse(400, "SIN document is required and must be a PDF file");
    const sinMime = String(page1.sinPhoto.mimeType).toLowerCase();
    if (sinMime !== EFileMimeType.PDF) return errorResponse(400, "SIN document must be a PDF file");

    const licenses = page1.licenses;
    if (!Array.isArray(licenses) || licenses.length === 0) return errorResponse(400, "'licenses' must be a non-empty array");

    const firstLicense = licenses[0];
    if (firstLicense.licenseType !== ELicenseType.AZ) return errorResponse(400, "First license must be of type AZ");

    if (!firstLicense.licenseFrontPhoto || !firstLicense.licenseBackPhoto) return errorResponse(400, "First license must include both front and back photos");

    // Validate each license's photos are PDFs
    for (let i = 0; i < licenses.length; i++) {
      const lic = licenses[i];
      const idx = i + 1;

      if (lic.licenseFrontPhoto) {
        const mimeFront = String(lic.licenseFrontPhoto.mimeType || "").toLowerCase();
        if (mimeFront !== EFileMimeType.PDF) {
          return errorResponse(400, `License #${idx} front document must be a PDF file`);
        }
      }

      if (lic.licenseBackPhoto) {
        const mimeBack = String(lic.licenseBackPhoto.mimeType || "").toLowerCase();
        if (mimeBack !== EFileMimeType.PDF) {
          return errorResponse(400, `License #${idx} back document must be a PDF file`);
        }
      }
    }

    if (countryCode === ECountryCode.CA) {
      const { canCrossBorderUSA, hasFASTCard, statusInCanada } = prequalifications;
      if (typeof canCrossBorderUSA !== "boolean") return errorResponse(400, "'canCrossBorderUSA' is required for Canadian applicants");
      if (!statusInCanada) return errorResponse(400, "'statusInCanada' is required for Canadian applicants");

      // Only validate FAST card fields if they were provided (conditional logic)
      if (hasFASTCard !== undefined && typeof hasFASTCard !== "boolean") {
        return errorResponse(400, "'hasFASTCard' must be a boolean when provided");
      }
      if (prequalifications.eligibleForFASTCard !== undefined && typeof prequalifications.eligibleForFASTCard !== "boolean") {
        return errorResponse(400, "'eligibleForFASTCard' must be a boolean when provided");
      }

      // Validate SIN expiry date for Work Permit holders
      if (statusInCanada === "Work Permit") {
        if (!page1.sinExpiryDate) {
          return errorResponse(400, "SIN expiry date is required for Work Permit holders");
        }
        // Validate that expiry date is in the future
        const expiryDate = new Date(page1.sinExpiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate <= today) {
          return errorResponse(400, "SIN expiry date must be in the future");
        }
      }
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
      invitationApproved: false,
      // companyId is assigned at approval time
      // Store pre-approval country for validation/audit
      preApprovalCountryCode: countryCode,
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

    // Flatbed training is determined after company assignment at approval
    onboardingDoc.needsFlatbedTraining = false;
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

    try {
      // send notification email to safety team
      await sendSafetyInvitationNotificationEmail(req, {
        trackerId: String(onboardingDoc._id),
        firstName: page1.firstName,
        lastName: page1.lastName,
        email: page1.email,
        phone: page1.phoneCell,
      });
    } catch (err: any) {
      console.warn("sending email to safety failed", err);
    }

    try {
      // send notification email to driver
      await sendDriverPendingApprovalEmail(req, {
        trackerId: onboardingDoc.id,
        firstName: page1.firstName,
        lastName: page1.lastName,
        toEmail: page1.email,
      });
    } catch (err: any) {
      console.warn("sending email to driver failed", err);
    }

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
