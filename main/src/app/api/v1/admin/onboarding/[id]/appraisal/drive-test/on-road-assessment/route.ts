// app/api/v1/onboarding/[id]/drive-test/on-road-assessment/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import DriveTest from "@/mongoose/models/DriveTest";
import { EStepPath } from "@/types/onboardingTracker.types";
import { buildTrackerContext, hasReachedStep, advanceProgress, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { isValidObjectId } from "mongoose";
import { deleteS3Objects, finalizePhoto } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { S3_SUBMISSIONS_FOLDER } from "@/constants/aws";
import { IOnRoadAssessment, IDriveTest, EDriveTestOverall } from "@/types/driveTest.types";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { canHaveFlatbedTraining } from "@/constants/companies";
import ApplicationForm from "@/mongoose/models/ApplicationForm";

/**
 * GET /drive-test/on-road-assessment
 * - Gated by DRIVE_TEST access
 * - Returns { onRoad } or {} if not present
 */
export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");

    if (!hasReachedStep(onboardingDoc, EStepPath.DRIVE_TEST)) {
      return errorResponse(403, "driver hasn't reached this step yet");
    }

    const driveTestId = onboardingDoc.forms?.driveTest;

    let driveTestDoc: IDriveTest | null = null;
    if (driveTestId && isValidObjectId(driveTestId)) {
      driveTestDoc = await DriveTest.findById(driveTestId);
    }

    if (!driveTestDoc) return errorResponse(404, "drive test document not found");

    // Pull driverName and driverLicense from ApplicationForm.page1
    const appFormId = onboardingDoc.forms?.driverApplication;
    let driverName: string | undefined;
    let driverLicense: string | undefined;

    if (appFormId && isValidObjectId(appFormId)) {
      // Only fetch what we need from page1
      const appForm = await ApplicationForm.findById(appFormId).select("page1.firstName page1.lastName page1.licenses").lean();

      if (appForm?.page1) {
        const first = (appForm.page1 as any).firstName?.toString().trim() || "";
        const last = (appForm.page1 as any).lastName?.toString().trim() || "";
        driverName = [first, last].filter(Boolean).join(" ") || undefined;

        const licenses = (appForm.page1 as any).licenses as Array<{ licenseNumber?: string }> | undefined;
        driverLicense = licenses && licenses.length > 0 ? licenses[0]?.licenseNumber : undefined;
      }
    }

    if (!driverName || !driverLicense) return errorResponse(400, "driver information missing");

    return successResponse(200, "on-road assessment data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      driveTest: driveTestDoc,
      driverName,
      driverLicense,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * POST /drive-test/on-road-assessment
 *
 * Purpose:
 * - Save the On-Road assessment for an onboarding driver, finalize the supervisor signature photo,
 *   and complete the Drive Test flow when passed (pass or conditional_pass).
 *
 * Access / Gating:
 * - Requires a valid onboarding tracker and active session (not terminated, not expired).
 * - Requires user to have reached EStepPath.DRIVE_TEST.
 * - Requires a linked DriveTest document on the tracker.
 * - Requires a completed Pre-Trip assessment with overallAssessment ∈ {"pass","conditional_pass"}.
 *
 * Request Body:
 * {
 *   "driveTest": {
 *     "powerUnitType"?: string,      // optional; will update if provided
 *     "trailerType"?: string,        // optional; will update if provided
 *     "onRoad": IOnRoadAssessment    // required; includes sections, footer fields, and supervisorSignature
 *   }
 * }
 *
 * Flatbed Training Rules:
 * - Read companyId and applicationType from onboardingDoc.
 * - If onRoad.needsFlatbedTraining === true:
 *     - Validate feasibility via canHaveFlatbedTraining(companyId, applicationType).
 *     - If NOT feasible → 400 "Flatbed training is not applicable for this applicant/company".
 * - If feasible, we will persist onboardingDoc.needsFlatbedTraining to match onRoad.needsFlatbedTraining
 *   (only on pass/conditional).
 *
 * 401 Conditions (reject):
 * - DriveTest.completed === true
 * - PreTrip missing OR PreTrip.overallAssessment ∉ {"pass","conditional_pass"}
 * - DriveTest.onRoad already exists
 *
 * Photo Handling (S3):
 * - Finalize onRoad.supervisorSignature BEFORE any DB write:
 *     - finalizePhoto() moves from temp-files/ → final folder: submissions/drive-test/{onboardingId}
 *     - If finalize fails, abort with error (no DB writes performed).
 * - If later DB save fails after finalize → best-effort compensating delete of the finalized S3 key.
 *
 * Success Flows:
 * - If onRoad.overallAssessment === "fail":
 *     - onboardingDoc.terminated = true
 *     - DriveTest.onRoad is reset (removed)
 *     - Respond 200 with { terminated: true, onRoad: {} }
 *
 * - If onRoad.overallAssessment ∈ {"pass","conditional_pass"}:
 *     - Save onRoad to DriveTest
 *     - DriveTest.completed = true
 *     - Optionally update powerUnitType / trailerType if provided
 *     - If flatbed training is feasible, set onboardingDoc.needsFlatbedTraining = onRoad.needsFlatbedTraining (boolean)
 *     - Advance progress (advanceProgress(..., EStepPath.DRIVE_TEST)) and refresh resume window
 *     - Respond 200 with updated driveTest + onboardingContext
 *
 * Error Codes:
 * - 400: invalid onboardingId, session expired, missing/invalid body, invalid/misapplied flatbed training
 * - 401: not allowed by state (completed, pretrip not passed/conditional, onRoad already submitted)
 * - 403: driver hasn't reached DRIVE_TEST step
 * - 404: onboarding/driveTest not found
 */

export const POST = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Invalid onboarding ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.status.completed === true) return errorResponse(401, "onboarding process already completed");

    if (!hasReachedStep(onboardingDoc, EStepPath.DRIVE_TEST)) {
      return errorResponse(403, "driver hasn't reached this step yet");
    }

    const driveTestId = onboardingDoc.forms?.driveTest as any;
    if (!driveTestId) return errorResponse(404, "DriveTest not linked");

    const driveTestDoc = await DriveTest.findById(driveTestId);
    if (!driveTestDoc) return errorResponse(404, "DriveTest not found");

    // 401 conditions
    if (driveTestDoc.completed) return errorResponse(401, "Drive test already completed");
    if (!driveTestDoc.preTrip) return errorResponse(401, "Pre-trip assessment not completed");
    if (driveTestDoc.preTrip.overallAssessment !== EDriveTestOverall.PASS && driveTestDoc.preTrip.overallAssessment !== EDriveTestOverall.CONDITIONAL_PASS) {
      return errorResponse(401, "Pre-trip assessment must be pass or conditional_pass before on-road");
    }
    if (driveTestDoc.onRoad) return errorResponse(401, "On-road assessment already submitted");

    // Pull driverName and driverLicense from ApplicationForm.page1
    const appFormId = onboardingDoc.forms?.driverApplication;
    let driverName: string | undefined;
    let driverLicense: string | undefined;

    if (appFormId && isValidObjectId(appFormId)) {
      // Only fetch what we need from page1
      const appForm = await ApplicationForm.findById(appFormId).select("page1.firstName page1.lastName page1.licenses").lean();

      if (appForm?.page1) {
        const first = (appForm.page1 as any).firstName?.toString().trim() || "";
        const last = (appForm.page1 as any).lastName?.toString().trim() || "";
        driverName = [first, last].filter(Boolean).join(" ") || undefined;

        const licenses = (appForm.page1 as any).licenses as Array<{ licenseNumber?: string }> | undefined;
        driverLicense = licenses && licenses.length > 0 ? licenses[0]?.licenseNumber : undefined;
      }
    }

    if (!driverName || !driverLicense) return errorResponse(400, "driver information missing");

    // Body
    const body = await parseJsonBody<{ driveTest?: Partial<IDriveTest> }>(req);
    const payload = body?.driveTest;
    if (!payload) return errorResponse(400, "Missing 'driveTest' in request body");

    const { powerUnitType, trailerType, onRoad } = payload as {
      powerUnitType?: string;
      trailerType?: string;
      onRoad?: IOnRoadAssessment;
    };
    if (!onRoad) return errorResponse(400, "onRoad is required");

    // A) In-memory validation (structure only)
    const validateDoc = new DriveTest({
      powerUnitType: powerUnitType ?? driveTestDoc.powerUnitType,
      trailerType: trailerType ?? driveTestDoc.trailerType,
      onRoad,
    });
    await validateDoc.validate(["powerUnitType", "trailerType", "onRoad"]);

    // A.1) Flatbed training feasibility (before S3 finalize)
    const wantsFlatbedTraining = onRoad.needsFlatbedTraining === true;
    const flatbedPossible = canHaveFlatbedTraining(
      onboardingDoc.companyId as string,
      onboardingDoc.applicationType as any // app type enum if available
    );
    if (wantsFlatbedTraining && !flatbedPossible) {
      return errorResponse(400, "Flatbed training is not applicable for this applicant/company");
    }

    // B) Finalize supervisor signature BEFORE any DB write (may throw)
    const sig = onRoad.supervisorSignature;
    if (!sig?.s3Key) return errorResponse(400, "onRoad.supervisorSignature.s3Key is required");

    const finalizedSig = await finalizePhoto(sig, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.DRIVE_TEST}/${onboardingId}`);

    const onRoadToSave: IOnRoadAssessment = {
      ...onRoad,
      supervisorSignature: finalizedSig,
    };

    // C) Persist (only after finalize succeeds) with compensating delete on failure
    if (powerUnitType) driveTestDoc.set("powerUnitType", powerUnitType);
    if (trailerType) driveTestDoc.set("trailerType", trailerType);
    driveTestDoc.set("onRoad", onRoadToSave);

    try {
      await driveTestDoc.validate(["powerUnitType", "trailerType", "onRoad"]);
      await driveTestDoc.save({ validateBeforeSave: false });
    } catch (err) {
      // Roll back the finalized file to avoid orphaned photos
      try {
        await deleteS3Objects([finalizedSig.s3Key]);
      } catch {
        // best-effort cleanup
      }
      return errorResponse(err);
    }

    // D) Business outcome
    const outcome = (driveTestDoc.onRoad as any)?.overallAssessment;

    if (outcome === EDriveTestOverall.FAIL) {
      onboardingDoc.terminated = true;

      // Reset fields on DriveTest
      driveTestDoc.set("powerUnitType", "");
      driveTestDoc.set("trailerType", "");
      driveTestDoc.set("preTrip", undefined);

      await Promise.all([driveTestDoc.save({ validateBeforeSave: false }), onboardingDoc.save()]);

      return successResponse(200, "On-road assessment failed. Onboarding terminated.", {
        onboardingContext: buildTrackerContext(onboardingDoc, null, true),
        terminated: true,
        onRoad: {},
      });
    }

    // PASS or CONDITIONAL_PASS -> mark completed and advance
    driveTestDoc.completed = true;
    await driveTestDoc.save({ validateBeforeSave: false });

    // Respect flatbed training flag ONLY if it's possible for this company/app type
    if (typeof onRoad.needsFlatbedTraining === "boolean") {
      onboardingDoc.needsFlatbedTraining = flatbedPossible ? onRoad.needsFlatbedTraining === true : false;
    }

    onboardingDoc.status = advanceProgress(onboardingDoc, EStepPath.DRIVE_TEST);
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    return successResponse(200, "On-road assessment saved", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.DRIVE_TEST, true),
      driveTest: driveTestDoc,
      driverName,
      driverLicense,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
