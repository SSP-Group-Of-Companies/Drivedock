import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import PoliciesConsents from "@/mongoose/models/PoliciesConsents";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { uploadImageToS3, deleteS3Objects } from "@/lib/utils/s3Upload";
import { IPhoto } from "@/types/shared.types";
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

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  let uploadedKey: string | null = null;

  try {
    await connectDB();
    const { id } = await params;

    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    const formData = await req.formData();
    const file = formData.get("signature") as File;

    if (!file) return errorResponse(400, "Missing signature file");

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return errorResponse(
        400,
        "Invalid file type. Only JPG, PNG, or WEBP images are allowed."
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return errorResponse(
        400,
        `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`
      );
    }

    // Check onboarding doc
    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc)
      return errorResponse(404, "OnboardingTracker not found");

    // check completed step
    if (!hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_5))
      return errorResponse(400, "please complete previous step first");

    const existingId = onboardingDoc.forms?.policiesConsents;
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
      onboardingDoc.forms.policiesConsents = updatedDoc.id;
    }

    // Update onboarding tracker steps
    onboardingDoc.status = advanceStatus(
      onboardingDoc.status,
      EStepPath.POLICIES_CONSENTS
    );
    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    return successResponse(200, "Policies & Consents updated", {
      onboardingContext: buildTrackerContext(
        onboardingDoc,
        EStepPath.POLICIES_CONSENTS
      ),
      policiesConsents: updatedDoc.toObject(),
    });
  } catch (error) {
    if (uploadedKey) {
      await deleteS3Objects([uploadedKey]);
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
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return errorResponse(400, "not a valid id");
    }

    // Step 1: Find onboarding tracker
    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc) {
      return errorResponse(404, "Onboarding document not found");
    }

    if (onboardingExpired(onboardingDoc))
      return errorResponse(400, "Onboarding session expired");

    // Step 2: Get linked Policies & Consents doc
    const policiesId = onboardingDoc.forms?.policiesConsents;
    if (!policiesId) {
      return errorResponse(404, "PoliciesConsents form not linked");
    }

    const policiesDoc = await PoliciesConsents.findById(policiesId);
    if (!hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_5)) {
      return errorResponse(403, "Please complete previous step first");
    }

    return successResponse(200, "Policies & Consents data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc),
      policiesConsents: policiesDoc?.toObject() ?? {},
    });
  } catch (error) {
    return errorResponse(error);
  }
};
