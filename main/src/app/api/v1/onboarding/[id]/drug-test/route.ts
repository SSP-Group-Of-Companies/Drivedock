// src/app/api/v1/onboarding/[id]/drug-test/route.ts
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import DrugTest from "@/mongoose/models/DrugTest";
import { IPhoto } from "@/types/shared.types";
import { isValidObjectId } from "mongoose";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { deleteS3Objects, finalizePhoto } from "@/lib/utils/s3Upload";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { ES3Folder } from "@/types/aws.types";
import { buildTrackerContext, hasReachedStep, nextResumeExpiry, onboardingExpired } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";
import { EDrugTestStatus } from "@/types/drugTest.types";

/** Payload: { documents: IPhoto[] } */
type PatchBody = { documents: IPhoto[] };

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Invalid onboarding ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.status.completed === true) return errorResponse(401, "onboarding process already completed");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    if (!hasReachedStep(onboardingDoc, EStepPath.DRUG_TEST)) {
      return errorResponse(400, "Please complete previous steps first");
    }

    const body = await parseJsonBody<PatchBody>(req);
    if (!body || !Array.isArray(body.documents)) {
      return errorResponse(400, "Invalid payload: documents[] is required");
    }

    // Find or create DrugTest doc
    const existingId = onboardingDoc.forms?.drugTest as any | undefined;
    let drugTestDoc = existingId ? await DrugTest.findById(existingId) : null;
    if (!drugTestDoc) {
      drugTestDoc = await DrugTest.create({
        documents: [],
        documentsUploaded: false,
        completed: false,
      });
      onboardingDoc.set("forms.drugTest", drugTestDoc._id);
      await onboardingDoc.save();
    }

    // Previous finalized state for deletion diff
    const prevDocs = Array.isArray(drugTestDoc.documents) ? [...drugTestDoc.documents] : [];

    // -------- Finalize new uploads (temp-files -> submissions/drug-test-docs/<id>) --------
    const tempPrefix = `${S3_TEMP_FOLDER}/`;
    const finalFolder = `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.DRUG_TEST_DOCS}/${onboardingDoc.id}`;

    const isTemp = (p: IPhoto | undefined) => !!p?.s3Key && p.s3Key.startsWith(tempPrefix);

    const finalizedDocs: IPhoto[] = [];
    for (const p of body.documents ?? []) {
      if (isTemp(p)) {
        finalizedDocs.push(await finalizePhoto(p, finalFolder));
      } else {
        finalizedDocs.push(p);
      }
    }

    // -------- Delete finalized objects removed by user --------
    const collectKeys = (arr?: IPhoto[]) => (Array.isArray(arr) ? arr.map((p) => p?.s3Key).filter((k): k is string => !!k) : []);

    const prevKeys = new Set(collectKeys(prevDocs));
    const newKeys = new Set(collectKeys(finalizedDocs));
    const removedFinalized = [...prevKeys].filter((k) => !newKeys.has(k) && !k.startsWith(tempPrefix));

    if (removedFinalized.length) {
      try {
        await deleteS3Objects(removedFinalized);
      } catch (e) {
        console.warn("Failed to delete removed finalized DrugTest S3 keys:", e);
      }
    }

    // -------- Persist (single save, validation ON) --------
    drugTestDoc.set({
      documents: finalizedDocs,
      status: EDrugTestStatus.AWAITING_REVIEW,
    });
    await drugTestDoc.save(); // normal validation

    // Refresh resume expiry (but don't advance step - that happens when admin approves)
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    return successResponse(200, "Drug test documents updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.DRUG_TEST),
      drugTest: drugTestDoc.toObject(), // return the updated doc directly
    });
  } catch (err) {
    return errorResponse(err);
  }
};

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.status.completed === true) return errorResponse(401, "onboarding process already completed");
    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    if (!hasReachedStep(onboardingDoc, EStepPath.DRUG_TEST)) {
      return errorResponse(403, "Please complete previous steps first");
    }

    const drugTestId = onboardingDoc.forms?.drugTest as any | undefined;
    const drugTestDoc = drugTestId ? await DrugTest.findById(drugTestId) : null;

    return successResponse(200, "Drug test data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.DRUG_TEST),
      drugTest: drugTestDoc?.toObject() ?? {}, // return doc directly (or null if not created yet)
    });
  } catch (error) {
    return errorResponse(error);
  }
};
