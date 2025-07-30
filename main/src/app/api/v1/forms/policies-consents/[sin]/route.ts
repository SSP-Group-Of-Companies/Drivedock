import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import PoliciesConsents from "@/mongoose/models/PoliciesConsents";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { hashString } from "@/lib/utils/cryptoUtils";
import { uploadImageToS3, deleteS3Objects } from "@/lib/utils/s3Upload";
import { IPhoto } from "@/types/shared.types";

export const config = {
  api: { bodyParser: false },
};

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ sin: string }> }
) => {
  let uploadedKey: string | null = null;

  try {
    await connectDB();
    const { sin } = await params;
    if (!sin || sin.length !== 9)
      return errorResponse(400, "Invalid SIN in URL");

    const sinHash = hashString(sin);
    const formData = await req.formData();
    const file = formData.get("signature") as File;

    if (!file) return errorResponse(400, "Missing signature file");

    // ✅ Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return errorResponse(
        400,
        "Invalid file type. Only JPG, PNG, or WEBP images are allowed."
      );
    }

    // ✅ Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return errorResponse(
        400,
        `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`
      );
    }

    // Check onboarding doc
    const onboardingDoc = await OnboardingTracker.findOne({ sinHash });
    if (!onboardingDoc)
      return errorResponse(404, "OnboardingTracker not found");

    const existingId = onboardingDoc.forms?.consents;
    const existingDoc = existingId
      ? await PoliciesConsents.findById(existingId)
      : null;

    // Delete previous signature from S3
    if (existingDoc?.signature?.s3Key) {
      await deleteS3Objects([existingDoc.signature.s3Key]);
    }

    // Upload new signature to S3
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileType = file.type;

    const { url, key } = await uploadImageToS3({
      fileBuffer,
      fileType,
      folder: `signatures/${onboardingDoc.id}`,
    });

    uploadedKey = key;

    const signature: IPhoto = { url, s3Key: key };
    const signedAt = new Date();

    // Create or update PoliciesConsents document
    const updatedDoc = existingDoc
      ? await PoliciesConsents.findByIdAndUpdate(
          existingDoc._id,
          { signature, signedAt },
          { new: true }
        )
      : await PoliciesConsents.create({ signature, signedAt });

    if (!updatedDoc) {
      await deleteS3Objects([uploadedKey]);
      return errorResponse(404, "policies consents document not found");
    }

    // Update onboarding doc if not already linked
    if (!existingId) {
      onboardingDoc.forms.consents = updatedDoc.id;
    }

    onboardingDoc.status.currentStep = 4; // step 3 complete → step 4
    onboardingDoc.status.completedStep = Math.max(
      onboardingDoc.status.completedStep,
      3
    );
    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    return successResponse(200, "Policies & Consents updated", {
      onboardingTracker: onboardingDoc.toObject({ virtuals: true }),
      policiesConsents: updatedDoc.toObject(),
    });
  } catch (error) {
    if (uploadedKey) {
      await deleteS3Objects([uploadedKey]);
    }
    console.error("Error updating policies and consents:", error);
    return errorResponse(500, "Failed to update policies and consents");
  }
};
