import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
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

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ sin: string }> }
) => {
  const uploadedKeys: string[] = [];

  try {
    await connectDB();
    const { sin } = await params;
    if (!sin || sin.length !== 9)
      return errorResponse(400, "Invalid SIN in URL");

    const sinHash = hashString(sin);
    const formData = await req.formData();

    const rawPage4 = formData.get("applicationFormPage4") as string;
    if (!rawPage4)
      return errorResponse(400, "Missing form field: applicationFormPage4");

    const body = JSON.parse(rawPage4) as IApplicationFormPage4;

    const onboardingDoc = await OnboardingTracker.findOne({ sinHash });
    if (!onboardingDoc)
      return errorResponse(404, "OnboardingTracker not found");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    if (appFormDoc.completedStep < 3)
      return errorResponse(400, "Please complete the previous step first");

    const company = COMPANIES.find((c) => c.id === onboardingDoc.companyId);
    if (!company)
      return errorResponse(400, "Invalid company assigned to applicant");

    const isCanadian = company.countryCode === ECountryCode.CA;
    const isUS = company.countryCode === ECountryCode.US;

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

    const fileGroups: Record<string, File[]> = {};
    for (const field of photoFieldNames) {
      fileGroups[field] = formData.getAll(field) as File[];
    }

    const employeeProvided = !!body.employeeNumber?.trim();
    const businessProvided = !!body.businessNumber?.trim();
    const hstProvided = !!body.hstNumber?.trim();
    const incorporateProvided = fileGroups["incorporatePhotos"].length > 0;
    const bankingProvided = fileGroups["bankingInfoPhotos"].length > 0;
    const hstPhotosProvided = fileGroups["hstPhotos"].length > 0;

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
      incorporateProvided &&
      bankingProvided &&
      hstPhotosProvided;

    if (anyBusinessSectionProvided && !allBusinessSectionProvided) {
      return errorResponse(
        400,
        "If any of employeeNumber, businessNumber, hstNumber, incorporatePhotos, bankingInfoPhotos, or hstPhotos are provided, then all must be provided."
      );
    }

    if (isCanadian) {
      if (fileGroups.healthCardPhotos.length === 0)
        return errorResponse(
          400,
          "Health card photos are required for Canadian drivers."
        );
      if (fileGroups.passportPhotos.length === 0)
        return errorResponse(
          400,
          "Passport photos are required for Canadian drivers."
        );
      if (fileGroups.usVisaPhotos.length === 0)
        return errorResponse(
          400,
          "US Visa photos are required for Canadian drivers."
        );
      if (fileGroups.prPermitCitizenshipPhotos.length === 0)
        return errorResponse(
          400,
          "PR/Permit/Citizenship photos are required for Canadian drivers."
        );
    }

    if (isUS) {
      if (fileGroups.medicalCertificationPhotos.length === 0)
        return errorResponse(
          400,
          "Medical Certificate photo is required for US drivers."
        );
      const hasPassport = fileGroups.passportPhotos.length > 0;
      const hasPR = fileGroups.prPermitCitizenshipPhotos.length > 0;
      if (!hasPassport && !hasPR) {
        return errorResponse(
          400,
          "US drivers must provide either a Passport or a PR/Permit/Citizenship photo."
        );
      }
    }

    if (body.fastCard) {
      const {
        fastCardNumber,
        fastCardExpiry,
        fastCardFrontPhoto,
        fastCardBackPhoto,
      } = body.fastCard;
      if (
        !fastCardNumber?.trim() ||
        !fastCardExpiry ||
        !fastCardFrontPhoto?.url ||
        !fastCardBackPhoto?.url
      ) {
        return errorResponse(
          400,
          "Fast card is incomplete. All fields (number, expiry, front & back photo) are required if provided."
        );
      }
    }

    // Upload & assign
    const keysToDelete: string[] = [];
    const uploadedKeys: string[] = [];
    const uploadTasks: Promise<any>[] = [];
    for (const field of photoFieldNames) {
      const files = fileGroups[field];
      if (files.length > 0) {
        const existingPhotos = appFormDoc.page4?.[field] ?? [];
        for (const photo of existingPhotos) {
          if (photo?.s3Key) keysToDelete.push(photo.s3Key);
        }

        body[field] = [];
        for (const file of files) {
          uploadTasks.push(
            (async () => {
              const result = validateImageFile(file, field);
              if (!result.isValid) {
                if (uploadedKeys.length > 0)
                  await deleteS3Objects(uploadedKeys);
                return errorResponse(400, result.errorMessage);
              }
              const safeFile = result.safeFile;
              const buffer = Buffer.from(await safeFile.arrayBuffer());
              const { url, key } = await uploadImageToS3({
                fileBuffer: buffer,
                fileType: safeFile.type,
                folder: `${field}/${onboardingDoc.id}`,
              });
              uploadedKeys.push(key);
              (body[field] as any).push({ url, s3Key: key });
            })()
          );
        }
      }
    }
    await Promise.all(uploadTasks);
    if (keysToDelete.length > 0) await deleteS3Objects(keysToDelete);

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
    if (uploadedKeys.length > 0) await deleteS3Objects(uploadedKeys);
    return errorResponse(error);
  }
};
