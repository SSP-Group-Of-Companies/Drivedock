// app/api/admin/onboarding/[id]/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { terminated } = (await req.json()) as { terminated?: boolean };
    if (typeof terminated !== "boolean") {
      return errorResponse(400, "terminated (boolean) is required");
    }

    const doc = await OnboardingTracker.findByIdAndUpdate(
      params.id,
      { $set: { terminated } },
      { new: true, runValidators: true }
    );

    if (!doc) return errorResponse(404, "Onboarding tracker not found");

    return successResponse(200, "Onboarding tracker updated", {
      _id: String(doc._id),
      terminated: !!doc.terminated,
    });
  } catch (e: any) {
    return errorResponse(500, "Failed to update onboarding tracker", {
      error: e?.message ?? String(e),
    });
  }
}
