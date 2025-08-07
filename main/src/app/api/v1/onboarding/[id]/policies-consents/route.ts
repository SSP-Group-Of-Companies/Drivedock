import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import PoliciesConsents from "@/mongoose/models/PoliciesConsents";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { deleteS3Objects, finalizePhoto } from "@/lib/utils/s3Upload";
import { EStepPath } from "@/types/onboardingTracker.type";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";
import { IPhoto } from "@/types/shared.types";
import { IPoliciesConsents } from "@/types/policiesConsents.types";
import { parseJsonBody } from "@/lib/utils/reqParser";
import {
  advanceStatus,
  buildTrackerContext,
  hasCompletedStep,
  onboardingExpired,
} from "@/lib/utils/onboardingUtils";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { ES3Folder } from "@/types/aws.types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "Invalid onboarding ID");

    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc)
      return errorResponse(404, "Onboarding document not found");

    if (!hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_5))
      return errorResponse(400, "Please complete previous step first");

    const payload = await parseJsonBody<IPoliciesConsents>(req);
    const tempSignature = payload.signature;

    if (!tempSignature?.s3Key?.startsWith(S3_TEMP_FOLDER)) {
      return errorResponse(400, "Temporary signature photo is required");
    }

    const existingId = onboardingDoc.forms?.policiesConsents;
    const existingDoc = existingId
      ? await PoliciesConsents.findById(existingId)
      : null;

    // Check for deletion of previous finalized signature if being replaced
    const previousSigKey = existingDoc?.signature?.s3Key;
    const isReplacingFinalized =
      previousSigKey &&
      !previousSigKey.startsWith(S3_TEMP_FOLDER) &&
      previousSigKey !== tempSignature.s3Key;

    if (isReplacingFinalized) {
      await deleteS3Objects([previousSigKey]);
    }

    // Finalize signature photo
    const finalizedSignature: IPhoto = await finalizePhoto(
      tempSignature,
      `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.SIGNATURES}/${onboardingDoc.id}`
    );

    const signedAt = new Date();

    const updatedDoc = existingDoc
      ? await PoliciesConsents.findByIdAndUpdate(
        existingDoc._id,
        { signature: finalizedSignature, signedAt },
        { new: true }
      )
      : await PoliciesConsents.create({
        signature: finalizedSignature,
        signedAt,
      });

    if (!updatedDoc) {
      return errorResponse(500, "Failed to save policies & consents");
    }

    if (!existingId) {
      onboardingDoc.forms.policiesConsents = updatedDoc.id;
    }

    onboardingDoc.status = advanceStatus(onboardingDoc.status, EStepPath.POLICIES_CONSENTS);
    onboardingDoc.resumeExpiresAt = new Date(Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC));
    await onboardingDoc.save();

    return successResponse(200, "Policies & Consents updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.POLICIES_CONSENTS),
      policiesConsents: updatedDoc.toObject(),
    });
  } catch (error) {
    console.error("PATCH /policies-consents error:", error);
    return errorResponse(error);
  }
}



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
    let policiesDoc = null;
    if (policiesId) {
      policiesDoc = await PoliciesConsents.findById(policiesId);
    }

    if (!hasCompletedStep(onboardingDoc.status, EStepPath.APPLICATION_PAGE_5)) {
      return errorResponse(403, "Please complete previous step first");
    }

    // update tracker current step 
    onboardingDoc.status.currentStep = EStepPath.POLICIES_CONSENTS;
    await onboardingDoc.save();

    return successResponse(200, "Policies & Consents data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc),
      policiesConsents: policiesDoc?.toObject() ?? {},
    });
  } catch (error) {
    return errorResponse(error);
  }
};
