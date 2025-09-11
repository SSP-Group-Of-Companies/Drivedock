// app/api/v1/onboarding/[id]/drive-test/pre-trip-assessment/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import DriveTest from "@/mongoose/models/DriveTest";
import { EStepPath, ETerminationType } from "@/types/onboardingTracker.types";
import { buildTrackerContext, hasReachedStep, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { isValidObjectId } from "mongoose";
import { deleteS3Objects, finalizeAsset } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { S3_SUBMISSIONS_FOLDER } from "@/constants/aws";
import { IPreTripAssessment, IDriveTest, EDriveTestOverall } from "@/types/driveTest.types";
import { parseJsonBody } from "@/lib/utils/reqParser";
import ApplicationForm from "@/mongoose/models/ApplicationForm";

/**
 * GET /drive-test/pre-trip-assessment
 * - Gated by access to DRIVE_TEST
 * - Returns { preTrip: IPreTripAssessment } or {} if not present
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

    return successResponse(200, "pre-trip assessment data retrieved", {
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
 * POST /drive-test/pre-trip-assessment
 * Body:
 * {
 *   "driveTest": {
 *     "powerUnitType": string,
 *     "trailerType": string,
 *     "preTrip": IPreTripAssessment
 *   }
 * }
 *
 * Rules:
 * - If a DriveTest doc exists with preTrip already set OR driveTest.completed === true -> 401
 * - Finalize supervisorSignature (temp-files -> final folder)
 * - If preTrip.overallAssessment === "fail":
 *     - terminate onboardingDoc
 *     - reset preTrip on DriveTest (remove it)
 *     - return success (terminated = true)
 * - If "pass" or "conditional_pass":
 *     - save preTrip
 *     - refresh resume window
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

    const body = await parseJsonBody<{ driveTest?: Partial<IDriveTest> }>(req);
    const payload = body?.driveTest;
    if (!payload) return errorResponse(400, "Missing 'driveTest' in request body");

    const { powerUnitType, trailerType, preTrip } = payload as {
      powerUnitType?: string;
      trailerType?: string;
      preTrip?: IPreTripAssessment;
    };

    if (!powerUnitType) return errorResponse(400, "powerUnitType is required");
    if (!trailerType) return errorResponse(400, "trailerType is required");
    if (!preTrip) return errorResponse(400, "preTrip is required");

    // Load linked DriveTest (if any)
    const driveTestId = onboardingDoc.forms?.driveTest as any;
    const existingDoc = driveTestId ? await DriveTest.findById(driveTestId) : null;

    if (existingDoc?.completed) return errorResponse(401, "Drive test is already marked as completed");
    if (existingDoc?.preTrip) return errorResponse(401, "Pre-trip assessment already submitted");

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

    // A) Pure validation (in-memory)
    const validateDoc = new DriveTest({ powerUnitType, trailerType, preTrip });
    await validateDoc.validate(["powerUnitType", "trailerType", "preTrip"]);

    // B) Finalize signature BEFORE any DB write (may throw)
    const sig = preTrip.supervisorSignature;
    if (!sig?.s3Key) return errorResponse(400, "preTrip.supervisorSignature.s3Key is required");

    const finalizedSig = await finalizeAsset(sig, `${S3_SUBMISSIONS_FOLDER}/${ES3Folder.DRIVE_TEST}/${onboardingId}`);

    const preTripToSave: IPreTripAssessment = {
      ...preTrip,
      supervisorSignature: finalizedSig,
    };

    // C) Persist (only after finalize succeeds) with compensating S3 delete on failure
    const driveTestDoc = existingDoc ?? new DriveTest();
    driveTestDoc.set("powerUnitType", powerUnitType);
    driveTestDoc.set("trailerType", trailerType);
    driveTestDoc.set("preTrip", preTripToSave);

    try {
      await driveTestDoc.validate(["powerUnitType", "trailerType", "preTrip"]);
      await driveTestDoc.save({ validateBeforeSave: false });
    } catch (err) {
      // Roll back the finalized file to avoid "moved but not saved" state
      try {
        await deleteS3Objects([finalizedSig.s3Key]);
      } catch {
        // best-effort cleanup; swallow
      }
      return errorResponse(err);
    }

    // Link to tracker only AFTER save succeeds
    if (!existingDoc) {
      onboardingDoc.forms = {
        ...(onboardingDoc.forms || {}),
        driveTest: driveTestDoc.id,
      };
    }

    // D) Business outcome
    if (driveTestDoc.preTrip?.overallAssessment === EDriveTestOverall.FAIL) {
      onboardingDoc.terminated = true;
      onboardingDoc.terminationType = ETerminationType.TERMINATED;
      onboardingDoc.terminationDate = new Date();
      // Reset fields on DriveTest
      driveTestDoc.set("powerUnitType", "");
      driveTestDoc.set("trailerType", "");
      driveTestDoc.set("preTrip", undefined);

      await Promise.all([driveTestDoc.save({ validateBeforeSave: false }), onboardingDoc.save()]);

      return successResponse(200, "Pre-trip assessment failed. Onboarding terminated.", {
        onboardingContext: buildTrackerContext(onboardingDoc, null, true),
        terminated: true,
        preTrip: {},
      });
    }

    // PASS or CONDITIONAL_PASS
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    return successResponse(200, "Pre-trip assessment saved", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.DRIVE_TEST, true),
      driveTest: driveTestDoc,
      driverName,
      driverLicense,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
