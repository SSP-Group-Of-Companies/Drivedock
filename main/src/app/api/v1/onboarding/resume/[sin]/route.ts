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

    console.log("Resume API called with SIN:", sin);

    if (!isValidSIN(sin)) {
      console.log("SIN validation failed for:", sin);
      return errorResponse(400, "Invalid SIN");
    }

    console.log("SIN validation passed for:", sin);

    const sinHash = hashString(sin);
    console.log("Looking for tracker with sinHash:", sinHash);
    const tracker = await OnboardingTracker.findOne({ sinHash });

    if (!tracker) {
      console.log("No tracker found for sinHash:", sinHash);
      return errorResponse(404, "No onboarding record found");
    }

    console.log("Tracker found:", tracker.id);

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
