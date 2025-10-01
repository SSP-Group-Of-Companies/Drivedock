import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import PoliciesConsents from "@/mongoose/models/PoliciesConsents";
import { deleteS3Objects, finalizeAsset } from "@/lib/utils/s3Upload";
import { EStepPath, EEmailStatus } from "@/types/onboardingTracker.types";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";
import { IFileAsset } from "@/types/shared.types";
import { IPoliciesConsents } from "@/types/policiesConsents.types";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { advanceProgress, buildTrackerContext, hasReachedStep, isInvitationApproved, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { getLocationFromCoordinates } from "@/lib/utils/geolocationUtils";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { ES3Folder } from "@/types/aws.types";
import { requireOnboardingSession } from "@/lib/utils/auth/onboardingSession";
import { attachCookies } from "@/lib/utils/auth/attachCookie";

type PatchBody = IPoliciesConsents & {
  location?: { latitude: number; longitude: number } | null;
  locationPermissionGranted?: boolean;
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "Invalid onboarding ID");

    const { tracker: onboardingDoc, refreshCookie } = await requireOnboardingSession(id);

    if (!isInvitationApproved(onboardingDoc)) return errorResponse(401, "pending approval");

    if (!hasReachedStep(onboardingDoc, EStepPath.POLICIES_CONSENTS)) return errorResponse(400, "Please complete previous steps first");

    const body = await parseJsonBody<PatchBody>(req);
    const { signature: incomingSignature, sendPoliciesByEmail, location, locationPermissionGranted } = body ?? {};

    // (1) Always expect signature
    if (!incomingSignature || !incomingSignature.s3Key || !incomingSignature.url || !incomingSignature.mimeType) {
      return errorResponse(400, "Signature is required");
    }

    const existingId = onboardingDoc.forms?.policiesConsents;
    const existingDoc = existingId ? await PoliciesConsents.findById(existingId) : null;

    const previousSigKey = existingDoc?.signature?.s3Key;
    const sameSignatureAsBefore = previousSigKey && previousSigKey === incomingSignature.s3Key;

    let updatedDoc = existingDoc;

    if (existingDoc) {
      if (sameSignatureAsBefore) {
        // Same signature: do NOT replace or re-finalize; optionally update sendPoliciesByEmail only
        if (typeof sendPoliciesByEmail === "boolean") {
          updatedDoc = await PoliciesConsents.findByIdAndUpdate(existingDoc._id, { sendPoliciesByEmail }, { new: true });
        }
      } else {
        // Different signature: cleanup previous finalized (if needed), finalize new, update doc
        const isReplacingFinalized = !!previousSigKey && !previousSigKey.startsWith(S3_TEMP_FOLDER) && previousSigKey !== incomingSignature.s3Key;

        if (isReplacingFinalized) {
          await deleteS3Objects([previousSigKey]);
        }

        const finalizedSignature: IFileAsset = await finalizeAsset(incomingSignature, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.SIGNATURES}/${onboardingDoc.id}`);

        const signedAt = new Date();

        updatedDoc = await PoliciesConsents.findByIdAndUpdate(existingDoc._id, { signature: finalizedSignature, signedAt, sendPoliciesByEmail }, { new: true });
      }
    } else {
      // No existing doc: finalize and create new
      const finalizedSignature: IFileAsset = await finalizeAsset(incomingSignature, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.SIGNATURES}/${onboardingDoc.id}`);

      const signedAt = new Date();

      updatedDoc = await PoliciesConsents.create({
        signature: finalizedSignature,
        signedAt,
        sendPoliciesByEmail,
      });

      onboardingDoc.forms.policiesConsents = updatedDoc.id;
    }

    if (!updatedDoc) {
      return errorResponse(500, "Failed to save policies & consents");
    }

    // In case we created/updated, ensure the form linkage is set
    onboardingDoc.forms.policiesConsents = updatedDoc.id;

    // (2) Handle location permission and location capture
    if (typeof locationPermissionGranted === "boolean") {
      onboardingDoc.locationPermissionGranted = locationPermissionGranted;
    }

    let completionLocation: any = null;

    if (location?.latitude && location?.longitude) {
      // Always store coords
      completionLocation = {
        latitude: location.latitude,
        longitude: location.longitude,
      };

      // Best-effort reverse geocoding enrichment
      try {
        const locData = await getLocationFromCoordinates(location.latitude, location.longitude);
        if (!("error" in locData)) {
          completionLocation = {
            ...completionLocation,
            country: locData.country,
            region: locData.region,
            city: locData.city,
            timezone: locData.timezone,
          };
        }
      } catch {
        // ignore reverse-geocoding failures; coords are kept
      }
    }

    // Persist completionLocation on the root doc (incoming behavior)
    if (completionLocation) {
      onboardingDoc.completionLocation = completionLocation;
    }

    // Mirror driver's email preference onto the tracker.emails.completionPdfs
    if (typeof sendPoliciesByEmail === "boolean") {
      if (!onboardingDoc.emails) onboardingDoc.emails = {};
      if (!onboardingDoc.emails.completionPdfs) {
        onboardingDoc.emails.completionPdfs = {
          consentGiven: sendPoliciesByEmail,
          status: EEmailStatus.NOT_SENT,
          attempts: 0,
          lastError: undefined,
          sentAt: undefined,
        };
      } else {
        const meta = onboardingDoc.emails.completionPdfs;
        const prevConsent = !!meta.consentGiven;
        meta.consentGiven = sendPoliciesByEmail;

        if (sendPoliciesByEmail === false) {
          // Reset state so future opt-in starts clean
          meta.status = EEmailStatus.NOT_SENT;
          meta.attempts = 0;
          meta.lastError = undefined;
          meta.sentAt = undefined;
        } else {
          // Consent turned on (or reaffirmed)
          if (!meta.status) meta.status = EEmailStatus.NOT_SENT;

          // If previously errored or never sent, requeue cleanly
          if (meta.status === EEmailStatus.ERROR || (!prevConsent && meta.status !== EEmailStatus.SENT)) {
            meta.status = EEmailStatus.NOT_SENT;
            meta.attempts = 0;
            meta.lastError = undefined;
            meta.sentAt = undefined;
          }
        }
      }
    }

    // (Do not pass location to advanceProgress — match incoming behavior)
    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.POLICIES_CONSENTS);

    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    const res = successResponse(200, "Policies & Consents updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.POLICIES_CONSENTS),
      policiesConsents: updatedDoc.toObject(),
    });

    return attachCookies(res, refreshCookie);
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

    const { tracker: onboardingDoc, refreshCookie } = await requireOnboardingSession(id);

    const policiesId = onboardingDoc.forms?.policiesConsents;
    let policiesDoc = null;
    if (policiesId) {
      policiesDoc = await PoliciesConsents.findById(policiesId);
    }

    if (!hasReachedStep(onboardingDoc, EStepPath.POLICIES_CONSENTS)) {
      return errorResponse(403, "Please complete previous steps first");
    }

    const res = successResponse(200, "Policies & Consents data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.POLICIES_CONSENTS),
      policiesConsents: policiesDoc ?? {},
    });

    return attachCookies(res, refreshCookie);
  } catch (error) {
    return errorResponse(error);
  }
};
