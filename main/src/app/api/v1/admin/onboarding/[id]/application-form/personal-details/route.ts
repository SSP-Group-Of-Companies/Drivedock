import { NextRequest } from "next/server";
import { decryptString, encryptString, hashString } from "@/lib/utils/cryptoUtils";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { isValidSIN, isValidPhoneNumber, isValidEmail, isValidDOB, isValidSINIssueDate, isValidGender } from "@/lib/utils/validationUtils";
import { hasRecentAddressCoverage } from "@/lib/utils/hasMinimumAddressDuration";
import { advanceProgress, buildTrackerContext, hasCompletedStep, isInvitationApproved, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { deleteS3Objects, finalizeAsset } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { IApplicationFormPage1, ILicenseEntry } from "@/types/applicationForm.types";
import { EStepPath } from "@/types/onboardingTracker.types";
import { isValidObjectId } from "mongoose";
import { parseJsonBody } from "@/lib/utils/reqParser";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import PreQualifications from "@/mongoose/models/Prequalifications";
import { guard } from "@/lib/utils/auth/authUtils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;

    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Invalid onboarding ID");
    }

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (!isInvitationApproved(onboardingDoc)) return errorResponse(400, "driver not yet approved for onboarding process");
    if (!hasCompletedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_1)) return errorResponse(401, "driver hasn't completed this step yet");

    const oldSin = decryptString(onboardingDoc.sinEncrypted);

    // unwrap the payload
    const body = await parseJsonBody<any>(req);
    const page1 = body?.personalDetails as IApplicationFormPage1 | undefined;
    if (!page1) return errorResponse(400, "Missing 'personalDetails' in request body");

    // Sanitize + basic validations (business rules for page1 only)
    const newSin = String(page1.sin ?? "").replace(/\D/g, "");
    if (!isValidSIN(newSin)) return errorResponse(400, "Invalid SIN");

    if (!isValidEmail(page1.email)) return errorResponse(400, "Invalid email");
    if (page1.phoneHome && !isValidPhoneNumber(page1.phoneHome)) return errorResponse(400, "Invalid home phone");
    if (!isValidPhoneNumber(page1.phoneCell)) return errorResponse(400, "Invalid cell phone");
    if (!isValidPhoneNumber(page1.emergencyContactPhone)) return errorResponse(400, "Invalid emergency contact phone");
    if (!isValidDOB(page1.dob)) return errorResponse(400, "Invalid date of birth");
    if (!isValidSINIssueDate(page1.sinIssueDate)) return errorResponse(400, "Invalid SIN issue date");
    if (!isValidGender(page1.gender)) return errorResponse(400, "Invalid gender");
    if (!hasRecentAddressCoverage(page1.addresses)) return errorResponse(400, "Address history must cover 5 years");

    // Validate SIN expiry date for Work Permit holders
    const preQualId = onboardingDoc.forms?.preQualification;
    if (preQualId) {
      const preQualDoc = await PreQualifications.findById(preQualId);
      if (preQualDoc && preQualDoc.statusInCanada === "Work Permit") {
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

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // check if driver has filled page1 first
    if (!appFormDoc.page1) return errorResponse(401, "driver hasn't filled in personal details yet");

    if (!Array.isArray(page1.licenses)) {
      return errorResponse(400, "'licenses' must be an array");
    }

    const firstLicense = page1.licenses[0];
    if (!firstLicense || firstLicense.licenseType !== "AZ") {
      return errorResponse(400, "First license must be of type AZ");
    }
    if (!firstLicense.licenseFrontPhoto || !firstLicense.licenseBackPhoto) {
      return errorResponse(400, "First license must include both front and back photos");
    }

    const sinChanged = oldSin !== newSin;
    const sinHash = hashString(newSin);
    const sinEncrypted = encryptString(newSin);
    const trackerId = onboardingDoc.id;

    // check if there's already an application with the same sin
    if (sinChanged) {
      const existingOnboarding = await OnboardingTracker.findOne({ sinHash });
      if (existingOnboarding) return errorResponse(400, "application with this sin already exists");
    }

    // ----------------------------------------------------------------
    // Capture ORIGINALS before we touch page1 (this was the bug)
    // ----------------------------------------------------------------
    const originalSinPhoto = appFormDoc.page1?.sinPhoto;
    const originalLicenses = appFormDoc.page1?.licenses ?? [];

    // Prepare temp copies from incoming payload
    const tempPrefix = `${S3_TEMP_FOLDER}/`;
    const tempLicenses: ILicenseEntry[] = page1.licenses.map((lic) => ({ ...lic }));
    const tempSinPhoto = page1.sinPhoto;

    // ----------------------------------------------------------------
    // Phase 1 — Write *only page1* subtree with TEMP (to validate shape)
    // ----------------------------------------------------------------
    const page1TempToSave: Omit<IApplicationFormPage1, "sin"> = {
      ...page1,
      sinEncrypted,
      sinPhoto: tempSinPhoto,
      licenses: tempLicenses,
    };

    appFormDoc.set("page1", page1TempToSave as any);
    await appFormDoc.validate(["page1"]);
    await appFormDoc.save({ validateBeforeSave: false }); // page1 holds TEMP keys right now

    // ----------------------------------------------------------------
    // Phase 2 — Finalize S3 files for page1 only
    // ----------------------------------------------------------------
    const finalizeTasks: (() => Promise<void>)[] = [];

    // After finalization completes, we will compare finalized vs originals to delete originals if replaced
    // Keep local working references to mutate
    const workingLicenses = tempLicenses;
    let workingSinPhoto = tempSinPhoto;

    if (workingSinPhoto?.s3Key?.startsWith(tempPrefix)) {
      finalizeTasks.push(async () => {
        const finalized = await finalizeAsset(workingSinPhoto!, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.SIN_PHOTOS}/${trackerId}`);
        workingSinPhoto = finalized;
      });
    }

    for (let i = 0; i < workingLicenses.length; i++) {
      const lic = workingLicenses[i];

      if (lic.licenseFrontPhoto?.s3Key?.startsWith(tempPrefix)) {
        finalizeTasks.push(async () => {
          lic.licenseFrontPhoto = await finalizeAsset(lic.licenseFrontPhoto!, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.LICENSES}/${trackerId}`);
        });
      }

      if (lic.licenseBackPhoto?.s3Key?.startsWith(tempPrefix)) {
        finalizeTasks.push(async () => {
          lic.licenseBackPhoto = await finalizeAsset(lic.licenseBackPhoto!, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.LICENSES}/${trackerId}`);
        });
      }

      if (i === 0 && (!lic.licenseFrontPhoto || !lic.licenseBackPhoto)) {
        throw new Error("First license must include both front and back photos");
      }
    }

    const finalizeResults = await Promise.allSettled(finalizeTasks.map((t) => t()));
    const failed = finalizeResults.find((r) => r.status === "rejected");
    if (failed) return errorResponse(500, "Failed to finalize uploaded photos");

    // ----------------------------------------------------------------
    // Phase 3 — Persist FINALIZED page1 only (re-validate page1 only)
    // ----------------------------------------------------------------
    appFormDoc.set("page1.sinPhoto", workingSinPhoto as any);
    appFormDoc.set("page1.licenses", workingLicenses as any);

    await appFormDoc.validate(["page1"]);
    await appFormDoc.save({ validateBeforeSave: false });

    // ----------------------------------------------------------------
    // Phase 4 — Collect and delete truly old keys (captured BEFORE overwrite)
    // ----------------------------------------------------------------
    const s3KeysToDelete: string[] = [];

    // SIN photo: if we had an original and it differs from the finalized one, delete original
    if (originalSinPhoto?.s3Key && workingSinPhoto?.s3Key && originalSinPhoto.s3Key !== workingSinPhoto.s3Key) {
      s3KeysToDelete.push(originalSinPhoto.s3Key);
    }

    // Licenses: compare per index & per side (front/back). If replaced, delete old key.
    const maxLen = Math.max(originalLicenses.length, workingLicenses.length);
    for (let i = 0; i < maxLen; i++) {
      const prevLic = originalLicenses[i];
      const newLic = workingLicenses[i];

      if (!prevLic || !newLic) continue;

      const prevFront = prevLic.licenseFrontPhoto?.s3Key;
      const newFront = newLic.licenseFrontPhoto?.s3Key;
      if (prevFront && newFront && prevFront !== newFront) {
        s3KeysToDelete.push(prevFront);
      }

      const prevBack = prevLic.licenseBackPhoto?.s3Key;
      const newBack = newLic.licenseBackPhoto?.s3Key;
      if (prevBack && newBack && prevBack !== newBack) {
        s3KeysToDelete.push(prevBack);
      }
    }

    if (s3KeysToDelete.length > 0) {
      try {
        await deleteS3Objects(s3KeysToDelete);
      } catch (err) {
        console.error("Failed to delete old S3 keys:", err);
        // non-fatal
      }
    }

    // ----------------------------------------------------------------
    // Phase 5 — Tracker updates (no cross-page validation)
    // ----------------------------------------------------------------
    if (sinChanged) {
      onboardingDoc.sinHash = sinHash;
      onboardingDoc.sinEncrypted = sinEncrypted;
    }
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.APPLICATION_PAGE_1);
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm personalDetails updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_1, true),
      personalDetails: appFormDoc.page1,
    });
  } catch (error) {
    console.error("PATCH /application-form/page-1 error:", error);
    return errorResponse(error);
  }
}

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;

    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    // Fetch onboarding tracker
    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");
    if (!isInvitationApproved(onboardingDoc)) return errorResponse(400, "driver not yet approved for onboarding process");
    if (!hasCompletedStep(onboardingDoc, EStepPath.APPLICATION_PAGE_1)) return errorResponse(401, "driver hasn't completed this step yet");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) {
      return errorResponse(404, "ApplicationForm not linked");
    }

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) {
      return errorResponse(404, "ApplicationForm not found");
    }

    if (!appFormDoc.page1) {
      return errorResponse(404, "personalDetails of the application form not found");
    }

    return successResponse(200, "personalDetails data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      personalDetails: appFormDoc.page1,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
