import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import DrugTest from "@/mongoose/models/DrugTest";
import CarriersEdgeTraining from "@/mongoose/models/CarriersEdgeTraining";

import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import {
  advanceProgress,
  buildTrackerContext,
  hasReachedStep,
  nextResumeExpiry,
} from "@/lib/utils/onboardingUtils";
import { readMongooseRefField } from "@/lib/utils/mongooseRef";
import { parseJsonBody } from "@/lib/utils/reqParser";

import { deleteS3Objects, finalizePhoto } from "@/lib/utils/s3Upload";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { ES3Folder } from "@/types/aws.types";
import { IPhoto } from "@/types/shared.types";
import { EStepPath } from "@/types/onboardingTracker.types";
import { EDrugTestStatus } from "@/types/drugTest.types";
import ApplicationForm from "@/mongoose/models/ApplicationForm";

/**
 * GET /api/v1/admin/onboarding/[id]/safety-processing
 * Returns:
 *  - onboardingContext (now enriched with itemSummary: { driverName, driverEmail })
 *  - driveTest / carriersEdge / drugTest (as before)
 *  - identifications: { driverLicenseExpiration }   <-- NEW (for notifications)
 */
export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc)
      return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.terminated)
      return errorResponse(400, "Onboarding document terminated");

    // Existing form snapshots
    const drugTest = readMongooseRefField(onboardingDoc.forms?.drugTest) ?? {};
    const carriersEdge =
      readMongooseRefField(onboardingDoc.forms?.carriersEdgeTraining) ?? {};
    const driveTest =
      readMongooseRefField(onboardingDoc.forms?.driveTest) ?? {};

    // --- Resolve driver name/email + license expiry (index 0) from ApplicationForm ---
    let driverName: string | undefined;
    let driverEmail: string | undefined;
    let driverLicenseExpiration: Date | undefined;

    const driverAppRef: any = onboardingDoc.forms?.driverApplication;

    const tryExtractFromDoc = (doc: any) => {
      const fn = doc?.page1?.firstName ?? "";
      const ln = doc?.page1?.lastName ?? "";
      const nm = `${fn} ${ln}`.trim();
      driverName = nm || undefined;
      driverEmail = doc?.page1?.email ?? undefined;

      // licenses can be either at page1.licenses[] or (rarely) root.licenses[]
      const licensesArr =
        (Array.isArray(doc?.page1?.licenses)
          ? doc.page1.licenses
          : undefined) ??
        (Array.isArray(doc?.licenses) ? doc.licenses : undefined);

      const first = Array.isArray(licensesArr) ? licensesArr[0] : undefined;
      const lic = first?.licenseExpiry;
      if (lic) {
        const d = new Date(lic);
        if (!Number.isNaN(d.getTime())) driverLicenseExpiration = d;
      }
    };

    if (
      driverAppRef?._id &&
      typeof driverAppRef === "object" &&
      !driverAppRef.page1
    ) {
      // This is an ObjectId reference, not a populated document
      const driverAppId = driverAppRef.toString();

      if (driverAppId && isValidObjectId(driverAppId)) {
        const appDoc = await ApplicationForm.findById(driverAppId, {
          "page1.firstName": 1,
          "page1.lastName": 1,
          "page1.email": 1,
          "page1.licenses": 1,
          licenses: 1,
        }).lean();

        if (appDoc) tryExtractFromDoc(appDoc);
      }
    } else if (driverAppRef?.page1) {
      // This is already a populated document
      tryExtractFromDoc(driverAppRef);
    } else {
      // No driverAppRef at all, try fallback

      // Fallback: try to find any ApplicationForm associated with this onboarding tracker
      const fallbackAppDoc = await ApplicationForm.findOne(
        { onboardingTrackerId: onboardingId },
        {
          "page1.firstName": 1,
          "page1.lastName": 1,
          "page1.email": 1,
          "page1.licenses": 1,
          licenses: 1,
        }
      ).lean();

      if (fallbackAppDoc) tryExtractFromDoc(fallbackAppDoc);
    }

    // Base context
    const onboardingContext = buildTrackerContext(onboardingDoc, null, true);

    // Enrich with itemSummary
    const enrichedContext = {
      ...onboardingContext,
      itemSummary: {
        ...(onboardingContext as any).itemSummary,
        ...(driverName || driverEmail
          ? { driverName, driverEmail }
          : undefined),
      },
    };

    // identifications block (license expiry for notifications)
    const identifications =
      driverLicenseExpiration != null ? { driverLicenseExpiration } : undefined;

    const responseData = {
      onboardingContext: enrichedContext,
      drugTest,
      carriersEdge,
      driveTest,
      identifications, // <-- NEW (optional if not found)
    };

    return successResponse(200, "Onboarding test data retrieved", responseData);
  } catch (error) {
    return errorResponse(error);
  }
};

/* =====================================================================================
 * PATCH
 * - notes?: string                                    -> updates OnboardingTracker.notes
 * - drugTest?: { documents?: IPhoto[], status?: EDrugTestStatus }
 *     - Step gate: must have reached DRUG_TEST
 *     - No-go-back: if current status === APPROVED, status cannot change
 *     - Docs: always updatable; if a docs array is provided, it must contain ≥1
 * - carriersEdgeTraining?: {
 *       certificates?: IPhoto[],
 *       emailSent?: boolean, emailSentBy?: string, emailSentAt?: string|Date,
 *       completed?: boolean
 *   }
 *     - Step gate: must have reached CARRIERS_EDGE_TRAINING
 *     - No-go-back:
 *         * once emailSent===true, cannot set back to false; emailSentBy/At immutable
 *         * once completed===true, cannot set back to false
 *     - Certificates always updatable
 *     - **NEW RULE**: cannot set completed=true unless certificates length ≥ 1 (post-update)
 * ===================================================================================== */

const TEMP_PREFIX = `${S3_TEMP_FOLDER}/`;

async function finalizePhotosIfNeeded(
  incoming: IPhoto[] | undefined,
  finalFolder: string
): Promise<IPhoto[] | undefined> {
  if (!Array.isArray(incoming)) return undefined;
  const out: IPhoto[] = [];
  for (const p of incoming) {
    if (!p?.s3Key) continue;
    if (p.s3Key.startsWith(TEMP_PREFIX)) {
      out.push(await finalizePhoto(p, finalFolder));
    } else {
      out.push(p);
    }
  }
  return out;
}

async function deleteRemovedFinalized(
  prev: IPhoto[] | undefined,
  next: IPhoto[] | undefined
) {
  const collectKeys = (arr?: IPhoto[]) =>
    Array.isArray(arr)
      ? arr.map((p) => p?.s3Key).filter((k): k is string => !!k)
      : [];
  const prevKeys = new Set(collectKeys(prev));
  const newKeys = new Set(collectKeys(next));
  const removedFinalized = [...prevKeys].filter(
    (k) => !newKeys.has(k) && !k.startsWith(TEMP_PREFIX)
  );
  if (removedFinalized.length) {
    try {
      await deleteS3Objects(removedFinalized);
    } catch (e) {
      console.warn("Failed to delete removed finalized S3 keys:", e);
    }
  }
}

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId))
      return errorResponse(400, "Invalid onboarding ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc)
      return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.terminated)
      return errorResponse(400, "Onboarding document terminated");

    const body = await parseJsonBody<{
      notes?: string;
      drugTest?: { documents?: IPhoto[]; status?: EDrugTestStatus };
      carriersEdgeTraining?: {
        certificates?: IPhoto[];
        emailSent?: boolean;
        emailSentBy?: string;
        emailSentAt?: string | Date;
        completed?: boolean;
      };
    }>(req);
    if (!body || typeof body !== "object")
      return errorResponse(400, "Invalid payload");

    // Track updated docs to return fresh snapshots
    let updatedDrugTest: any | null = null;
    let updatedCarriersEdge: any | null = null;

    /* ------------------------------- NOTES ------------------------------- */
    if (typeof body.notes === "string") {
      onboardingDoc.notes = body.notes;
    }

    /* ----------------------------- DRUG TEST ----------------------------- */
    if (body.drugTest) {
      if (!hasReachedStep(onboardingDoc, EStepPath.DRUG_TEST)) {
        return errorResponse(
          401,
          "Driver has not reached the Drug Test step yet"
        );
      }

      let drugTestDoc = onboardingDoc.forms?.drugTest
        ? await DrugTest.findById(onboardingDoc.forms.drugTest)
        : null;

      if (!drugTestDoc) {
        drugTestDoc = await DrugTest.create({
          documents: [],
          status: EDrugTestStatus.NOT_UPLOADED,
        });
        onboardingDoc.set("forms.drugTest", drugTestDoc._id);
      }

      const prevDocs = Array.isArray(drugTestDoc.documents)
        ? [...drugTestDoc.documents]
        : [];
      const incomingDocs = body.drugTest.documents;

      if (Array.isArray(incomingDocs)) {
        const finalFolder = `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.DRUG_TEST_PHOTOS}/${onboardingDoc.id}`;
        const nextDocs = await finalizePhotosIfNeeded(
          incomingDocs,
          finalFolder
        );

        if (!nextDocs || nextDocs.length === 0) {
          return errorResponse(
            400,
            "At least one drug test document is required"
          );
        }

        await deleteRemovedFinalized(prevDocs, nextDocs);
        drugTestDoc.documents = nextDocs;
      }

      // status no-go-back + require ≥1 doc for APPROVED
      if (typeof body.drugTest.status === "string") {
        const incomingStatus = body.drugTest.status as EDrugTestStatus;
        const allowed = Object.values(EDrugTestStatus);
        if (!allowed.includes(incomingStatus)) {
          return errorResponse(
            400,
            `Invalid status. Allowed values are: ${allowed.join(", ")}`
          );
        }
        if (
          drugTestDoc.status === EDrugTestStatus.APPROVED &&
          incomingStatus !== EDrugTestStatus.APPROVED
        ) {
          return errorResponse(
            400,
            "Drug test status is already APPROVED and cannot be changed"
          );
        }

        // NEW: require at least one document when approving
        if (incomingStatus === EDrugTestStatus.APPROVED) {
          const hasExisting =
            Array.isArray(drugTestDoc.documents) &&
            drugTestDoc.documents.length > 0;
          const hasIncoming =
            Array.isArray(body.drugTest.documents) &&
            body.drugTest.documents.length > 0;
          if (!hasExisting && !hasIncoming) {
            return errorResponse(
              400,
              "Cannot approve Drug Test until at least one document is uploaded"
            );
          }
        }

        drugTestDoc.status = incomingStatus;
      }

      await drugTestDoc.save();
      updatedDrugTest = drugTestDoc.toObject();

      // update tracker status - move on to next step and will be marked as completed if last step
      console.log("drug test", onboardingDoc.status);
      onboardingDoc.status = advanceProgress(
        onboardingDoc,
        EStepPath.DRUG_TEST
      );
      console.log("drug test", onboardingDoc.status);
    }

    /* ----------------------- CARRIERS EDGE TRAINING ---------------------- */
    if (body.carriersEdgeTraining) {
      if (!hasReachedStep(onboardingDoc, EStepPath.CARRIERS_EDGE_TRAINING)) {
        return errorResponse(
          401,
          "Driver has not reached the CarriersEdge Training step yet"
        );
      }

      let ceDoc = onboardingDoc.forms?.carriersEdgeTraining
        ? await CarriersEdgeTraining.findById(
            onboardingDoc.forms.carriersEdgeTraining
          )
        : null;

      if (!ceDoc) {
        ceDoc = await CarriersEdgeTraining.create({
          emailSent: false,
          certificates: [],
          completed: false,
        });
        onboardingDoc.set("forms.carriersEdgeTraining", ceDoc._id);
      }

      // Certificates are always updatable
      if (Array.isArray(body.carriersEdgeTraining.certificates)) {
        const prev = Array.isArray(ceDoc.certificates)
          ? [...ceDoc.certificates]
          : [];
        const finalFolder = `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.CARRIERS_EDGE_CERTIFICATES}/${onboardingDoc.id}`;
        const next = await finalizePhotosIfNeeded(
          body.carriersEdgeTraining.certificates,
          finalFolder
        );
        await deleteRemovedFinalized(prev, next);
        ceDoc.certificates = next ?? [];
      }

      // emailSent (no-go-back; and when first set to true, require by/at)
      if (typeof body.carriersEdgeTraining.emailSent === "boolean") {
        const incoming = body.carriersEdgeTraining.emailSent;
        if (ceDoc.emailSent && !incoming) {
          return errorResponse(
            400,
            "emailSent is already true and cannot be changed back to false"
          );
        }
        if (!ceDoc.emailSent && incoming === true) {
          const by = body.carriersEdgeTraining.emailSentBy;
          const at = body.carriersEdgeTraining.emailSentAt
            ? new Date(body.carriersEdgeTraining.emailSentAt)
            : undefined;
          if (!by || !String(by).trim()) {
            return errorResponse(
              400,
              "emailSentBy is required when setting emailSent=true"
            );
          }
          if (!(at instanceof Date) || isNaN(at.getTime())) {
            return errorResponse(
              400,
              "emailSentAt must be a valid date when setting emailSent=true"
            );
          }
          ceDoc.emailSent = true;
          ceDoc.emailSentBy = String(by).trim();
          ceDoc.emailSentAt = at;
        }
      } else {
        if (
          ceDoc.emailSent &&
          (body.carriersEdgeTraining.emailSentBy !== undefined ||
            body.carriersEdgeTraining.emailSentAt !== undefined)
        ) {
          return errorResponse(
            400,
            "emailSentBy/emailSentAt are immutable once emailSent is true"
          );
        }
      }

      // completed (no-go-back; requires ≥1 certificate on transition to true)
      if (typeof body.carriersEdgeTraining.completed === "boolean") {
        const incoming = body.carriersEdgeTraining.completed;

        if (ceDoc.completed && !incoming) {
          return errorResponse(
            400,
            "completed is already true and cannot be changed back to false"
          );
        }

        if (!ceDoc.completed && incoming === true) {
          const certCount = Array.isArray(ceDoc.certificates)
            ? ceDoc.certificates.length
            : 0;
          if (certCount < 1) {
            return errorResponse(
              400,
              "Cannot mark CarriersEdge training as completed until at least one certificate is uploaded"
            );
          }
          ceDoc.completed = true;
        }
      }

      await ceDoc.save();
      updatedCarriersEdge = ceDoc.toObject();

      // update tracker status - move on to next step and will be marked as completed if last step
      console.log("carriers edge training", onboardingDoc.status);
      onboardingDoc.status = advanceProgress(
        onboardingDoc,
        EStepPath.CARRIERS_EDGE_TRAINING
      );
      console.log("carriers edge training", onboardingDoc.status);
    }

    // Save tracker
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    /* ---------------------- Build GET-like response ---------------------- */

    // Fresh snapshots (prefer updated docs; else resolve from refs)
    const drugTestOut =
      updatedDrugTest ??
      readMongooseRefField(onboardingDoc.forms?.drugTest) ??
      {};

    const carriersEdgeOut =
      updatedCarriersEdge ??
      readMongooseRefField(onboardingDoc.forms?.carriersEdgeTraining) ??
      {};

    const driveTestOut =
      readMongooseRefField(onboardingDoc.forms?.driveTest) ?? {};

    // Enrich onboardingContext with driverName/email like GET
    let driverName: string | undefined;
    let driverEmail: string | undefined;
    let driverLicenseExpiration: Date | undefined;

    const driverAppRef: any = onboardingDoc.forms?.driverApplication;

    const tryExtractFromDoc = (doc: any) => {
      const fn = doc?.page1?.firstName ?? "";
      const ln = doc?.page1?.lastName ?? "";
      const nm = `${fn} ${ln}`.trim();
      driverName = nm || undefined;
      driverEmail = doc?.page1?.email ?? undefined;

      const licensesArr =
        (Array.isArray(doc?.page1?.licenses)
          ? doc.page1.licenses
          : undefined) ??
        (Array.isArray(doc?.licenses) ? doc.licenses : undefined);

      const first = Array.isArray(licensesArr) ? licensesArr[0] : undefined;
      const lic = first?.licenseExpiry;
      if (lic) {
        const d = new Date(lic);
        if (!Number.isNaN(d.getTime())) driverLicenseExpiration = d;
      }
    };

    if (
      driverAppRef?._id &&
      typeof driverAppRef === "object" &&
      !driverAppRef.page1
    ) {
      const driverAppId = driverAppRef.toString();
      if (driverAppId && isValidObjectId(driverAppId)) {
        const appDoc = await ApplicationForm.findById(driverAppId, {
          "page1.firstName": 1,
          "page1.lastName": 1,
          "page1.email": 1,
          "page1.licenses": 1,
          licenses: 1,
        }).lean();
        if (appDoc) tryExtractFromDoc(appDoc);
      }
    } else if (driverAppRef?.page1) {
      tryExtractFromDoc(driverAppRef);
    } else {
      const fallbackAppDoc = await ApplicationForm.findOne(
        { onboardingTrackerId: onboardingId },
        {
          "page1.firstName": 1,
          "page1.lastName": 1,
          "page1.email": 1,
          "page1.licenses": 1,
          licenses: 1,
        }
      ).lean();
      if (fallbackAppDoc) tryExtractFromDoc(fallbackAppDoc);
    }

    const baseContext = buildTrackerContext(onboardingDoc, null, true);
    const enrichedContext = {
      ...baseContext,
      itemSummary: {
        ...(baseContext as any).itemSummary,
        ...(driverName || driverEmail
          ? { driverName, driverEmail }
          : undefined),
      },
    };

    const identifications =
      driverLicenseExpiration != null ? { driverLicenseExpiration } : undefined;

    return successResponse(200, "Onboarding safety data updated", {
      onboardingContext: enrichedContext,
      drugTest: drugTestOut,
      carriersEdge: carriersEdgeOut,
      driveTest: driveTestOut,
      identifications,
    });
  } catch (err) {
    return errorResponse(err);
  }
};
