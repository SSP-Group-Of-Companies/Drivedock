import mongoose from "mongoose";
import { AppError } from "@/lib/utils/apiResponse";
import {
  deleteS3Objects,
  deleteAllObjectsUnderPrefix,
} from "@/lib/utils/s3Upload";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { ES3Folder } from "@/types/aws.types";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import PreQualifications from "@/mongoose/models/Prequalifications";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import PoliciesConsents from "@/mongoose/models/PoliciesConsents";
import CarriersEdgeTraining from "@/mongoose/models/CarriersEdgeTraining";
import DriveTest from "@/mongoose/models/DriveTest";
import DrugTest from "@/mongoose/models/DrugTest";
import FlatbedTraining from "@/mongoose/models/FlatbedTraining";
import OnboardingSession from "@/mongoose/models/OnboardingSession";
import OnboardingVerificationCode from "@/mongoose/models/OnboardingVerificationCode";

function collectS3KeysDeep(
  value: unknown,
  keys: Set<string>,
  seen = new WeakSet<object>(),
): void {
  if (value === null || value === undefined) return;
  if (typeof value !== "object") return;
  if (value instanceof mongoose.Types.ObjectId) return;
  if (value instanceof Date) return;
  if (value instanceof Buffer) return;
  if (seen.has(value as object)) return;
  seen.add(value as object);

  if (Array.isArray(value)) {
    for (const item of value) collectS3KeysDeep(item, keys, seen);
    return;
  }

  const o = value as Record<string, unknown>;
  if (typeof o.s3Key === "string" && o.s3Key.trim().length > 0) {
    keys.add(o.s3Key.trim());
  }
  for (const v of Object.values(o)) {
    collectS3KeysDeep(v, keys, seen);
  }
}

async function deleteTrackerS3PrefixCopies(trackerId: string): Promise<void> {
  const folderValues = Object.values(ES3Folder) as string[];
  for (const folder of folderValues) {
    const tempPrefix = `${S3_TEMP_FOLDER}/${folder}/${trackerId}/`;
    const subPrefix = `${S3_SUBMISSIONS_FOLDER}/${folder}/${trackerId}/`;
    await Promise.all([
      deleteAllObjectsUnderPrefix(tempPrefix),
      deleteAllObjectsUnderPrefix(subPrefix),
    ]);
  }
}

/**
 * Permanently removes a terminated onboarding: linked Mongo documents (via tracker cascade),
 * onboarding sessions / verification codes, and S3 assets referenced in DB plus known per-tracker prefixes.
 *
 * IMPORTANT: OnboardingAuditLog documents are NOT deleted — admins retain a full audit trail
 * searchable by onboarding id, actor, driver snapshot, etc., even after permanent removal.
 */
export async function permanentDeleteTerminatedOnboarding(
  trackerId: string,
): Promise<void> {
  if (!mongoose.isValidObjectId(trackerId)) {
    throw new AppError(400, "not a valid id");
  }

  const tracker = await OnboardingTracker.findById(trackerId).lean();
  if (!tracker) {
    throw new AppError(404, "Onboarding document not found");
  }
  if (!tracker.terminated) {
    throw new AppError(
      400,
      "Only terminated onboardings can be permanently deleted",
    );
  }

  const keys = new Set<string>();
  collectS3KeysDeep(tracker, keys);

  const f = tracker.forms;
  const [pre, app, pol, ce, dt, drug, fb] = await Promise.all([
    f?.preQualification
      ? PreQualifications.findById(f.preQualification).lean()
      : null,
    f?.driverApplication
      ? ApplicationForm.findById(f.driverApplication).lean()
      : null,
    f?.policiesConsents
      ? PoliciesConsents.findById(f.policiesConsents).lean()
      : null,
    f?.carriersEdgeTraining
      ? CarriersEdgeTraining.findById(f.carriersEdgeTraining).lean()
      : null,
    f?.driveTest ? DriveTest.findById(f.driveTest).lean() : null,
    f?.drugTest ? DrugTest.findById(f.drugTest).lean() : null,
    f?.flatbedTraining
      ? FlatbedTraining.findById(f.flatbedTraining).lean()
      : null,
  ]);

  for (const doc of [pre, app, pol, ce, dt, drug, fb]) {
    if (doc) collectS3KeysDeep(doc, keys);
  }

  try {
    await OnboardingSession.deleteMany({ trackerId });
  } catch (e) {
    console.error("Failed to delete onboarding sessions:", e);
  }
  try {
    await OnboardingVerificationCode.deleteMany({ trackerId });
  } catch (e) {
    console.error("Failed to delete onboarding verification codes:", e);
  }

  const removed = await OnboardingTracker.findOneAndDelete({
    _id: trackerId,
    terminated: true,
  });

  if (!removed) {
    throw new AppError(
      409,
      "Could not delete onboarding — it may have been restored or is no longer terminated",
    );
  }

  const keyList = [...keys];
  if (keyList.length > 0) {
    try {
      await deleteS3Objects(keyList);
    } catch (e) {
      console.error(
        "Failed to delete some S3 objects for terminated onboarding:",
        e,
      );
    }
  }

  try {
    await deleteTrackerS3PrefixCopies(trackerId);
  } catch (e) {
    console.error("Failed to delete S3 prefix copies for tracker:", e);
  }
}
