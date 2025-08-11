import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import connectDB from "@/lib/utils/connectDB";
import { hashString } from "@/lib/utils/cryptoUtils";
import { isValidSIN } from "@/lib/utils/validationUtils";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    await connectDB();

    const body = await req.json();
    const { sin, trackerId } = body;

    // Validate SIN
    if (!sin || typeof sin !== "string") {
      return errorResponse(400, "SIN is required");
    }
    if (!isValidSIN(sin)) {
      return errorResponse(400, "Invalid SIN format");
    }

    // If trackerId is provided, validate it
    if (trackerId && typeof trackerId !== "string") {
      return errorResponse(400, "Invalid trackerId");
    }
    if (trackerId && !isValidObjectId(trackerId)) {
      return errorResponse(400, "Invalid trackerId");
    }

    // Check if SIN is already in use
    const sinHash = hashString(sin);
    const existingTracker = await OnboardingTracker.findOne({ sinHash });

    // No tracker found = available
    if (!existingTracker) {
      return successResponse(200, "SIN is available", { available: true });
    }

    // If trackerId is provided and matches the found one → allow
    if (trackerId && existingTracker.id === trackerId) {
      return successResponse(200, "SIN is available", { available: true });
    }

    // SIN is already used by another applicant
    return errorResponse(400, "This SIN is already used by another applicant");
  } catch (error) {
    return errorResponse(error);
  }
};
