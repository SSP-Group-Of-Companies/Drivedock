import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import connectDB from "@/lib/utils/connectDB";
import { hashString } from "@/lib/utils/cryptoUtils";
import { onboardingExpired } from "@/lib/utils/onboardingUtils";

export const GET = async (
  _: Request,
  { params }: { params: Promise<{ sin: string }> }
) => {
  try {
    await connectDB();
    const { sin } = await params;
    if (!sin || sin.length !== 9) {
      return errorResponse(400, "Invalid SIN");
    }

    const sinHash = hashString(sin);
    const tracker = await OnboardingTracker.findOne({ sinHash });
    if (!tracker) {
      return errorResponse(404, "Onboarding document not found");
    }

    if (onboardingExpired(tracker)) return errorResponse(400, "Onboarding session expired");

    return successResponse(
      200,
      "onboarding tracker found",
      tracker.toObject({ virtuals: true })
    );
  } catch (error) {
    return errorResponse(error);
  }
};
