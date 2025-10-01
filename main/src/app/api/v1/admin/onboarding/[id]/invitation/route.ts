// src/app/api/v1/admin/onboarding/[id]/invitation/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { guard } from "@/lib/utils/auth/authUtils";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { isValidObjectId } from "mongoose";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import PreQualifications from "@/mongoose/models/Prequalifications";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import OnboardingSession from "@/mongoose/models/OnboardingSession";

import { buildTrackerContext, isInvitationApproved } from "@/lib/utils/onboardingUtils";
import { deleteS3Objects } from "@/lib/utils/s3Upload";

import type { IApplicationFormDoc, IApplicationFormPage1, ILicenseEntry } from "@/types/applicationForm.types";
import { sendDriverRejectedEmail } from "@/lib/mail/driver/sendDriverRejectedEmail";
import { sendDriverApprovedEmail } from "@/lib/mail/driver/sendDriverApprovedEmail";
import { ECompanyId } from "@/constants/companies";

/** Collect S3 keys from page1 images to clean up on hard delete */
function collectS3KeysFromApplicationForm(appFormDoc: IApplicationFormDoc | null | undefined): string[] {
  const keys = new Set<string>();
  if (!appFormDoc?.page1) return [];

  const page1: IApplicationFormPage1 = appFormDoc.page1 as any;

  // SIN photo
  const sinKey = page1.sinPhoto?.s3Key;
  if (sinKey) keys.add(sinKey);

  // Licenses (front/back)
  const licenses: ILicenseEntry[] = Array.isArray(page1.licenses) ? page1.licenses : [];
  for (const lic of licenses) {
    const front = lic.licenseFrontPhoto?.s3Key;
    const back = lic.licenseBackPhoto?.s3Key;
    if (front) keys.add(front);
    if (back) keys.add(back);
  }

  // Extend for other pages in future as needed
  return Array.from(keys);
}

/** Pull driver-facing email fields from ApplicationForm.page1 */
async function getDriverEmailPayload(onboardingId: string) {
  const tracker = await OnboardingTracker.findById(onboardingId).lean();
  if (!tracker) return null;

  const appFormId = tracker.forms?.driverApplication;
  if (!appFormId) return null;

  const appFormDoc = await ApplicationForm.findById(appFormId).lean<IApplicationFormDoc | null>();
  const page1 = appFormDoc?.page1 as unknown as IApplicationFormPage1 | undefined;
  if (!page1) return null;

  const firstName = page1.firstName?.trim() || "";
  const lastName = page1.lastName?.trim() || "";
  const toEmail = page1.email?.trim() || "";

  if (!toEmail) {
    // Email is required by schema, but guard anyway.
    return {
      tracker,
      appFormDoc,
      firstName,
      lastName,
      toEmail: null as unknown as string,
    };
  }

  return {
    tracker,
    appFormDoc,
    firstName,
    lastName,
    toEmail,
  };
}

// ============ GET ============
// Returns both preQualifications and personalDetails for a pending-approval application
export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");

    // Must be pending approval
    if (isInvitationApproved(onboardingDoc)) return errorResponse(400, "this application is not pending approval");

    // Linked docs
    const preQualId = onboardingDoc.forms?.preQualification;
    const appFormId = onboardingDoc.forms?.driverApplication;

    if (!preQualId) return errorResponse(404, "prequalifications document not found");
    if (!appFormId) return errorResponse(404, "personalDetails of the application form not found");

    const [preQualDoc, appFormDoc] = await Promise.all([PreQualifications.findById(preQualId), ApplicationForm.findById(appFormId)]);

    if (!preQualDoc) return errorResponse(404, "prequalifications document not found");
    if (!appFormDoc?.page1) return errorResponse(404, "personalDetails of the application form not found");

    return successResponse(200, "Invitation review data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      preQualifications: preQualDoc.toObject(),
      personalDetails: appFormDoc.page1,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

// ============ POST ============
// Approve invitation: sets invitationApproved = true + send approval email to driver
export const POST = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");

    // Must be pending approval
    if (isInvitationApproved(onboardingDoc)) return errorResponse(400, "this application is not pending approval");

    // Gather driver info BEFORE save (email & names)
    const driverInfo = await getDriverEmailPayload(id);

    // Update DB
    onboardingDoc.invitationApproved = true;
    await onboardingDoc.save();

    // Build response context
    const responsePayload = {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
    };

    // Send email (best-effort; do not fail the approval if email fails)
    let emailSent = false;
    if (driverInfo?.toEmail) {
      try {
        await sendDriverApprovedEmail(req, {
          trackerId: id,
          companyId: onboardingDoc.companyId as ECompanyId,
          firstName: driverInfo.firstName,
          lastName: driverInfo.lastName,
          toEmail: driverInfo.toEmail,
        });
        emailSent = true;
      } catch (e) {
        console.error("Failed to send approval email:", e);
      }
    }

    return successResponse(200, "Application approved", {
      ...responsePayload,
      email: { approvalSent: emailSent },
    });
  } catch (error) {
    return errorResponse(error);
  }
};

// ============ DELETE ============
// Hard delete: OnboardingTracker + linked PreQualifications + ApplicationForm
// Also delete any S3 assets referenced (SIN photo + license front/back) and any onboarding sessions.
// Additionally: send rejection email to driver (optionally including a reason).
export const DELETE = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    // ---- Optional rejection reason (safe-parse body) ----
    let rejectionReason: string | undefined = undefined;
    try {
      const body = await req.json().catch(() => null);
      if (body && typeof body.reason === "string") {
        const trimmed = body.reason.trim();
        // cap to 500 chars to avoid overly long emails/logs
        rejectionReason = trimmed.length ? trimmed.slice(0, 500) : undefined;
      }
    } catch {
      // ignore body parse errors for DELETE with no body
    }

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");

    // Must be pending approval
    if (isInvitationApproved(onboardingDoc)) return errorResponse(400, "this application is not pending approval");

    // Gather linked docs & S3 keys BEFORE deletion
    const preQualId = onboardingDoc.forms?.preQualification ?? null;
    const appFormId = onboardingDoc.forms?.driverApplication ?? null;

    const appFormDoc = appFormId ? await ApplicationForm.findById(appFormId) : null;
    const s3KeysToDelete = collectS3KeysFromApplicationForm(appFormDoc);

    // Also gather driver email payload BEFORE we delete anything
    const driverInfo = await getDriverEmailPayload(id);

    // Delete Mongo docs (child docs first, then tracker)
    if (preQualId) {
      try {
        await PreQualifications.findByIdAndDelete(preQualId);
      } catch (err) {
        console.error("Failed to delete PreQualifications doc:", err);
        // non-fatal; continue
      }
    }
    if (appFormId) {
      try {
        await ApplicationForm.findByIdAndDelete(appFormId);
      } catch (err) {
        console.error("Failed to delete ApplicationForm doc:", err);
        // non-fatal; continue
      }
    }

    // Delete any onboarding sessions (best-effort)
    try {
      await OnboardingSession.deleteMany({ trackerId: id });
    } catch (err) {
      console.error("Failed to delete onboarding sessions:", err);
      // non-fatal; continue
    }

    // Finally delete the tracker
    await OnboardingTracker.findByIdAndDelete(id);

    // Delete S3 objects (best-effort)
    if (s3KeysToDelete.length > 0) {
      try {
        await deleteS3Objects(s3KeysToDelete);
      } catch (e) {
        // non-fatal; we already removed Mongo docs
        console.error("Failed to delete S3 assets for deleted invitation:", e);
      }
    }

    // Send rejection email AFTER successful deletion (best-effort)
    let emailSent = false;
    if (driverInfo?.toEmail) {
      try {
        await sendDriverRejectedEmail(req, {
          trackerId: id,
          companyId: onboardingDoc.companyId as ECompanyId,
          firstName: driverInfo.firstName,
          lastName: driverInfo.lastName,
          toEmail: driverInfo.toEmail,
          reasonOptional: rejectionReason, // <-- pass the optional reason
        });
        emailSent = true;
      } catch (e) {
        console.error("Failed to send rejection email:", e);
      }
    }

    return successResponse(200, "Invitation rejected and Application deleted", {
      email: { rejectionSent: emailSent, includedReason: Boolean(rejectionReason) },
      deleted: {
        preQualifications: Boolean(preQualId),
        applicationForm: Boolean(appFormId),
        tracker: true,
        s3ObjectsDeleted: s3KeysToDelete.length,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
