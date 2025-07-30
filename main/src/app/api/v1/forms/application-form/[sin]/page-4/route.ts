import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { hashString } from "@/lib/utils/cryptoUtils";
import { IApplicationFormPage4 } from "@/types/applicationForm.types";
import { uploadImageToS3, deleteS3Objects } from "@/lib/utils/s3Upload";

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

    // Check presence of onboarding + app form BEFORE uploading files
    const onboardingDoc = await OnboardingTracker.findOne({ sinHash });
    if (!onboardingDoc)
      return errorResponse(404, "OnboardingTracker not found");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // check completed step
    if (appFormDoc.completedStep < 3)
      return errorResponse(400, "please complete previous step first");

    const employeeProvided = !!body.employeeNumber?.trim();
    const businessProvided = !!body.businessNumber?.trim();

    if (employeeProvided || businessProvided) {
      const incorporateFiles = formData.getAll("incorporatePhotos") as File[];
      const bankingFiles = formData.getAll("bankingInfoPhotos") as File[];

      if (incorporateFiles.length === 0)
        return errorResponse(400, "Incorporate photos are required.");
      if (bankingFiles.length === 0)
        return errorResponse(400, "Banking info photos are required.");

      // ❌ Delete existing S3 files
      const existingKeys = [
        ...(appFormDoc.page4?.incorporatePhotos || []).map((p) => p.s3Key),
        ...(appFormDoc.page4?.bankingInfoPhotos || []).map((p) => p.s3Key),
      ];
      if (existingKeys.length > 0) {
        await deleteS3Objects(existingKeys);
      }

      // ✅ Upload new incorporate photos
      body.incorporatePhotos = [];
      for (const file of incorporateFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        const fileType = file.type;

        const { url, key } = await uploadImageToS3({
          fileBuffer,
          fileType,
          folder: `incorporate/${onboardingDoc.id}`,
        });

        uploadedKeys.push(key);
        body.incorporatePhotos.push({ url, s3Key: key });
      }

      // ✅ Upload new banking info photos
      body.bankingInfoPhotos = [];
      for (const file of bankingFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);
        const fileType = file.type;

        const { url, key } = await uploadImageToS3({
          fileBuffer,
          fileType,
          folder: `banking/${onboardingDoc.id}`,
        });

        uploadedKeys.push(key);
        body.bankingInfoPhotos.push({ url, s3Key: key });
      }
    }

    // Save page 4
    appFormDoc.page4 = body;
    appFormDoc.currentStep = 5;
    if (appFormDoc.completedStep < 4) appFormDoc.completedStep = 4;
    await appFormDoc.save();

    onboardingDoc.status.currentStep = 2;
    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 4 updated", {
      onboardingTracker: onboardingDoc.toObject({ virtuals: true }),
      applicationForm: appFormDoc.toObject({ virtuals: true }),
    });
  } catch (error) {
    if (uploadedKeys.length > 0) {
      await deleteS3Objects(uploadedKeys);
    }
    console.error("Error updating application form page 4:", error);
    return errorResponse(500, "Failed to update application form page 4");
  }
};
