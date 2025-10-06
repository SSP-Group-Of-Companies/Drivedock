// src/app/api/v1/cron/send-onboarding-completion-emails/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // allow up to 5 minutes if your plan/project allow it

import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { sendDriverCompletionPdfsEmail } from "@/lib/mail/driver/sendDriverCompletionPdfsEmail";
import { ECompanyId } from "@/constants/companies";
import { EEmailStatus } from "@/types/onboardingTracker.types";
import { CRON_SECRET } from "@/config/env";

// ---------------- Tunables ----------------
const DEFAULT_LIMIT = 50; // scan size per run (upper bound)
const HARD_CAP = 500; // max allowed via ?limit
const MAX_PER_MINUTE = 25; // stay under Exchange ~30 msgs/min/mailbox
const SAFETY_BUFFER_MS = 5_000; // leave a few seconds before hard timeout
const MAX_ATTEMPTS = 5;

// Derive a soft deadline from the function's maxDuration
const RUNTIME_SECONDS = 300; // keep in sync with export const maxDuration above
const SOFT_DEADLINE_MS = RUNTIME_SECONDS * 1000 - SAFETY_BUFFER_MS;

/**
 * POST /api/v1/cron/send-onboarding-completion-emails
 * Header: Authorization: Bearer <CRON_SECRET>
 * Optional: ?limit=50   (hard-capped to 500)
 */
export async function POST(req: NextRequest) {
  try {
    // ---- Auth ----
    const auth = req.headers.get("authorization") || "";
    if (!CRON_SECRET) return errorResponse(500, "CRON_SECRET env missing");
    if (auth !== `Bearer ${CRON_SECRET}`) return errorResponse(401, "unauthorized");

    // ---- Parse and clamp limit ----
    const limitParam = req.nextUrl.searchParams.get("limit");
    const rawLimit = limitParam ? Number(limitParam) : DEFAULT_LIMIT;
    const limitApplied = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT), HARD_CAP);

    const started = Date.now();
    await connectDB();

    // ---- Aggregate candidates WITH email available ----
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
      { $match: { email: { $type: "string", $ne: "" } } },
      { $limit: limitApplied },
    ]);

    // Scale per-run throttle to the available time budget (e.g., 5 min × 25/min = 125)
    const minutesAvailable = SOFT_DEADLINE_MS / 60_000;
    const runSendCap = Math.min(candidates.length, limitApplied, Math.max(1, Math.floor(minutesAvailable * MAX_PER_MINUTE)));

    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const t of candidates) {
      // Respect per-run throttle & time budget
      if (processed >= runSendCap) break;
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
        await sendDriverCompletionPdfsEmail({ to: t.email, companyId: claimed.companyId as ECompanyId });

        await OnboardingTracker.updateOne(
          { _id: claimed._id },
          {
            $set: {
              "emails.completionPdfs.status": EEmailStatus.SENT,
              "emails.completionPdfs.sentAt": new Date(),
              "emails.completionPdfs.lastError": null,
              // optional: "emails.completionPdfs.sentTo": t.email,
            },
          }
        );

        sent++;
      } catch (e: any) {
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
      // Optional pacing: keep well under mailbox limits even if our budget allows more
      // await new Promise((r) => setTimeout(r, 150));
    }

    const durationMs = Date.now() - started;

    const responseData = {
      ranAt: new Date().toISOString(),
      limitApplied,
      scanned: candidates.length,
      processed,
      sent,
      failed,
      durationMs,
      throttle: {
        perMinute: MAX_PER_MINUTE,
        minutesAvailable: Number(minutesAvailable.toFixed(2)),
        runSendCap,
        softDeadlineMs: SOFT_DEADLINE_MS,
      },
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
