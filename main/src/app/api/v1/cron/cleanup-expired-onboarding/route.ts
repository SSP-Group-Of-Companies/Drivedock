import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { bulkCascadeDeleteExpiredTrackers } from "@/lib/services/onboardingCleanup";

/**
 * POST /api/cron/cleanup-expired-onboarding
 * Header: Authorization: Bearer <CRON_SECRET>
 * Optional: ?limit=500  (hard-capped to 5000)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;

    if (!process.env.CRON_SECRET || auth !== expected) {
      return errorResponse(401, "unauthorized");
    }

    const limitParam = req.nextUrl.searchParams.get("limit");
    const rawLimit = limitParam ? Number(limitParam) : 500;
    const limitApplied = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 500), 5000);

    const now = new Date();
    const result = await bulkCascadeDeleteExpiredTrackers(now, limitApplied);

    return successResponse(200, "cleanup complete", {
      ranAt: now.toISOString(),
      limitApplied,
      ...result,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

// optional health check (no secret required; does not perform cleanup)
export async function GET() {
  return successResponse(200, "ok", { route: "cleanup-expired-onboarding" });
}
