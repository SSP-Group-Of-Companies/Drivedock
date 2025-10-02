import { InvitationApiParams } from "@/hooks/dashboard/useAdminInvitationQueryState";
import type { DashboardInvitationItem } from "@/types/adminDashboard.types";

export type InvitationListResult = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sort?: string;
  count: number;
  items: DashboardInvitationItem[];
};

function buildQuery(params: InvitationApiParams) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.sort) sp.set("sort", params.sort);
  if (params.driverName) sp.set("q", params.driverName); // API expects q/search
  if (params.companyId) sp.set("companyId", params.companyId);
  if (params.applicationType) sp.set("applicationType", params.applicationType);
  if (params.createdAtFrom) sp.set("createdAtFrom", params.createdAtFrom);
  if (params.createdAtTo) sp.set("createdAtTo", params.createdAtTo);
  // fixed scope (backend defaults, but include for clarity)
  sp.set("invitationApproved", "false");
  sp.set("terminated", "false");
  return sp.toString();
}

export async function fetchInvitationList(params: InvitationApiParams, { signal }: { signal?: AbortSignal } = {}): Promise<InvitationListResult> {
  const qs = buildQuery(params);
  const res = await fetch(`/api/v1/admin/onboarding/invitations?${qs}`, { method: "GET", signal });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch invitations");
  }
  const json = await res.json(); // expects { data: {...} } via successResponse
  return json.data as InvitationListResult;
}
