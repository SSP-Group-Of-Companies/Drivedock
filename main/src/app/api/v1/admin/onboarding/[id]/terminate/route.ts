import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { guard } from "@/lib/auth/authUtils";
import { ETerminationType } from "@/types/onboardingTracker.types";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await connectDB();
    await guard();

    const body = await req.json().catch(() => ({}));
    const { terminationType } = body as { terminationType?: ETerminationType };

    // Enforce termination type on terminate
    if (!terminationType || !Object.values(ETerminationType).includes(terminationType)) {
      return errorResponse(400, "A valid terminationType is required to terminate.");
    }

    const doc = await OnboardingTracker.findByIdAndUpdate(
      id,
      {
        $set: {
          terminated: true,
          terminationType,
          terminationDate: new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!doc) return errorResponse(404, "Onboarding tracker not found");

    return successResponse(200, "Onboarding tracker terminated", {
      _id: String(doc._id),
      terminated: !!doc.terminated,
      terminationType: doc.terminationType ?? null,
      terminationDate: doc.terminationDate ? new Date(doc.terminationDate).toISOString() : null,
    });
  } catch (e: any) {
    return errorResponse(500, "Failed to terminate onboarding tracker", {
      error: e?.message ?? String(e),
    });
  }
}
