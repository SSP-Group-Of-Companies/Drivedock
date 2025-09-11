import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import PoliciesConsents from "@/mongoose/models/PoliciesConsents";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { deleteS3Objects, finalizePhoto } from "@/lib/utils/s3Upload";
import { EStepPath } from "@/types/onboardingTracker.types";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";
import { IPhoto } from "@/types/shared.types";
import { IPoliciesConsents } from "@/types/policiesConsents.types";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { advanceProgress, buildTrackerContext, hasReachedStep, nextResumeExpiry, onboardingExpired } from "@/lib/utils/onboardingUtils";
import { getUserLocation, extractIPFromRequest } from "@/lib/utils/geolocationUtils";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { ES3Folder } from "@/types/aws.types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "Invalid onboarding ID");

    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.status.completed === true) return errorResponse(401, "onboarding process already completed");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    if (!hasReachedStep(onboardingDoc, EStepPath.POLICIES_CONSENTS)) return errorResponse(400, "Please complete previous steps first");

    const { signature, sendPoliciesByEmail } = await parseJsonBody<IPoliciesConsents>(req);
    const tempSignature = signature;

    const existingId = onboardingDoc.forms?.policiesConsents;
    const existingDoc = existingId ? await PoliciesConsents.findById(existingId) : null;

    // Check for deletion of previous finalized signature if being replaced
    const previousSigKey = existingDoc?.signature?.s3Key;
    const isReplacingFinalized = previousSigKey && !previousSigKey.startsWith(S3_TEMP_FOLDER) && previousSigKey !== tempSignature.s3Key;

    if (isReplacingFinalized) {
      await deleteS3Objects([previousSigKey]);
    }

    // Finalize signature photo
    const finalizedSignature: IPhoto = await finalizePhoto(tempSignature, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.SIGNATURES}/${onboardingDoc.id}`);

    const signedAt = new Date();

    const updatedDoc = existingDoc
      ? await PoliciesConsents.findByIdAndUpdate(existingDoc._id, { signature: finalizedSignature, signedAt, sendPoliciesByEmail }, { new: true })
      : await PoliciesConsents.create({
          signature: finalizedSignature,
          signedAt,
          sendPoliciesByEmail,
        });

    if (!updatedDoc) {
      return errorResponse(500, "Failed to save policies & consents");
    }

    if (!existingId) {
      onboardingDoc.forms.policiesConsents = updatedDoc.id;
    }

    onboardingDoc.forms.policiesConsents = updatedDoc.id;
    
    // Always capture location on policies-consents submission
    // This ensures we track where the driver was when they last signed
    let completionLocation = null;
    try {
      const userIP = extractIPFromRequest(req);
      console.log('🔍 Policies-consents location capture:', {
        userIP,
        hasIP: !!userIP,
        ipType: typeof userIP,
        ipLength: userIP?.length || 0
      });
      
      const locationData = await getUserLocation(userIP);
      console.log('📍 Location data result:', locationData);
      
      if (!('error' in locationData)) {
        completionLocation = {
          country: locationData.country,
          region: locationData.region,
          city: locationData.city,
          timezone: locationData.timezone,
          ip: locationData.ip
        };
        console.log('✅ Location captured successfully:', completionLocation);
      } else {
        console.log('❌ Location capture failed:', locationData.message);
      }
    } catch (error) {
      console.error('💥 Location capture error:', error);
      // Continue without location data - don't fail the completion
    }
    
    // Update status with completion location (captured on every signing)
    console.log('🚀 About to call advanceProgress:', {
      hasCompletionLocation: !!completionLocation,
      completionLocation,
      willPassToAdvanceProgress: completionLocation || undefined
    });
    
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.POLICIES_CONSENTS, completionLocation || undefined);

    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
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

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    const { id } = await params;

    if (!isValidObjectId(id)) {
      return errorResponse(400, "not a valid id");
    }

    // Step 1: Find onboarding tracker
    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.status.completed === true) return errorResponse(401, "onboarding process already completed");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    // Step 2: Get linked Policies & Consents doc
    const policiesId = onboardingDoc.forms?.policiesConsents;
    let policiesDoc = null;
    if (policiesId) {
      policiesDoc = await PoliciesConsents.findById(policiesId);
    }

    if (!hasReachedStep(onboardingDoc, EStepPath.POLICIES_CONSENTS)) {
      return errorResponse(403, "Please complete previous steps first");
    }

    return successResponse(200, "Policies & Consents data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.POLICIES_CONSENTS),
      policiesConsents: policiesDoc ?? {},
    });
  } catch (error) {
    return errorResponse(error);
  }
};
