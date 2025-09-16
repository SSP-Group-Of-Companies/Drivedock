import mongoose, { ClientSession, Types } from "mongoose";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import PreQualifications from "@/mongoose/models/Prequalifications";
import PoliciesConsents from "@/mongoose/models/PoliciesConsents";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import CarriersEdgeTraining from "@/mongoose/models/CarriersEdgeTraining";
import DrugTest from "@/mongoose/models/DrugTest";
import FlatbedTraining from "@/mongoose/models/FlatbedTraining";
import DriveTest from "@/mongoose/models/DriveTest";

/**
 * Efficient bulk cascade delete:
 *  - Only deletes trackers where (status.completed missing OR false) AND resumeExpiresAt < now
 *  - Gathers child doc IDs and deletes in bulk with $in
 *  - Uses a transaction for integrity per batch
 *  - Processes up to `limit` per run (default 500; max 5000). Leftovers are handled next run.
 */
export async function bulkCascadeDeleteExpiredTrackers(now: Date = new Date(), limit = 500) {
  await connectDB();

  const MAX = Math.min(Math.max(1, limit), 5000);

  // Incomplete + expired
  const filter = {
    $and: [
      {
        $or: [{ "status.completed": { $exists: false } }, { "status.completed": false }],
      },
      { resumeExpiresAt: { $lt: now } },
    ],
  };

  // Only fetch what we need
  const candidates = await OnboardingTracker.find(filter, { _id: 1, forms: 1 }).limit(MAX).lean().exec();

  const scanned = candidates.length;
  if (scanned === 0) {
    return {
      scanned,
      deletedTrackers: 0,
      deletedChildren: {
        preQualifications: 0,
        driverApplications: 0,
        policiesConsents: 0,
        carriersEdgeTrainings: 0,
        driveTests: 0,
        drugTests: 0,
        flatbedTrainings: 0,
      },
      remainingHint: "0 (or more outside this batch)",
      trackerIds: [] as string[],
    };
  }

  const trackerIds: Types.ObjectId[] = [];
  const preQualIds: Types.ObjectId[] = [];
  const driverAppIds: Types.ObjectId[] = [];
  const policyIds: Types.ObjectId[] = [];
  const ceIds: Types.ObjectId[] = [];
  const driveTestIds: Types.ObjectId[] = [];
  const drugTestIds: Types.ObjectId[] = [];
  const flatbedIds: Types.ObjectId[] = [];

  for (const c of candidates) {
    trackerIds.push(c._id as Types.ObjectId);
    const f = (c as any).forms ?? {};
    if (f.preQualification) preQualIds.push(f.preQualification);
    if (f.driverApplication) driverAppIds.push(f.driverApplication);
    if (f.policiesConsents) policyIds.push(f.policiesConsents);
    if (f.carriersEdgeTraining) ceIds.push(f.carriersEdgeTraining);
    if (f.driveTest) driveTestIds.push(f.driveTest);
    if (f.drugTest) drugTestIds.push(f.drugTest);
    if (f.flatbedTraining) flatbedIds.push(f.flatbedTraining);
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const deleteManyIfAny = (Model: any, ids: Types.ObjectId[], sess: ClientSession) =>
      ids.length ? Model.deleteMany({ _id: { $in: ids } }).session(sess) : Promise.resolve({ deletedCount: 0 } as any);

    const [preQualRes, driverAppRes, policyRes, ceRes, driveTestRes, drugTestRes, flatbedRes] = await Promise.all([
      deleteManyIfAny(PreQualifications, preQualIds, session),
      deleteManyIfAny(ApplicationForm, driverAppIds, session),
      deleteManyIfAny(PoliciesConsents, policyIds, session),
      deleteManyIfAny(CarriersEdgeTraining, ceIds, session),
      deleteManyIfAny(DriveTest, driveTestIds, session),
      deleteManyIfAny(DrugTest, drugTestIds, session),
      deleteManyIfAny(FlatbedTraining, flatbedIds, session),
    ]);

    const trackerRes = await OnboardingTracker.deleteMany({ _id: { $in: trackerIds } }).session(session);

    await session.commitTransaction();

    return {
      scanned,
      deletedTrackers: trackerRes?.deletedCount ?? 0,
      deletedChildren: {
        preQualifications: preQualRes?.deletedCount ?? 0,
        driverApplications: driverAppRes?.deletedCount ?? 0,
        policiesConsents: policyRes?.deletedCount ?? 0,
        carriersEdgeTrainings: ceRes?.deletedCount ?? 0,
        driveTests: driveTestRes?.deletedCount ?? 0,
        drugTests: drugTestRes?.deletedCount ?? 0,
        flatbedTrainings: flatbedRes?.deletedCount ?? 0,
      },
      remainingHint: scanned === MAX ? "More may remain (processed up to limit)" : "Likely none beyond this batch",
      trackerIds: trackerIds.map(String),
    };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
