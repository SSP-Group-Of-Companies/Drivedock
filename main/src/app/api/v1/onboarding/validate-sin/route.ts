import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import connectDB from "@/lib/utils/connectDB";
import { hashString } from "@/lib/utils/cryptoUtils";
import { isValidSIN } from "@/lib/utils/validationUtils";
import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    await connectDB();

    const body = await req.json();
    const { sin } = body;

    if (!sin || typeof sin !== "string") {
      return errorResponse(400, "SIN is required");
    }

    if (!isValidSIN(sin)) {
      return errorResponse(400, "Invalid SIN format");
    }

    const sinHash = hashString(sin);
    const existingTracker = await OnboardingTracker.findOne({ sinHash });

    if (existingTracker) {
      return errorResponse(400, "Application with this SIN already exists");
    }

    return successResponse(200, "SIN is available", { available: true });
  } catch (error) {
    return errorResponse(error);
  }
}; 