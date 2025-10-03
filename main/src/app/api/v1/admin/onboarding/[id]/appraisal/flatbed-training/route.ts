import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse, AppError } from "@/lib/utils/apiResponse";
import { parseJsonBody } from "@/lib/utils/reqParser";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import FlatbedTraining from "@/mongoose/models/FlatbedTraining";

import { buildTrackerContext, hasReachedStep, advanceProgress, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { canHaveFlatbedTraining } from "@/constants/companies";

import { EStepPath, IOnboardingTracker } from "@/types/onboardingTracker.types";
import type { IFileAsset } from "@/types/shared.types";
import { guard } from "@/lib/utils/auth/authUtils";
import sendCompletionEmailIfEligible from "@/lib/services/sendCompletionEmailIfEligible";

import { deleteS3Objects, finalizeAsset } from "@/lib/utils/s3Upload";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { ES3Folder } from "@/types/aws.types";
import { EFileMimeType } from "@/types/shared.types";

/* ========================================================================
 * GET (unchanged)
 * ===================================================================== */
export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");

    if (!hasReachedStep(onboardingDoc, EStepPath.FLATBED_TRAINING)) {
      return errorResponse(403, "driver hasn't reached this step yet");
    }

    const flatbedId = onboardingDoc.forms?.flatbedTraining;
    const flatbedTraining = flatbedId && isValidObjectId(flatbedId) ? await FlatbedTraining.findById(flatbedId).lean() : null;

    return successResponse(200, "flatbed training retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      flatbedTraining,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

/* ========================================================================
 * PATCH – strict single-file API that stores into array[0]
 * Rules:
 *  - Always accepts requests (even if onboarding/flatbed is completed)
 *  - Body requires BOTH:
 *      * flatbedTraining.flatbedCertificate (single IFileAsset)
 *      * flatbedTraining.completed === true
 *  - Certificates always updatable (replaces the single stored certificate)
 *  - Step gate remains: must have reached FLATBED_TRAINING and be applicable
 *  - On first transition to completed => advance progress
 * ===================================================================== */

const TEMP_PREFIX = `${S3_TEMP_FOLDER}/`;

const ALLOWED_MIME: ReadonlySet<string> = new Set<string>([EFileMimeType.JPEG, EFileMimeType.JPG, EFileMimeType.PNG, EFileMimeType.PDF, EFileMimeType.DOC, EFileMimeType.DOCX]);

function assertAllowedMimeOrThrow(mime?: string) {
  const mt = (mime ?? "").toLowerCase().trim();
  if (!ALLOWED_MIME.has(mt)) {
    throw new AppError(400, `Unsupported file type "${mime}". Allowed: jpeg, jpg, png, pdf, doc, docx.`);
  }
}

async function finalizeSingleAssetIfNeeded(incoming: IFileAsset, finalFolder: string): Promise<IFileAsset> {
  if (!incoming?.mimeType) throw new AppError(400, "File asset must include a mimeType.");
  incoming.mimeType = String(incoming.mimeType).toLowerCase();
  assertAllowedMimeOrThrow(incoming.mimeType);

  if (!incoming?.s3Key) throw new AppError(400, "File asset must include an s3Key.");
  if (incoming.s3Key.startsWith(TEMP_PREFIX)) {
    return finalizeAsset(incoming, finalFolder);
  }
  return incoming;
}

async function deleteIfReplaced(prev?: IFileAsset, next?: IFileAsset) {
  const prevKey = prev?.s3Key;
  const nextKey = next?.s3Key;
  if (prevKey && !prevKey.startsWith(TEMP_PREFIX) && prevKey !== nextKey) {
    try {
      await deleteS3Objects([prevKey]);
    } catch (e) {
      console.warn("Failed to delete replaced finalized S3 key:", prevKey, e);
    }
  }
}

type PatchBody = {
  flatbedTraining?: {
    flatbedCertificate?: IFileAsset; // single file in API
    completed?: boolean; // must be true
  };
};

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Invalid onboarding ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.terminated) return errorResponse(400, "Onboarding document terminated");

    if (!hasReachedStep(onboardingDoc, EStepPath.FLATBED_TRAINING)) {
      return errorResponse(403, "Driver hasn't reached the Flatbed Training step yet");
    }

    const applicable = canHaveFlatbedTraining(onboardingDoc.companyId as string, onboardingDoc.applicationType as any);
    if (!applicable || onboardingDoc.needsFlatbedTraining !== true) {
      return errorResponse(400, "Flatbed training is not applicable for this applicant/company");
    }

    const body = await parseJsonBody<PatchBody>(req);
    const payload = body?.flatbedTraining;
    if (!payload || typeof payload !== "object") {
      return errorResponse(400, "Missing 'flatbedTraining' in request body");
    }

    // STRICT: require completed===true AND a certificate
    if (payload.completed !== true) {
      return errorResponse(400, "flatbedTraining.completed must be true");
    }
    const incomingFile = payload.flatbedCertificate;
    if (!incomingFile) {
      return errorResponse(400, "flatbedTraining.flatbedCertificate is required");
    }

    // Load or create the FlatbedTraining doc
    let flatbedDoc: any | null = null;
    const flatbedId = onboardingDoc.forms?.flatbedTraining;
    if (flatbedId && isValidObjectId(flatbedId)) {
      flatbedDoc = await FlatbedTraining.findById(flatbedId);
    }
    if (!flatbedDoc) {
      flatbedDoc = new FlatbedTraining({ completed: false, flatbedCertificates: [] });
    }

    const finalFolder = `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.FLATBED_TRAINING_CERTIFICATES}/${onboardingDoc.id}`;

    // prev (single) certificate, if any
    const prevCert: IFileAsset | undefined = Array.isArray(flatbedDoc.flatbedCertificates) && flatbedDoc.flatbedCertificates.length > 0 ? flatbedDoc.flatbedCertificates[0] : undefined;

    // finalize/process the single incoming asset
    const nextCert = await finalizeSingleAssetIfNeeded(incomingFile, finalFolder);

    // replace array with exactly one certificate
    flatbedDoc.flatbedCertificates = [nextCert];

    // cleanup previously finalized if replaced
    await deleteIfReplaced(prevCert, nextCert);

    const wasCompleted = !!flatbedDoc.completed;
    // by contract, completed must be true on every patch
    flatbedDoc.completed = true;

    await flatbedDoc.save();

    // Ensure linked on tracker
    if (!onboardingDoc.forms) onboardingDoc.forms = {} as any;
    onboardingDoc.forms.flatbedTraining = flatbedDoc._id;

    // If just transitioned to completed, advance progress
    const justCompleted = !wasCompleted && !!flatbedDoc.completed;
    if (justCompleted) {
      onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.FLATBED_TRAINING);
    }

    // Extend resume window (even for updates)
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    // If onboarding became fully completed, trigger completion email
    let updatedTracker: IOnboardingTracker | null = null;
    if (onboardingDoc.status?.completed === true) {
      const { tracker } = await sendCompletionEmailIfEligible(onboardingDoc.id);
      updatedTracker = tracker;
    }

    const responseTracker = updatedTracker ?? onboardingDoc;

    return successResponse(200, "Flatbed training updated", {
      onboardingContext: buildTrackerContext(responseTracker, EStepPath.FLATBED_TRAINING, true),
      flatbedTraining: flatbedDoc.toObject(),
    });
  } catch (error) {
    return errorResponse(error);
  }
};
