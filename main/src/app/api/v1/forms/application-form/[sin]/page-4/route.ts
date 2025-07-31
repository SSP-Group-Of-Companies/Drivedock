import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import {
  AppError,
  errorResponse,
  successResponse,
} from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { hashString } from "@/lib/utils/cryptoUtils";
import { IApplicationFormPage4 } from "@/types/applicationForm.types";
import { uploadImageToS3, deleteS3Objects } from "@/lib/utils/s3Upload";
import { COMPANIES } from "@/constants/companies";
import { ECountryCode } from "@/types/shared.types";
import { validateImageFile } from "@/lib/utils/validationUtils";

export const config = {
  api: { bodyParser: false },
};

// PATCH /forms/application-form/[sin]/page-4
export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ sin: string }> }
) => {
  const uploadedKeys: string[] = [];
  const keysToDelete: string[] = [];
  const uploadTasks: Promise<void>[] = [];

  try {
    await connectDB();

    // 1. Params & basic checks
    const { sin } = await params;
    if (!sin || sin.length !== 9) {
      return errorResponse(400, "Invalid SIN in URL");
    }
    const sinHash = hashString(sin);

    const formData = await req.formData();
    const rawPage4 = formData.get("applicationFormPage4") as string;
    if (!rawPage4) {
      return errorResponse(400, "Missing form field: applicationFormPage4");
    }
    const body = JSON.parse(rawPage4) as IApplicationFormPage4;

    // 2. Load tracker & form
    const onboardingDoc = await OnboardingTracker.findOne({ sinHash });
    if (!onboardingDoc)
      return errorResponse(404, "OnboardingTracker not found");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    if (appFormDoc.completedStep < 3) {
      return errorResponse(400, "Please complete the previous step first");
    }

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
        const alreadySaved =
          (appFormDoc.page4?.[field as PhotoFieldName]?.length ?? 0) > 0;
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

      const key = field as PhotoFieldName;
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
    if (keysToDelete.length) await deleteS3Objects(keysToDelete);

    // 6. Persist
    appFormDoc.page4 = body;
    appFormDoc.currentStep = 5;
    if (appFormDoc.completedStep < 4) appFormDoc.completedStep = 4;
    await appFormDoc.save();

    onboardingDoc.status.currentStep = 2;
    onboardingDoc.status.completedStep = Math.max(
      onboardingDoc.status.completedStep,
      2
    );
    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 4 updated", {
      onboardingTracker: onboardingDoc.toObject({ virtuals: true }),
      applicationForm: appFormDoc.toObject({ virtuals: true }),
    });
  } catch (error) {
    await Promise.allSettled(uploadTasks);
    if (uploadedKeys.length) await deleteS3Objects(uploadedKeys);
    return errorResponse(error);
  }
};
