import { hashString } from "@/lib/utils/cryptoUtils";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/applicationForm";

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ sin: string }> }
) => {
  try {
    await connectDB();

    const { sin } = await params;
    if (!sin || sin.length !== 9) {
      return errorResponse(400, "Invalid SIN in URL");
    }

    const sinHash = hashString(sin);

    // Step 1: Find the onboarding tracker to get the linked application form
    const onboardingDoc = await OnboardingTracker.findOne({ sinHash });
    if (!onboardingDoc) {
      return errorResponse(404, "OnboardingTracker not found");
    }

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) {
      return errorResponse(404, "ApplicationForm not linked");
    }

    // Step 2: Retrieve the application form document
    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) {
      return errorResponse(404, "ApplicationForm not found");
    }

    // Step 3: Respond with the form data (virtuals will include decrypted SIN if defined)
    return successResponse(200, "ApplicationForm retrieved", {
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
