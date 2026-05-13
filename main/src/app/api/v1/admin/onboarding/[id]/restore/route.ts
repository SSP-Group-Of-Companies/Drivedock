import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { guard } from "@/lib/utils/auth/authUtils";
import {
  isInvitationApproved,
  nextResumeExpiry,
} from "@/lib/utils/onboardingUtils";
import {
  recordOnboardingAuditLogSafe,
  actorFromAdminUser,
} from "@/lib/services/onboardingAuditLog.service";
import { EOnboardingAuditAction } from "@/types/onboardingAuditLog.types";

export async function PATCH(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    await connectDB();
    const adminUser = await guard();

    // On restore: set terminated=false AND unset terminationType & terminationDate
    const doc = await OnboardingTracker.findByIdAndUpdate(
      id,
      {
        $set: { terminated: false, resumeExpiresAt: nextResumeExpiry() },
        $unset: { terminationType: 1, terminationDate: 1 },
      },
      { new: true, runValidators: true },
    );

    if (!doc) return errorResponse(404, "Onboarding document not found");
    if (!isInvitationApproved(doc))
      return errorResponse(
        400,
        "driver not yet approved for onboarding process",
      );

    await recordOnboardingAuditLogSafe({
      onboardingId: id,
      action: EOnboardingAuditAction.ONBOARDING_RESTORED,
      actor: actorFromAdminUser(adminUser),
      message:
        "Administrator restored a previously terminated onboarding; termination flags were cleared.",
      metadata: { restored: true },
    });

    return successResponse(200, "Onboarding document restored", {
      _id: String(doc._id),
      terminated: !!doc.terminated,
      terminationType: doc.terminationType ?? null,
      terminationDate: doc.terminationDate
        ? new Date(doc.terminationDate).toISOString()
        : null, // should be null after unset
    });
  } catch (e: any) {
    return errorResponse(500, "Failed to restore onboarding document", {
      error: e?.message ?? String(e),
    });
  }
}
