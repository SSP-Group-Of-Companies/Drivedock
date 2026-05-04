import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/utils/auth/authUtils";
import { permanentDeleteTerminatedOnboarding } from "@/lib/services/permanentDeleteTerminatedOnboarding";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    await connectDB();
    await guard();

    await permanentDeleteTerminatedOnboarding(id);

    return successResponse(200, "Onboarding permanently deleted", {});
  } catch (e: unknown) {
    return errorResponse(e);
  }
}
