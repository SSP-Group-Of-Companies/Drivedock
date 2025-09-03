import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { guard } from "@/lib/auth/authUtils";

export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await connectDB();
    await guard();

    // On restore: set terminated=false AND unset terminationType
    const doc = await OnboardingTracker.findByIdAndUpdate(id, { $set: { terminated: false }, $unset: { terminationType: 1 } }, { new: true, runValidators: true });

    if (!doc) return errorResponse(404, "Onboarding document not found");

    return successResponse(200, "Onboarding document restored", {
      _id: String(doc._id),
      terminated: !!doc.terminated,
      terminationType: doc.terminationType ?? null, // should be null after unset
    });
  } catch (e: any) {
    return errorResponse(500, "Failed to restore onboarding document", {
      error: e?.message ?? String(e),
    });
  }
}
