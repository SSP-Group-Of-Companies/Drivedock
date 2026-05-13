import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/utils/auth/authUtils";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { listOnboardingAuditLogs } from "@/lib/services/onboardingAuditLog.service";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

/**
 * GET /api/v1/admin/onboarding/:id/audit-logs
 * Query: page (1-based), pageSize (default 25, max 100)
 */
export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    const tracker = await OnboardingTracker.findById(onboardingId)
      .select("_id")
      .lean();
    if (!tracker) {
      return errorResponse(404, "Onboarding document not found");
    }

    const url = new URL(req.url);
    const page = parsePositiveInt(url.searchParams.get("page"), 1);
    const pageSizeRaw = parsePositiveInt(
      url.searchParams.get("pageSize"),
      DEFAULT_PAGE_SIZE,
    );
    const pageSize = Math.min(pageSizeRaw, MAX_PAGE_SIZE);

    const result = await listOnboardingAuditLogs(onboardingId, page, pageSize);

    return successResponse(200, "Audit logs retrieved", result);
  } catch (error) {
    return errorResponse(error);
  }
};
