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
import { uploadImageToS3, deleteS3Objects } from "@/lib/utils/s3Upload";
import { COMPANIES } from "@/constants/companies";
import { ECountryCode } from "@/types/shared.types";
import { validateImageFile } from "@/lib/utils/validationUtils";
import {
  advanceStatus,
  buildTrackerContext,
  hasCompletedStep,
  onboardingExpired,
} from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.type";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";

export const config = {
  api: { bodyParser: false },
};

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const uploadedKeys: string[] = [];
  const keysToDelete: string[] = [];
  const uploadTasks: Promise<void>[] = [];

  try {
    await connectDB();

    // 1. Params & basic checks
    const { id } = await params;

    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    const formData = await req.formData();
    const rawPage4 = formData.get("applicationFormPage4") as string;
    if (!rawPage4) {
      return errorResponse(400, "Missing form field: applicationFormPage4");
    }
    const body = JSON.parse(rawPage4) as IApplicationFormPage4;

    // 2. Load tracker & form
    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc)
      return errorResponse(404, "Onboarding document not found");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // check completed step
    if (!hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_3))
      return errorResponse(400, "please complete previous step first");

    // 3. Build fileGroups
    const photoFieldNames = [
      "incorporatePhotos",
      "bankingInfoPhotos",
      "hstPhotos",
      "healthCardPhotos",
      "passportPhotos",
      "usVisaPhotos",
      "prPermitCitizenshipPhotos",
      "medicalCertificationPhotos",
    ] as const;
    type PhotoFieldName = (typeof photoFieldNames)[number];

    const fileGroups: Record<PhotoFieldName, File[]> = {} as Record<
      PhotoFieldName,
      File[]
    >;
    for (const field of photoFieldNames) {
      fileGroups[field] = formData
        .getAll(field)
        .filter((f) => f instanceof File && f.size > 0) as File[];
    }

    const fastCardFrontFiles = formData
      .getAll("fastCardFrontPhoto")
      .filter((f) => f instanceof File && f.size > 0) as File[];
    const fastCardBackFiles = formData
      .getAll("fastCardBackPhoto")
      .filter((f) => f instanceof File && f.size > 0) as File[];

    // 4. Validation
    const company = COMPANIES.find((c) => c.id === onboardingDoc.companyId);
    if (!company)
      throw new AppError(400, "Invalid company assigned to applicant");

    const isCanadian = company.countryCode === ECountryCode.CA;
    const isUS = company.countryCode === ECountryCode.US;

    // 4a. Flag empty-but-checked
    for (const field of photoFieldNames) {
      if (formData.has(field) && fileGroups[field].length === 0) {
        throw new AppError(
          400,
          `${field} is checked but no files were provided.`
        );
      }
    }

    // 4b. Business cross-field rule
    const employeeProvided = !!body.employeeNumber?.trim();
    const businessProvided = !!body.businessNumber?.trim();
    const hstProvided = !!body.hstNumber?.trim();
    const incorporateProvided = fileGroups.incorporatePhotos.length > 0;
    const bankingProvided = fileGroups.bankingInfoPhotos.length > 0;
    const hstPhotosProvided = fileGroups.hstPhotos.length > 0;

    const anyBusinessSectionProvided =
      employeeProvided ||
      businessProvided ||
      hstProvided ||
      incorporateProvided ||
      bankingProvided ||
      hstPhotosProvided;

    const allBusinessSectionProvided =
      employeeProvided &&
      businessProvided &&
      hstProvided &&
      (incorporateProvided ||
        (appFormDoc.page4?.incorporatePhotos?.length ?? 0) > 0) &&
      (bankingProvided ||
        (appFormDoc.page4?.bankingInfoPhotos?.length ?? 0) > 0) &&
      (hstPhotosProvided || (appFormDoc.page4?.hstPhotos?.length ?? 0) > 0);

    if (anyBusinessSectionProvided && !allBusinessSectionProvided) {
      throw new AppError(
        400,
        "If any of employeeNumber, businessNumber, hstNumber, incorporatePhotos, bankingInfoPhotos, or hstPhotos are provided, then all must be provided."
      );
    }

    // 4c. Country-specific rules
    if (isCanadian) {
      const canadianReqs: [PhotoFieldName, string][] = [
        [
          "healthCardPhotos",
          "Health card photos are required for Canadian drivers.",
        ],
        [
          "passportPhotos",
          "Passport photos are required for Canadian drivers.",
        ],
        ["usVisaPhotos", "US Visa photos are required for Canadian drivers."],
        [
          "prPermitCitizenshipPhotos",
          "PR/Permit/Citizenship photos are required for Canadian drivers.",
        ],
      ];
      for (const [field, msg] of canadianReqs) {
        const providedNow = fileGroups[field].length > 0;
        const alreadySaved = (appFormDoc.page4?.[field]?.length ?? 0) > 0;
        if (!providedNow && !alreadySaved) throw new AppError(400, msg);
      }
    }

    if (isUS) {
      const medProvided = fileGroups.medicalCertificationPhotos.length > 0;
      const medSaved =
        (appFormDoc.page4?.medicalCertificationPhotos?.length ?? 0) > 0;
      if (!medProvided && !medSaved) {
        throw new AppError(
          400,
          "Medical Certificate photo is required for US drivers."
        );
      }

      const hasPassport =
        fileGroups.passportPhotos.length > 0 ||
        (appFormDoc.page4?.passportPhotos?.length ?? 0) > 0;
      const hasPR =
        fileGroups.prPermitCitizenshipPhotos.length > 0 ||
        (appFormDoc.page4?.prPermitCitizenshipPhotos?.length ?? 0) > 0;
      if (!hasPassport && !hasPR) {
        throw new AppError(
          400,
          "US drivers must provide either a Passport or a PR/Permit/Citizenship photo."
        );
      }
    }

    // 4d. Fast-card validation (Canadian only)
    if (isCanadian && body.fastCard) {
      const { fastCardNumber, fastCardExpiry } = body.fastCard;
      const existingFront = appFormDoc.page4?.fastCard?.fastCardFrontPhoto;
      const existingBack = appFormDoc.page4?.fastCard?.fastCardBackPhoto;

      if (!fastCardNumber?.trim() || !fastCardExpiry) {
        throw new AppError(
          400,
          "Fast card must have number and expiry if provided."
        );
      }

      const missingFront =
        fastCardFrontFiles.length === 0 && !existingFront?.s3Key;
      const missingBack =
        fastCardBackFiles.length === 0 && !existingBack?.s3Key;
      if (missingFront || missingBack) {
        throw new AppError(
          400,
          "Fast card is incomplete. Both front and back photo are required if fast card is provided."
        );
      }
    }

    // 5. UPLOAD phase
    for (const field of photoFieldNames) {
      const files = fileGroups[field];
      if (files.length === 0) continue;

      const key = field;
      const existingPhotos = appFormDoc.page4?.[key] ?? [];
      body[key] = [] as any;

      for (const photo of existingPhotos) {
        if (photo?.s3Key) keysToDelete.push(photo.s3Key);
      }

      for (const file of files) {
        uploadTasks.push(
          (async () => {
            const result = validateImageFile(file, field);
            if (!result.isValid) throw new Error(result.errorMessage);
            const buffer = Buffer.from(await result.safeFile.arrayBuffer());
            const { url, key: s3Key } = await uploadImageToS3({
              fileBuffer: buffer,
              fileType: result.safeFile.type,
              folder: `${field}/${onboardingDoc.id}`,
            });
            uploadedKeys.push(s3Key);
            (body[key] as any).push({ url, s3Key });
          })()
        );
      }
    }

    // Fast-card uploads
    if (body.fastCard) {
      body.fastCard.fastCardFrontPhoto =
        appFormDoc.page4?.fastCard?.fastCardFrontPhoto;
      body.fastCard.fastCardBackPhoto =
        appFormDoc.page4?.fastCard?.fastCardBackPhoto;

      const fastPairs: [
        File | undefined,
        "fastCardFrontPhoto" | "fastCardBackPhoto"
      ][] = [
          [fastCardFrontFiles[0], "fastCardFrontPhoto"],
          [fastCardBackFiles[0], "fastCardBackPhoto"],
        ];

      for (const [file, type] of fastPairs) {
        if (!file) continue;
        uploadTasks.push(
          (async () => {
            const result = validateImageFile(file, type);
            if (!result.isValid) throw new Error(result.errorMessage);
            const buffer = Buffer.from(await result.safeFile.arrayBuffer());
            const { url, key: s3Key } = await uploadImageToS3({
              fileBuffer: buffer,
              fileType: result.safeFile.type,
              folder: `fastCard/${onboardingDoc.id}`,
            });
            uploadedKeys.push(s3Key);
            body.fastCard![type] = { url, s3Key };

            const existing = appFormDoc.page4?.fastCard?.[type];
            if (existing?.s3Key) keysToDelete.push(existing.s3Key);
          })()
        );
      }
    }

    // finalize uploads & delete old
    await Promise.all(uploadTasks);

    //
    // 6. Persist **with rollback on failure**
    //
    try {
      appFormDoc.page4 = body;
      await appFormDoc.save();

      onboardingDoc.status = advanceStatus(
        onboardingDoc.status,
        EStepPath.APPLICATION_PAGE_4
      );
      onboardingDoc.resumeExpiresAt = new Date(
        Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
      );
      await onboardingDoc.save();
    } catch (saveErr) {
      // rollback *only* the newly uploaded files
      if (uploadedKeys.length) {
        await deleteS3Objects(uploadedKeys);
      }
      // bubble up to outer catch
      throw saveErr;
    }

    //
    // 7. Now that both saves succeeded, delete the old files
    //
    if (keysToDelete.length) {
      await deleteS3Objects(keysToDelete);
    }

    // 8. Success
    return successResponse(200, "ApplicationForm Page 4 updated", {
      onboardingContext: buildTrackerContext(
        onboardingDoc,
        EStepPath.APPLICATION_PAGE_4
      ),
      applicationForm: appFormDoc.toObject({ virtuals: true }),
    });
  } catch (error) {
    // ensure any in-flight uploads finish
    await Promise.allSettled(uploadTasks);

    // on any failure, only delete *new* uploads (old ones were never touched)
    if (uploadedKeys.length) {
      await deleteS3Objects(uploadedKeys);
    }

    return errorResponse(error);
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
