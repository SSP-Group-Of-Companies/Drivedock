import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import connectDB from "@/lib/utils/connectDB";
import { hashString } from "@/lib/utils/cryptoUtils";

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
      return errorResponse(404, "onboarding tracker not found");
    }

    return successResponse(
      200,
      "onboarding tracker found",
      tracker.toObject({ virtuals: true })
    );
  } catch (error) {
    return errorResponse(
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
};
