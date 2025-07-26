import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import {
  decryptString,
  encryptString,
  hashString,
} from "@/lib/utils/cryptoUtils";

// PATCH /api/v1/forms/application-form/:sin/page-1
export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ sin: string }> }
) => {
  try {
    await connectDB();

    // Extract SIN from URL
    const { sin: oldSin } = await params;
    if (!oldSin || oldSin.length !== 9)
      return errorResponse(400, "Invalid SIN in URL");

    // Parse and validate new SIN from request body
    const body = await req.json();
    const newSin: string = body?.sin;
    if (!newSin || newSin.length !== 9)
      return errorResponse(400, "Invalid SIN in form data");

    // --- Step 1: Locate OnboardingTracker using old SIN hash ---
    const oldSinHash = hashString(oldSin);
    const onboardingDoc = await OnboardingTracker.findOne({
      sinHash: oldSinHash,
    });
    if (!onboardingDoc)
      return errorResponse(404, "OnboardingTracker not found");

    // --- Step 2: Locate associated ApplicationForm ---
    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId)
      return errorResponse(404, "ApplicationForm not linked to tracker");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // --- Step 3: Compare old and new SINs ---
    const currentDecryptedSin = appFormDoc.page1?.sinEncrypted
      ? decryptString(appFormDoc.page1.sinEncrypted)
      : null;

    const sinChanged = currentDecryptedSin !== newSin;
    const sinHash = hashString(newSin);
    const sinEncrypted = encryptString(newSin);

    // --- Step 4: Update ApplicationForm with new page1 data ---
    appFormDoc.page1 = {
      ...body,
      sinEncrypted,
    };
    appFormDoc.currentStep = 1;
    appFormDoc.completed = false;
    await appFormDoc.save();

    // --- Step 5: Update OnboardingTracker if SIN has changed ---
    if (sinChanged) {
      onboardingDoc.sinHash = sinHash;
      onboardingDoc.sinEncrypted = sinEncrypted;
    }

    // Update status and expiration timestamp
    onboardingDoc.status.currentStep = 2;
    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    // --- Success Response ---
    return successResponse(200, "ApplicationForm Page 1 updated", {
      onboardingTracker: onboardingDoc.toObject({ virtuals: true }),
      applicationForm: appFormDoc.toObject({ virtuals: true }),
    });
  } catch (error) {
    return errorResponse(
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
};
