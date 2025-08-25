// app/api/v1/admin/onboarding/[id]/terminate/route.ts
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";

export const runtime = "nodejs";

export async function PATCH(_req: Request, ctx: { params: { id: string } }) {
  try {
    await connectDB();

    const doc = await OnboardingTracker.findByIdAndUpdate(
      ctx.params.id,
      { $set: { terminated: true } },
      { new: true, runValidators: true }
    );

    if (!doc) return errorResponse(404, "Onboarding tracker not found");

    return successResponse(200, "Onboarding tracker terminated", {
      _id: String(doc._id),
      terminated: !!doc.terminated,
    });
  } catch (e: any) {
    return errorResponse(500, "Failed to terminate onboarding tracker", {
      error: e?.message ?? String(e),
    });
  }
}
