import { errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import connectDB from "@/lib/utils/connectDB";
import { hashString } from "@/lib/utils/cryptoUtils";
import { getOnboardingStepPaths } from "@/lib/utils/onboardingUtils";
import { NextRequest } from "next/server";
import { isValidSIN } from "@/lib/utils/validationUtils";
import { EStepPath } from "@/types/onboardingTracker.type";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ sin: string }> }
) => {
  try {
    await connectDB();
    const { sin } = await params;

    if (!isValidSIN(sin)) {
      return errorResponse(400, "Invalid SIN");
    }

    const sinHash = hashString(sin);
    const tracker = await OnboardingTracker.findOne({ sinHash });

    if (!tracker) {
      return errorResponse(404, "No onboarding record found");
    }

    const currentStep = tracker.status.currentStep as EStepPath;

    const { currentUrl } = getOnboardingStepPaths(req, currentStep, tracker.id);

    if (!currentUrl) {
      return errorResponse(400, "Unable to resolve redirect path");
    }

    return Response.redirect(currentUrl, 302);
  } catch (error) {
    return errorResponse(error);
  }
};
