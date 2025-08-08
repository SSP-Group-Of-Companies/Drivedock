import { errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import connectDB from "@/lib/utils/connectDB";
import { hashString } from "@/lib/utils/cryptoUtils";
import {
  getOnboardingStepPaths,
  onboardingExpired,
} from "@/lib/utils/onboardingUtils";
import { NextRequest } from "next/server";
import { isValidSIN } from "@/lib/utils/validationUtils";

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

    // Check if resume session has expired
    if (onboardingExpired(tracker)) {
      return errorResponse(410, "Resume link has expired");
    }

    const currentStep = tracker.status.currentStep;

    const { currentUrl } = getOnboardingStepPaths(currentStep, tracker.id);

    if (!currentUrl) {
      return errorResponse(400, "Unable to resolve redirect path");
    }

    const fullUrl = new URL(currentUrl, req.url);

    // Return JSON for frontend fetch()
    return Response.json({
      success: true,
      data: {
        onboardingContext: {
          id: tracker.id,
          companyId: tracker.companyId,
          applicationType: tracker.applicationType,
          status: tracker.status,
          prevUrl: null,
          nextUrl: currentUrl,
        },
        redirectUrl: fullUrl.toString(),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
