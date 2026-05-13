import { NextRequest } from "next/server";

import connectDB from "@/lib/utils/connectDB";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import { guard } from "@/lib/utils/auth/authUtils";
import { searchOnboardingAuditLogs } from "@/lib/services/onboardingAuditLog.service";

/**
 * GET /api/v1/admin/audit-logs
 * Global audit log search (includes logs for onboardings that were permanently deleted).
 *
 * Query:
 *  - q: broad search (onboarding id substring, actor/driver/company fields, message)
 *  - onboardingId, actorName, actorEmail, driverName, driverEmail
 *  - action: EOnboardingAuditAction value (repeatable / CSV for multi-select)
 *  - companyId: company id (repeatable / CSV for multi-select)
 *  - dateFrom, dateTo: YYYY-MM-DD (UTC day bounds)
 *  - sort: "asc" | "desc" by createdAt (default "desc")
 *  - page (1-based), pageSize (default 25, max 100)
 */
export const GET = async (req: NextRequest) => {
  try {
    await connectDB();
    await guard();

    const url = new URL(req.url);
    const sp = url.searchParams;
    const pageRaw = sp.get("page");
    const pageSizeRaw = sp.get("pageSize");
    const sortRaw = sp.get("sort");

    // Allow `action` and `companyId` to come either as repeated params
    // (?action=A&action=B) or as CSV (?action=A,B) for flexibility.
    const actionMulti = sp.getAll("action").filter(Boolean);
    const companyMulti = sp.getAll("companyId").filter(Boolean);

    const result = await searchOnboardingAuditLogs({
      q: sp.get("q") ?? undefined,
      onboardingId: sp.get("onboardingId") ?? undefined,
      actorName: sp.get("actorName") ?? undefined,
      actorEmail: sp.get("actorEmail") ?? undefined,
      driverName: sp.get("driverName") ?? undefined,
      driverEmail: sp.get("driverEmail") ?? undefined,
      action: actionMulti.length > 0 ? actionMulti : undefined,
      companyId: companyMulti.length > 0 ? companyMulti : undefined,
      dateFrom: sp.get("dateFrom") ?? undefined,
      dateTo: sp.get("dateTo") ?? undefined,
      sort: sortRaw === "asc" ? "asc" : sortRaw === "desc" ? "desc" : undefined,
      page: pageRaw ? Number(pageRaw) : undefined,
      pageSize: pageSizeRaw ? Number(pageSizeRaw) : undefined,
    });

    return successResponse(200, "Audit logs retrieved", result);
  } catch (error) {
    return errorResponse(error);
  }
};
