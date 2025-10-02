// src/lib/services/triggerCompletionEmail.ts
import "server-only";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { sendCompletionPdfsEmail } from "@/lib/mail/sendCompletionPdfsEmail";
import { ECompanyId } from "@/constants/companies";
import { EEmailStatus, IOnboardingTracker } from "@/types/onboardingTracker.types";

const MAX_ATTEMPTS = 5;

export type SendCompletionEmailResult = {
  ok: boolean;
  status?: EEmailStatus;
  reason?: string;
  /** Latest tracker snapshot after this operation (or null if not applicable) */
  tracker: IOnboardingTracker | null;
};

/**
 * Send completion PDFs email for a SINGLE onboarding record iff eligible.
 * Optimized DB round-trips:
 *  - CLAIM via findOneAndUpdate with full eligibility in the filter (1 op)
 *  - Fetch email from ApplicationForm (1 op)
 *  - Final status update + return updated tracker via findOneAndUpdate (1 op)
 */
export default async function sendCompletionEmailIfEligible(trackerId: string): Promise<SendCompletionEmailResult> {
  await connectDB();

  const id = trackerId;

  // 1) Atomically claim if eligible (no separate pre-read)
  const claimed = await OnboardingTracker.findOneAndUpdate(
    {
      _id: id,
      "status.completed": true,
      "emails.completionPdfs.consentGiven": true,
      "emails.completionPdfs.status": { $in: [EEmailStatus.NOT_SENT, EEmailStatus.PENDING, EEmailStatus.ERROR] },
      "emails.completionPdfs.attempts": { $lt: MAX_ATTEMPTS },
    },
    { $set: { "emails.completionPdfs.status": EEmailStatus.SENDING } },
    {
      new: true,
      projection: {
        companyId: 1,
        forms: 1,
        emails: 1,
      },
      lean: true,
    }
  );

  if (!claimed) {
    // Not eligible or already in-flight/sent; caller can fall back to the original doc they have
    return { ok: false, reason: "NOT_ELIGIBLE_OR_ALREADY_CLAIMED", tracker: null };
  }

  // 2) Resolve driver's email (single lightweight read)
  const appId = (claimed as any)?.forms?.driverApplication;
  if (!appId) {
    const tracker = await OnboardingTracker.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          "emails.completionPdfs.status": EEmailStatus.PENDING,
          "emails.completionPdfs.lastError": "NO_APPLICATION_FORM_REF",
        },
        $inc: { "emails.completionPdfs.attempts": 1 },
      },
      { new: true, lean: true }
    );
    return { ok: false, status: EEmailStatus.PENDING, reason: "NO_APPLICATION_FORM_REF", tracker };
  }

  const app = await ApplicationForm.findById(appId).select("page1.email").lean<{ page1?: { email?: string } }>();
  const email = app?.page1?.email?.trim();

  if (!email) {
    const tracker = await OnboardingTracker.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          "emails.completionPdfs.status": EEmailStatus.PENDING,
          "emails.completionPdfs.lastError": "NO_EMAIL",
        },
        $inc: { "emails.completionPdfs.attempts": 1 },
      },
      { new: true, lean: true }
    );
    return { ok: false, status: EEmailStatus.PENDING, reason: "NO_EMAIL", tracker };
  }

  // 3) Send + finalize in one update, returning the updated tracker
  try {
    await sendCompletionPdfsEmail({
      to: email,
      companyId: claimed.companyId as ECompanyId,
    });

    const finalTracker = await OnboardingTracker.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          "emails.completionPdfs.status": EEmailStatus.SENT,
          "emails.completionPdfs.sentAt": new Date(),
          "emails.completionPdfs.lastError": null,
          // Optional audit field:
          // "emails.completionPdfs.sentTo": email,
        },
      },
      { new: true, lean: true }
    );

    return { ok: true, status: EEmailStatus.SENT, tracker: finalTracker };
  } catch (e: any) {
    console.log("sending email failed: ", e);
    const prevAttempts = (claimed as any)?.emails?.completionPdfs?.attempts ?? 0;
    const hitMax = prevAttempts + 1 >= MAX_ATTEMPTS;

    const finalTracker = await OnboardingTracker.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          "emails.completionPdfs.status": hitMax ? EEmailStatus.ERROR : EEmailStatus.PENDING,
          "emails.completionPdfs.lastError": e?.message || String(e),
        },
        $inc: { "emails.completionPdfs.attempts": 1 },
      },
      { new: true, lean: true }
    );

    return {
      ok: false,
      status: hitMax ? EEmailStatus.ERROR : EEmailStatus.PENDING,
      reason: e?.message || "SEND_FAILED",
      tracker: finalTracker,
    };
  }
}
