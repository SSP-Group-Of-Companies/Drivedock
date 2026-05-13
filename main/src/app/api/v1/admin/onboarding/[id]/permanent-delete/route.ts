import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/utils/auth/authUtils";
import { permanentDeleteTerminatedOnboarding } from "@/lib/services/permanentDeleteTerminatedOnboarding";
import {
  recordOnboardingAuditLogSafe,
  actorFromAdminUser,
} from "@/lib/services/onboardingAuditLog.service";
import { EOnboardingAuditAction } from "@/types/onboardingAuditLog.types";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    await connectDB();
    const adminUser = await guard();

    await recordOnboardingAuditLogSafe({
      onboardingId: id,
      action: EOnboardingAuditAction.ONBOARDING_PERMANENTLY_DELETED,
      actor: actorFromAdminUser(adminUser),
      message:
        "Administrator permanently purged a terminated onboarding and its linked records from the system.",
      metadata: { purge: true },
    });

    await permanentDeleteTerminatedOnboarding(id);

    return successResponse(200, "Onboarding permanently deleted", {});
  } catch (e: unknown) {
    return errorResponse(e);
  }
}
