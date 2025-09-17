// src/app/api/v1/cron/send-onboarding-completion-emails/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { sendCompletionPdfsEmail } from "@/lib/mail/sendCompletionPdfsEmail";
import { ECompanyId } from "@/constants/companies";
import { EEmailStatus } from "@/types/onboardingTracker.types";
import { CRON_SECRET } from "@/config/env";

// Tunables
const DEFAULT_LIMIT = 50; // scan size per run (upper bound)
const HARD_CAP = 500; // max allowed via ?limit
const MAX_PER_MINUTE = 25; // stay under Exchange ~30 msgs/min/mailbox
const SOFT_DEADLINE_MS = 55_000; // stop before typical 60s serverless timeout
const MAX_ATTEMPTS = 5;

/**
 * POST /api/v1/cron/send-onboarding-completion-emails
 * Header: Authorization: Bearer <CRON_SECRET>
 * Optional: ?limit=50   (hard-capped to 500)
 *
 * Logic:
 *  - Only scan completed + consented onboardings whose driverApplication.page1.email exists (non-empty)
 *  - For each: claim -> SENDING (atomic) -> send -> SENT or PENDING/ERROR with attempts++
 *  - Enforce per-run time budget and per-minute throttle
 */
export async function POST(req: NextRequest) {
  try {
    // ---- Auth (same pattern as your cleanup cron) ----
    const auth = req.headers.get("authorization") || "";

    if (!CRON_SECRET) return errorResponse(500, "CRON_SECRET env missing");
    const expected = `Bearer ${CRON_SECRET ?? ""}`;

    if (auth !== expected) {
      return errorResponse(401, "unauthorized");
    }

    // ---- Parse and clamp limit ----
    const limitParam = req.nextUrl.searchParams.get("limit");
    const rawLimit = limitParam ? Number(limitParam) : DEFAULT_LIMIT;
    const limitApplied = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT), HARD_CAP);

    const started = Date.now();
    await connectDB();

    // ---- Aggregate candidates WITH email available (filters out email-less docs up front) ----
    const candidates: Array<{ _id: string; companyId: ECompanyId; email: string }> = await OnboardingTracker.aggregate([
      {
        $match: {
          "status.completed": true,
          "emails.completionPdfs.consentGiven": true,
          "emails.completionPdfs.status": { $in: [EEmailStatus.NOT_SENT, EEmailStatus.PENDING, EEmailStatus.ERROR] },
          "emails.completionPdfs.attempts": { $lt: MAX_ATTEMPTS },
          "forms.driverApplication": { $type: "objectId" },
        },
      },
      { $sort: { updatedAt: 1 } },
      {
        $lookup: {
          from: ApplicationForm.collection.name,
          localField: "forms.driverApplication",
          foreignField: "_id",
          as: "app",
        },
      },
      { $unwind: "$app" },
      {
        $project: {
          _id: 1,
          companyId: 1,
          email: "$app.page1.email",
        },
      },
      // Only keep docs with a non-empty email
      { $match: { email: { $type: "string", $ne: "" } } },
      // Apply limit AFTER we know email is present
      { $limit: limitApplied },
    ]);

    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const t of candidates) {
      // Respect per-run throttle & time budget
      if (processed >= MAX_PER_MINUTE) break;
      if (Date.now() - started > SOFT_DEADLINE_MS) break;

      // Try to claim this tracker (atomic)
      const claimed = await OnboardingTracker.findOneAndUpdate(
        {
          _id: t._id,
          "emails.completionPdfs.consentGiven": true,
          "emails.completionPdfs.status": { $in: [EEmailStatus.NOT_SENT, EEmailStatus.PENDING, EEmailStatus.ERROR] },
          "emails.completionPdfs.attempts": { $lt: MAX_ATTEMPTS },
        },
        { $set: { "emails.completionPdfs.status": EEmailStatus.SENDING } },
        { new: true }
      ).lean();

      if (!claimed) continue; // already claimed elsewhere

      try {
        await sendCompletionPdfsEmail({ to: t.email, companyId: claimed.companyId as ECompanyId });

        await OnboardingTracker.updateOne(
          { _id: claimed._id },
          {
            $set: {
              "emails.completionPdfs.status": EEmailStatus.SENT,
              "emails.completionPdfs.sentAt": new Date(),
              "emails.completionPdfs.lastError": null,
              // Optional audit snapshot (add field in schema if desired):
              // "emails.completionPdfs.sentTo": t.email,
            },
          }
        );

        sent++;
      } catch (e: any) {
        // Use attempts from the claimed doc to avoid races with earlier snapshots
        const prevAttempts = (claimed as any)?.emails?.completionPdfs?.attempts ?? 0;
        const hitMax = prevAttempts + 1 >= MAX_ATTEMPTS;

        await OnboardingTracker.updateOne(
          { _id: claimed._id },
          {
            $set: {
              "emails.completionPdfs.status": hitMax ? EEmailStatus.ERROR : EEmailStatus.PENDING,
              "emails.completionPdfs.lastError": e?.message || String(e),
            },
            $inc: { "emails.completionPdfs.attempts": 1 },
          }
        );

        failed++;
      }

      processed++;
      // (Optional small delay)
      // await new Promise((r) => setTimeout(r, 150));
    }

    const durationMs = Date.now() - started;

    const responseData = {
      ranAt: new Date().toISOString(),
      limitApplied,
      scanned: candidates.length, // already excludes no-email docs
      processed,
      sent,
      failed,
      durationMs,
      throttle: { maxPerRun: MAX_PER_MINUTE, softDeadlineMs: SOFT_DEADLINE_MS },
    };

    console.log(responseData);
    return successResponse(200, "send-onboarding-completion-emails run complete", responseData);
  } catch (err) {
    return errorResponse(err);
  }
}

// Health check (no secret; does not send)
export async function GET() {
  return successResponse(200, "ok", { route: "send-onboarding-completion-emails" });
}
