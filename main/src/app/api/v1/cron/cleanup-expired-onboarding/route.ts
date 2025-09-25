// src/app/api/cron/cleanup-expired-onboarding/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // allow up to 5 minutes

import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { bulkCascadeDeleteExpiredTrackers } from "@/lib/services/onboardingCleanup";
import { CRON_SECRET } from "@/config/env";

// Tunables
const DEFAULT_LIMIT = 500;
const HARD_CAP = 5000;
const SAFETY_BUFFER_MS = 5_000;

// Derive a soft deadline so we exit cleanly before hard timeout
const RUNTIME_SECONDS = 300; // keep in sync with export const maxDuration
const SOFT_DEADLINE_MS = RUNTIME_SECONDS * 1000 - SAFETY_BUFFER_MS;

/**
 * POST /api/cron/cleanup-expired-onboarding
 * Header: Authorization: Bearer <CRON_SECRET>
 * Optional: ?limit=500  (hard-capped to 5000)
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
    const now = new Date();

    // ---- Run cleanup with time budget awareness ----
    const result = await bulkCascadeDeleteExpiredTrackers(now, limitApplied);

    const durationMs = Date.now() - started;
    if (durationMs > SOFT_DEADLINE_MS) {
      console.warn(`cleanup-expired-onboarding nearly hit timeout: duration=${durationMs}ms (soft=${SOFT_DEADLINE_MS})`);
    }

    const responseData = {
      ranAt: now.toISOString(),
      limitApplied,
      durationMs,
      softDeadlineMs: SOFT_DEADLINE_MS,
      ...result,
    };

    console.log(responseData);
    return successResponse(200, "cleanup complete", responseData);
  } catch (err) {
    return errorResponse(err);
  }
}

// optional health check (no secret required; does not perform cleanup)
export async function GET() {
  return successResponse(200, "ok", { route: "cleanup-expired-onboarding" });
}
