// app/api/v1/admin/onboarding/[id]/restore/route.ts
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { guard } from "@/lib/auth/authUtils";

export async function PATCH(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await connectDB();
    await guard();

    const doc = await OnboardingTracker.findByIdAndUpdate(id, { $set: { terminated: false } }, { new: true, runValidators: true });

    if (!doc) return errorResponse(404, "Onboarding tracker not found");

    return successResponse(200, "Onboarding tracker restored", {
      _id: String(doc._id),
      terminated: !!doc.terminated,
    });
  } catch (e: any) {
    return errorResponse(500, "Failed to restore onboarding tracker", {
      error: e?.message ?? String(e),
    });
  }
}
