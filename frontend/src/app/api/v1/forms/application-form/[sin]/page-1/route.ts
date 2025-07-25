import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { decryptString, hashString } from "@/lib/utils/cryptoUtils";

export const PATCH = async (req: Request, { params }: { params: Promise<{ sin: string }> }) => {
  try {
    await connectDB();

    const { sin: oldSin } = await params;
    if (!oldSin || oldSin.length !== 9) {
      return errorResponse(400, 'Invalid SIN in URL');
    }

    const body = await req.json();
    const newSin = body?.sin;
    if (!newSin || newSin.length !== 9) {
      return errorResponse(400, 'Invalid SIN in form data');
    }

    // Step 1: Find OnboardingTracker by old SIN (hashed)
    const onboardingDoc = await OnboardingTracker.findOne({ sinHash: hashString(oldSin) });
    if (!onboardingDoc) return errorResponse(404, 'OnboardingTracker not found');

    // Step 2: Load associated ApplicationForm
    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, 'ApplicationForm not linked');

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, 'ApplicationForm not found');

    const currentDecryptedSin = appFormDoc.page1?.sin
      ? decryptString(appFormDoc.page1.sinEncrypted)
      : null;

    const sinChanged = currentDecryptedSin !== newSin;

    // Step 3: Update ApplicationForm Page1 data
    appFormDoc.page1 = {
      ...body,
      sin: newSin, // assigning plain sin; pre-save hook will encrypt it to sinEncrypted
    };
    appFormDoc.currentStep = 1;
    appFormDoc.completed = false;
    await appFormDoc.save();

    // Step 4: If SIN has changed, update OnboardingTracker
    if (sinChanged) {
      onboardingDoc.sin = newSin; // pre-save will hash + encrypt
    }

    onboardingDoc.status.currentStep = 2;
    onboardingDoc.resumeExpiresAt = new Date(Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC));
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 1 updated", {
      applicationForm: appFormDoc.toObject({ virtuals: true }), // includes page1.sin (decrypted)
    });

  } catch (error) {
    return errorResponse(500, error instanceof Error ? error.message : String(error));
  }
};
