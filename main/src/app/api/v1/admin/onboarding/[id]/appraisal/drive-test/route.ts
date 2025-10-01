// app/api/v1/onboarding/[id]/drive-test/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import DriveTest from "@/mongoose/models/DriveTest";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { EStepPath } from "@/types/onboardingTracker.types";
import { buildTrackerContext, hasReachedStep, isInvitationApproved } from "@/lib/utils/onboardingUtils";
import { isValidObjectId } from "mongoose";

/**
 * GET /drive-test
 * - Gated by access to drive test step (furthest >= DRIVE_TEST)
 * - Looks up DriveTest by ObjectId reference at onboardingDoc.forms.driveTest
 * - Also returns driverName (first + last) and driverLicense (first license's number) from ApplicationForm.page1
 * - If no DriveTest exists/linked, returns {}
 */
export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");
    if (!isInvitationApproved(onboardingDoc)) return errorResponse(400, "driver not yet approved for onboarding process");
    if (!hasReachedStep(onboardingDoc, EStepPath.DRIVE_TEST)) return errorResponse(403, "driver hasn't reached this step yet");

    // Read DriveTest reference from onboardingDoc.forms.driveTest
    const driveTestId = onboardingDoc.forms?.driveTest;
    let driveTestDoc: unknown = null;

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

    return successResponse(200, "drive test data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      driveTest: driveTestDoc ?? {},
      driverName,
      driverLicense,
    });
  } catch (error) {
    console.log(error);
    return errorResponse(error);
  }
};
