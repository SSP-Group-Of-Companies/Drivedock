import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import DrugTest from "@/mongoose/models/DrugTest";
import CarriersEdgeTraining from "@/mongoose/models/CarriersEdgeTraining";

import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { advanceProgress, buildTrackerContext, hasReachedStep, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { readMongooseRefField } from "@/lib/utils/mongooseRef";
import { parseJsonBody } from "@/lib/utils/reqParser";

import { deleteS3Objects, finalizePhoto } from "@/lib/utils/s3Upload";
import { S3_SUBMISSIONS_FOLDER, S3_TEMP_FOLDER } from "@/constants/aws";
import { ES3Folder } from "@/types/aws.types";
import { IPhoto } from "@/types/shared.types";
import { EStepPath } from "@/types/onboardingTracker.types";
import { EDrugTestStatus } from "@/types/drugTest.types";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { guard } from "@/lib/auth/authUtils";

/**
 * GET /api/v1/admin/onboarding/[id]/safety-processing
 * Returns:
 *  - onboardingContext (enriched with itemSummary: { driverName, driverEmail })
 *  - driveTest / carriersEdge / drugTest (populated snapshots)
 *  - identifications: { driverLicenseExpiration }   <-- optional (for notifications)
 */
export const GET = async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    // ⭐ Populate referenced form docs so snapshots are *never* empty objects.
    const onboardingDoc = await OnboardingTracker.findById(onboardingId)
      .populate({
        path: "forms.carriersEdgeTraining",
        select: "emailSent emailSentBy emailSentAt certificates completed createdAt updatedAt",
      })
      .populate({
        path: "forms.drugTest",
        select: "documents status createdAt updatedAt",
      })
      .populate({
        path: "forms.driveTest",
        // adjust the fields to your DriveTest schema as needed
        select: "preTrip.overallAssessment preTrip.assessedAt onRoad.overallAssessment onRoad.assessedAt completed createdAt updatedAt",
      });

    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");

    // Populated form snapshots
    const drugTest = readMongooseRefField(onboardingDoc.forms?.drugTest) ?? {};
    const carriersEdge = readMongooseRefField(onboardingDoc.forms?.carriersEdgeTraining) ?? {};
    const driveTest = readMongooseRefField(onboardingDoc.forms?.driveTest) ?? {};

    // --- Resolve driver name/email + license expiry (index 0) + truck details from ApplicationForm ---
    let driverName: string | undefined;
    let driverEmail: string | undefined;
    let driverLicenseExpiration: Date | undefined;
    let truckDetails: any | undefined;
    let truckUnitNumber: string | undefined;

    const driverAppRef: any = onboardingDoc.forms?.driverApplication;

    const tryExtractFromDoc = (doc: any) => {
      const fn = doc?.page1?.firstName ?? "";
      const ln = doc?.page1?.lastName ?? "";
      const nm = `${fn} ${ln}`.trim();
      driverName = nm || undefined;
      driverEmail = doc?.page1?.email ?? undefined;

      // licenses can be either at page1.licenses[] or (rarely) root.licenses[]
      const licensesArr = (Array.isArray(doc?.page1?.licenses) ? doc.page1.licenses : undefined) ?? (Array.isArray(doc?.licenses) ? doc.licenses : undefined);

      const first = Array.isArray(licensesArr) ? licensesArr[0] : undefined;
      const lic = first?.licenseExpiry;
      if (lic) {
        const d = new Date(lic);
        if (!Number.isNaN(d.getTime())) driverLicenseExpiration = d;
      }

      // Extract truck details from page 4
      if (doc?.page4?.truckDetails) {
        truckDetails = doc.page4.truckDetails;
        truckUnitNumber = doc.page4.truckDetails.truckUnitNumber;
      }
    };

    if (driverAppRef?._id && typeof driverAppRef === "object" && !driverAppRef.page1) {
      // This is an ObjectId reference, not a populated document
      const driverAppId = driverAppRef.toString();

      if (driverAppId && isValidObjectId(driverAppId)) {
        const appDoc = await ApplicationForm.findById(driverAppId, {
          "page1.firstName": 1,
          "page1.lastName": 1,
          "page1.email": 1,
          "page1.licenses": 1,
          "page4.truckDetails": 1,
          licenses: 1,
        }).lean();

        if (appDoc) tryExtractFromDoc(appDoc);
      }
    } else if (driverAppRef?.page1) {
      // This is already a populated document
      tryExtractFromDoc(driverAppRef);
    } else {
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

    // Enrich with itemSummary and termination data
    const enrichedContext = {
      ...onboardingContext,
      terminated: onboardingDoc.terminated,
      terminationType: onboardingDoc.terminationType,
      itemSummary: {
        ...(onboardingContext as any).itemSummary,
        ...(driverName || driverEmail || truckUnitNumber ? { driverName, driverEmail, truckUnitNumber } : undefined),
      },
    };

    // identifications block (license expiry and truck details for notifications)
    const identifications =
      driverLicenseExpiration != null || truckDetails != null
        ? {
            ...(driverLicenseExpiration != null ? { driverLicenseExpiration } : {}),
            ...(truckDetails != null ? { truckDetails } : {}),
          }
        : undefined;

    const responseData = {
      onboardingContext: enrichedContext,
      drugTest,
      carriersEdge,
      driveTest,
      identifications, // optional if not found
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
 *     - **Rule**: cannot set completed=true unless certificates length ≥ 1 (post-update)
 * ===================================================================================== */

const TEMP_PREFIX = `${S3_TEMP_FOLDER}/`;

async function finalizePhotosIfNeeded(incoming: IPhoto[] | undefined, finalFolder: string): Promise<IPhoto[] | undefined> {
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

async function deleteRemovedFinalized(prev: IPhoto[] | undefined, next: IPhoto[] | undefined) {
  const collectKeys = (arr?: IPhoto[]) => (Array.isArray(arr) ? arr.map((p) => p?.s3Key).filter((k): k is string => !!k) : []);
  const prevKeys = new Set(collectKeys(prev));
  const newKeys = new Set(collectKeys(next));
  const removedFinalized = [...prevKeys].filter((k) => !newKeys.has(k) && !k.startsWith(TEMP_PREFIX));
  if (removedFinalized.length) {
    try {
      await deleteS3Objects(removedFinalized);
    } catch (e) {
      console.warn("Failed to delete removed finalized S3 keys:", e);
    }
  }
}

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Invalid onboarding ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.terminated) return errorResponse(400, "Onboarding document terminated");
    if (onboardingDoc.status.completed === true) return errorResponse(401, "onboarding process already completed");

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
    if (!body || typeof body !== "object") return errorResponse(400, "Invalid payload");

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
        return errorResponse(401, "Driver has not reached the Drug Test step yet");
      }

      let drugTestDoc = onboardingDoc.forms?.drugTest ? await DrugTest.findById(onboardingDoc.forms.drugTest) : null;

      if (!drugTestDoc) {
        drugTestDoc = await DrugTest.create({
          documents: [],
          status: EDrugTestStatus.NOT_UPLOADED,
        });
        onboardingDoc.set("forms.drugTest", drugTestDoc._id);
      }

      const prevDocs = Array.isArray(drugTestDoc.documents) ? [...drugTestDoc.documents] : [];

      const incomingDocs = body.drugTest.documents;
      const incomingStatusProvided = typeof body.drugTest.status === "string";
      const incomingStatus = incomingStatusProvided ? (body.drugTest.status as EDrugTestStatus) : undefined;

      // Track approval transition
      const wasApproved = drugTestDoc.status === EDrugTestStatus.APPROVED;

      // Handle documents replacement (if provided)
      // Handle documents replacement (if provided)
      // Allow empty arrays (needed when rejecting). We'll only forbid empty when APPROVING.
      if (Array.isArray(incomingDocs)) {
        const finalFolder = `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.DRUG_TEST_DOCS}/${onboardingDoc.id}`;
        const nextDocs = await finalizePhotosIfNeeded(incomingDocs, finalFolder);

        await deleteRemovedFinalized(prevDocs, nextDocs ?? []);
        drugTestDoc.documents = nextDocs ?? [];
      }

      // If no explicit status provided but we now have docs, move NOT_UPLOADED -> AWAITING_REVIEW
      if (
        !incomingStatusProvided &&
        Array.isArray(drugTestDoc.documents) &&
        drugTestDoc.documents.length > 0 &&
        (drugTestDoc.status === undefined || drugTestDoc.status === EDrugTestStatus.NOT_UPLOADED)
      ) {
        drugTestDoc.status = EDrugTestStatus.AWAITING_REVIEW;
      }

      // Status transitions
      if (incomingStatusProvided) {
        const allowed = Object.values(EDrugTestStatus);
        if (!allowed.includes(incomingStatus!)) {
          return errorResponse(400, `Invalid status. Allowed values are: ${allowed.join(", ")}`);
        }

        // No-go-back from APPROVED
        if (drugTestDoc.status === EDrugTestStatus.APPROVED && incomingStatus !== EDrugTestStatus.APPROVED) {
          return errorResponse(400, "Drug test status is already APPROVED and cannot be changed");
        }

        // Approve requires ≥1 document (existing or incoming)
        if (incomingStatus === EDrugTestStatus.APPROVED) {
          const hasExisting = Array.isArray(drugTestDoc.documents) && drugTestDoc.documents.length > 0;
          const hasIncoming = Array.isArray(body.drugTest.documents) && body.drugTest.documents.length > 0;
          if (!hasExisting && !hasIncoming) {
            return errorResponse(400, "Cannot approve Drug Test until at least one document is uploaded");
          }
        }

        // If REJECTED: nuke all docs (and S3) so the step isn't considered "done"
        if (incomingStatus === EDrugTestStatus.REJECTED) {
          const keysToDelete = (drugTestDoc.documents ?? []).map((p: any) => p?.s3Key).filter((k: string | undefined): k is string => !!k && !k.startsWith(TEMP_PREFIX));
          if (keysToDelete.length) {
            try {
              await deleteS3Objects(keysToDelete);
            } catch (e) {
              console.warn("Failed to delete rejected drug test S3 keys:", e);
            }
          }
          drugTestDoc.documents = [];
        }

        drugTestDoc.status = incomingStatus!;
      }

      // ✅ Only advance when the status just transitioned to APPROVED
      const approvedJustNow = !wasApproved && drugTestDoc.status === EDrugTestStatus.APPROVED;

      await drugTestDoc.save();
      updatedDrugTest = drugTestDoc.toObject();

      if (approvedJustNow) {
        onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.DRUG_TEST);
      }
    }

    /* ----------------------- CARRIERS EDGE TRAINING ---------------------- */
    if (body.carriersEdgeTraining) {
      if (!hasReachedStep(onboardingDoc, EStepPath.CARRIERS_EDGE_TRAINING)) {
        return errorResponse(401, "Driver has not reached the CarriersEdge Training step yet");
      }

      let ceDoc = onboardingDoc.forms?.carriersEdgeTraining ? await CarriersEdgeTraining.findById(onboardingDoc.forms.carriersEdgeTraining) : null;

      if (!ceDoc) {
        ceDoc = await CarriersEdgeTraining.create({
          emailSent: false,
          certificates: [],
          completed: false,
        });
        onboardingDoc.set("forms.carriersEdgeTraining", ceDoc._id);
      }

      // Track completion transition
      const wasCompleted = !!ceDoc.completed;

      // Certificates are always updatable
      if (Array.isArray(body.carriersEdgeTraining.certificates)) {
        const prev = Array.isArray(ceDoc.certificates) ? [...ceDoc.certificates] : [];
        const finalFolder = `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.CARRIERS_EDGE_CERTIFICATES}/${onboardingDoc.id}`;
        const next = await finalizePhotosIfNeeded(body.carriersEdgeTraining.certificates, finalFolder);
        await deleteRemovedFinalized(prev, next);
        ceDoc.certificates = next ?? [];
      }

      // emailSent (no-go-back; and when first set to true, require by/at)
      if (typeof body.carriersEdgeTraining.emailSent === "boolean") {
        const incoming = body.carriersEdgeTraining.emailSent;
        if (ceDoc.emailSent && !incoming) {
          return errorResponse(400, "emailSent is already true and cannot be changed back to false");
        }
        if (!ceDoc.emailSent && incoming === true) {
          const by = body.carriersEdgeTraining.emailSentBy;
          const at = body.carriersEdgeTraining.emailSentAt ? new Date(body.carriersEdgeTraining.emailSentAt) : undefined;
          if (!by || !String(by).trim()) {
            return errorResponse(400, "emailSentBy is required when setting emailSent=true");
          }
          if (!(at instanceof Date) || isNaN(at.getTime())) {
            return errorResponse(400, "emailSentAt must be a valid date when setting emailSent=true");
          }
          ceDoc.emailSent = true;
          ceDoc.emailSentBy = String(by).trim();
          ceDoc.emailSentAt = at;
        }
      } else {
        if (ceDoc.emailSent && (body.carriersEdgeTraining.emailSentBy !== undefined || body.carriersEdgeTraining.emailSentAt !== undefined)) {
          return errorResponse(400, "emailSentBy/emailSentAt are immutable once emailSent is true");
        }
      }

      // completed (no-go-back; requires ≥1 certificate on transition to true)
      if (typeof body.carriersEdgeTraining.completed === "boolean") {
        const incoming = body.carriersEdgeTraining.completed;

        if (ceDoc.completed && !incoming) {
          return errorResponse(400, "completed is already true and cannot be changed back to false");
        }

        if (!ceDoc.completed && incoming === true) {
          const certCount = Array.isArray(ceDoc.certificates) ? ceDoc.certificates.length : 0;
          if (certCount < 1) {
            return errorResponse(400, "Cannot mark CarriersEdge training as completed until at least one certificate is uploaded");
          }
          ceDoc.completed = true;
        }
      }

      await ceDoc.save();
      updatedCarriersEdge = ceDoc.toObject();

      // ✅ Only advance when CE transitions to *completed*.
      const completedJustNow = !wasCompleted && !!ceDoc.completed;
      if (completedJustNow) {
        onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.CARRIERS_EDGE_TRAINING);
      }
    }

    // Save tracker
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    /* ---------------------- Build GET-like response ---------------------- */

    // ⭐ Ensure populated refs before building response (avoids empty snapshots)
    await onboardingDoc.populate([
      {
        path: "forms.carriersEdgeTraining",
        select: "emailSent emailSentBy emailSentAt certificates completed createdAt updatedAt",
      },
      {
        path: "forms.drugTest",
        select: "documents status createdAt updatedAt",
      },
      {
        path: "forms.driveTest",
        select: "completed createdAt updatedAt",
      },
    ]);

    const drugTestOut = updatedDrugTest ?? readMongooseRefField(onboardingDoc.forms?.drugTest) ?? {};

    const carriersEdgeOut = updatedCarriersEdge ?? readMongooseRefField(onboardingDoc.forms?.carriersEdgeTraining) ?? {};

    const driveTestOut = readMongooseRefField(onboardingDoc.forms?.driveTest) ?? {};

    // Enrich onboardingContext with driverName/email like GET
    let driverName: string | undefined;
    let driverEmail: string | undefined;
    let driverLicenseExpiration: Date | undefined;
    let truckDetails: any | undefined;
    let truckUnitNumber: string | undefined;

    const driverAppRef: any = onboardingDoc.forms?.driverApplication;

    const tryExtractFromDoc = (doc: any) => {
      const fn = doc?.page1?.firstName ?? "";
      const ln = doc?.page1?.lastName ?? "";
      const nm = `${fn} ${ln}`.trim();
      driverName = nm || undefined;
      driverEmail = doc?.page1?.email ?? undefined;

      const licensesArr = (Array.isArray(doc?.page1?.licenses) ? doc.page1.licenses : undefined) ?? (Array.isArray(doc?.licenses) ? doc.licenses : undefined);

      const first = Array.isArray(licensesArr) ? licensesArr[0] : undefined;
      const lic = first?.licenseExpiry;
      if (lic) {
        const d = new Date(lic);
        if (!Number.isNaN(d.getTime())) driverLicenseExpiration = d;
      }

      // Extract truck details from page 4
      if (doc?.page4?.truckDetails) {
        truckDetails = doc.page4.truckDetails;
        truckUnitNumber = doc.page4.truckDetails.truckUnitNumber;
      }
    };

    if (driverAppRef?._id && typeof driverAppRef === "object" && !driverAppRef.page1) {
      const driverAppId = driverAppRef.toString();
      if (driverAppId && isValidObjectId(driverAppId)) {
        const appDoc = await ApplicationForm.findById(driverAppId, {
          "page1.firstName": 1,
          "page1.lastName": 1,
          "page1.email": 1,
          "page1.licenses": 1,
          "page4.truckDetails": 1,
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
        ...(driverName || driverEmail || truckUnitNumber ? { driverName, driverEmail, truckUnitNumber } : undefined),
      },
    };

    const identifications =
      driverLicenseExpiration != null || truckDetails != null
        ? {
            ...(driverLicenseExpiration != null ? { driverLicenseExpiration } : {}),
            ...(truckDetails != null ? { truckDetails } : {}),
          }
        : undefined;

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
