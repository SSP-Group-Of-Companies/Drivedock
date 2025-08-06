import { NextRequest } from "next/server";
import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import {
  AppError,
  errorResponse,
  successResponse,
} from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { IApplicationFormPage4 } from "@/types/applicationForm.types";
import { advanceStatus, buildTrackerContext, hasCompletedStep, onboardingExpired } from "@/lib/utils/onboardingUtils";
import { deleteS3Objects, finalizePhoto } from "@/lib/utils/s3Upload";
import { COMPANIES } from "@/constants/companies";
import { EStepPath } from "@/types/onboardingTracker.type";
import { ECountryCode, IPhoto } from "@/types/shared.types";
import { isValidObjectId } from "mongoose";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();
    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "Invalid onboarding ID");

    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    if (!hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_3))
      return errorResponse(400, "Please complete previous step first");

    const body: IApplicationFormPage4 = await req.json();
    const company = COMPANIES.find((c) => c.id === onboardingDoc.companyId);
    if (!company) throw new AppError(400, "Invalid company assigned to applicant");
    const isCanadian = company.countryCode === ECountryCode.CA;
    const isUS = company.countryCode === ECountryCode.US;

    const employeeProvided = !!body.employeeNumber?.trim();
    const businessProvided = !!body.businessNumber?.trim();
    const hstProvided = !!body.hstNumber?.trim();
    const incorporateProvided = (body.incorporatePhotos ?? [])?.length > 0;
    const bankingProvided = (body.bankingInfoPhotos ?? [])?.length > 0;
    const hstPhotosProvided = (body.hstPhotos ?? [])?.length > 0;
    const anyBusinessProvided =
      employeeProvided || businessProvided || hstProvided || incorporateProvided || bankingProvided || hstPhotosProvided;
    const allBusinessProvided =
      employeeProvided &&
      businessProvided &&
      hstProvided &&
      (incorporateProvided || (appFormDoc.page4?.incorporatePhotos?.length ?? 0) > 0) &&
      (bankingProvided || (appFormDoc.page4?.bankingInfoPhotos?.length ?? 0) > 0) &&
      (hstPhotosProvided || (appFormDoc.page4?.hstPhotos?.length ?? 0) > 0);

    if (anyBusinessProvided && !allBusinessProvided) {
      throw new AppError(400, "All business section fields and files must be provided if any are.");
    }

    if (isCanadian) {
      const requiredFields: (keyof IApplicationFormPage4)[] = [
        "healthCardPhotos",
        "passportPhotos",
        "usVisaPhotos",
        "prPermitCitizenshipPhotos",
      ];
      for (const field of requiredFields) {
        const nowVal = body[field];
        const oldVal = appFormDoc.page4?.[field];

        const hasNow = Array.isArray(nowVal) && nowVal.length > 0;
        const hasOld = Array.isArray(oldVal) && oldVal.length > 0;

        if (!hasNow && !hasOld) {
          throw new AppError(400, `${field} required for Canadian applicants.`);
        }
      }
    }

    if (isUS) {
      const medNow = body.medicalCertificationPhotos?.length ?? 0;
      const medOld = appFormDoc.page4?.medicalCertificationPhotos?.length ?? 0;
      if (medNow === 0 && medOld === 0) throw new AppError(400, "Medical certificate required for US drivers");

      const passport = (body.passportPhotos?.length ?? 0) + (appFormDoc.page4?.passportPhotos?.length ?? 0);
      const pr = (body.prPermitCitizenshipPhotos?.length ?? 0) + (appFormDoc.page4?.prPermitCitizenshipPhotos?.length ?? 0);
      if (passport === 0 && pr === 0) throw new AppError(400, "US drivers must provide passport or PR/citizenship photo");
    }

    if (isCanadian && body.fastCard) {
      const { fastCardNumber, fastCardExpiry, fastCardFrontPhoto, fastCardBackPhoto } = body.fastCard;
      const oldFront = appFormDoc.page4?.fastCard?.fastCardFrontPhoto;
      const oldBack = appFormDoc.page4?.fastCard?.fastCardBackPhoto;

      if (!fastCardNumber?.trim() || !fastCardExpiry)
        throw new AppError(400, "Fast card must have number and expiry if provided");

      const hasFront = fastCardFrontPhoto?.s3Key || oldFront?.s3Key;
      const hasBack = fastCardBackPhoto?.s3Key || oldBack?.s3Key;
      if (!hasFront || !hasBack)
        throw new AppError(400, "Fast card must include both front and back photo if provided");
    }

    // Phase 1: Save with temp S3 keys first
    appFormDoc.page4 = body;
    await appFormDoc.save();

    // Phase 2a: Track old keys to delete if replaced
    const tempPrefix = `${S3_TEMP_FOLDER}/`;
    const s3KeysToDelete: string[] = [];

    function collectOldKeys(_: keyof IApplicationFormPage4, newPhotos: IPhoto[] = [], oldPhotos: IPhoto[] = []) {
      for (let i = 0; i < newPhotos.length; i++) {
        const newPhoto = newPhotos[i];
        const oldPhoto = oldPhotos[i];

        if (
          newPhoto?.s3Key?.startsWith(tempPrefix) &&
          oldPhoto?.s3Key &&
          oldPhoto.s3Key !== newPhoto.s3Key
        ) {
          s3KeysToDelete.push(oldPhoto.s3Key);
        }
      }
    }

    const fieldsToFinalize = Object.entries(body).filter(
      ([_, val]) => Array.isArray(val) && val.every((p) => p?.s3Key)
    ) as [keyof IApplicationFormPage4, IPhoto[]][];

    for (const [field, newPhotos] of fieldsToFinalize) {
      const oldPhotos = appFormDoc.page4?.[field] as IPhoto[] | undefined;
      if (Array.isArray(newPhotos) && Array.isArray(oldPhotos)) {
        collectOldKeys(field, newPhotos, oldPhotos);
      }
    }

    if (
      body.fastCard?.fastCardFrontPhoto?.s3Key?.startsWith(tempPrefix) &&
      appFormDoc.page4?.fastCard?.fastCardFrontPhoto?.s3Key &&
      body.fastCard.fastCardFrontPhoto.s3Key !== appFormDoc.page4.fastCard.fastCardFrontPhoto.s3Key
    ) {
      s3KeysToDelete.push(appFormDoc.page4.fastCard.fastCardFrontPhoto.s3Key);
    }

    if (
      body.fastCard?.fastCardBackPhoto?.s3Key?.startsWith(tempPrefix) &&
      appFormDoc.page4?.fastCard?.fastCardBackPhoto?.s3Key &&
      body.fastCard.fastCardBackPhoto.s3Key !== appFormDoc.page4.fastCard.fastCardBackPhoto.s3Key
    ) {
      s3KeysToDelete.push(appFormDoc.page4.fastCard.fastCardBackPhoto.s3Key);
    }

    // Phase 2b: Finalize photos (if from temp)
    const finalizeTasks: (() => Promise<void>)[] = [];

    for (const [field, photos] of fieldsToFinalize) {
      for (let i = 0; i < photos.length; i++) {
        if (photos[i].s3Key?.startsWith(tempPrefix)) {
          finalizeTasks.push(async () => {
            photos[i] = await finalizePhoto(
              photos[i],
              `${S3_SUBMISSIONS_FOLDER}/${field}/${onboardingDoc.id}`
            );
          });
        }
      }
    }

    if (body.fastCard?.fastCardFrontPhoto?.s3Key?.startsWith(tempPrefix)) {
      finalizeTasks.push(async () => {
        body.fastCard!.fastCardFrontPhoto = await finalizePhoto(
          body.fastCard!.fastCardFrontPhoto!,
          `${S3_SUBMISSIONS_FOLDER}/fastCard/${onboardingDoc.id}`
        );
      });
    }

    if (body.fastCard?.fastCardBackPhoto?.s3Key?.startsWith(tempPrefix)) {
      finalizeTasks.push(async () => {
        body.fastCard!.fastCardBackPhoto = await finalizePhoto(
          body.fastCard!.fastCardBackPhoto!,
          `${S3_SUBMISSIONS_FOLDER}/fastCard/${onboardingDoc.id}`
        );
      });
    }

    const finalizeResults = await Promise.allSettled(finalizeTasks.map((fn) => fn()));
    const failed = finalizeResults.find((r) => r.status === "rejected");
    if (failed) return errorResponse(500, "Failed to finalize uploaded files");

    // Phase 3: Save again with updated s3 keys
    await ApplicationForm.findByIdAndUpdate(appFormId, { $set: { page4: appFormDoc.page4 } });

    // Delete old S3 files
    if (s3KeysToDelete.length > 0) {
      try {
        await deleteS3Objects(s3KeysToDelete);
      } catch (err) {
        console.error("Failed to delete old S3 files:", err);
      }
    }

    // Update onboarding tracker
    onboardingDoc.status = advanceStatus(
      onboardingDoc.status,
      EStepPath.APPLICATION_PAGE_4
    );
    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 4 updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.APPLICATION_PAGE_4),
      page4: appFormDoc.page4,
    });
  } catch (err) {
    return errorResponse(err);
  }
};



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

    if (!hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_3)) {
      return errorResponse(403, "Please complete previous step first");
    }

    // update tracker current step 
    onboardingDoc.status.currentStep = EStepPath.APPLICATION_PAGE_4;
    await onboardingDoc.save();

    return successResponse(200, "Page 4 data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc),
      page4: appFormDoc.page4,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
