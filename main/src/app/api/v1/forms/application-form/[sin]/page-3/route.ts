import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { hashString } from "@/lib/utils/cryptoUtils";

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ sin: string }> }
) => {
  try {
    await connectDB();

    const { sin } = await params;
    if (!sin || sin.length !== 9)
      return errorResponse(400, "Invalid SIN in URL");

    const sinHash = hashString(sin);
    const body = await req.json();

    const onboardingDoc = await OnboardingTracker.findOne({ sinHash });
    if (!onboardingDoc)
      return errorResponse(404, "OnboardingTracker not found");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

        // check completed step
        if (appFormDoc.completedStep < 2) return errorResponse(400, "please complete previous step first");

    // update page 3
    appFormDoc.page3 = body;
    appFormDoc.currentStep = 4;
    if (appFormDoc.completedStep < 3) {
      appFormDoc.completedStep = 3;
    }
    await appFormDoc.save();

    onboardingDoc.status.currentStep = 2; // still on onboarding step 2
    onboardingDoc.status.completedStep = Math.max(
      onboardingDoc.status.completedStep,
      2
    );
    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 3 updated", {
      onboardingTracker: onboardingDoc.toObject({ virtuals: true }),
      applicationForm: appFormDoc.toObject({ virtuals: true }),
    });
  } catch (error) {
    return errorResponse(error);
  }
};
