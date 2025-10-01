"use client";

/**
 * useAdminInvitationQueryState
 * ----------------------------
 * Canonical query state for Invitations tab.
 * - URL is the source of truth (deep-linkable, shareable)
 * - Normalizes types & defaults
 * - Provides setters that PATCH the URL (no scroll)
 * - Produces apiParams for GET /api/v1/admin/onboarding/invitations
 */

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Sort tokens supported by the invitations API */
export type InvitationSortToken = "updatedAt:asc" | "updatedAt:desc" | "createdAt:asc" | "createdAt:desc" | "name:asc" | "name:desc";

export type InvitationQueryShape = {
  page: number;
  limit: number;
  sort?: InvitationSortToken | string;
  driverName?: string;

  // filters
  companyId?: string[]; // csv in URL, array in UI
  applicationType?: string[]; // csv in URL, array in UI
  createdAtFrom?: string; // 'YYYY-MM-DD'
  createdAtTo?: string; // 'YYYY-MM-DD'

  // fixed scope for invitations
  invitationApproved: false; // always pending approval
  terminated: false; // never terminated
};

export type InvitationApiParams = {
  page?: number;
  limit?: number;
  sort?: string;
  driverName?: string;
  companyId?: string; // csv
  applicationType?: string; // csv
  createdAtFrom?: string;
  createdAtTo?: string;

  // fixed scope sent to API
  invitationApproved: false;
  terminated: false;
};

/* helpers */
const toNumber = (v: string | null, fallback: number) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const toArray = (v: string | null): string[] | undefined =>
  v
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

export function useAdminInvitationQueryState() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  /* 1) read + normalize */
  const query: InvitationQueryShape = useMemo(() => {
    const page = toNumber(sp.get("page"), 1);
    const limit = Math.min(200, Math.max(1, toNumber(sp.get("limit"), 20)));
    const sort = sp.get("sort") ?? undefined;
    const driverName = sp.get("driverName")?.trim() || undefined;

    const companyId = toArray(sp.get("companyId"));
    const applicationType = toArray(sp.get("applicationType"));
    const createdAtFrom = sp.get("createdAtFrom") ?? undefined;
    const createdAtTo = sp.get("createdAtTo") ?? undefined;

    return {
      page,
      limit,
      sort: sort as InvitationSortToken | string | undefined,
      driverName,
      companyId,
      applicationType,
      createdAtFrom,
      createdAtTo,
      invitationApproved: false,
      terminated: false,
    };
  }, [sp]);

  /* 2) api params (derived) */
  const apiParams: InvitationApiParams = useMemo(
    () => ({
      page: query.page,
      limit: query.limit,
      sort: query.sort ? String(query.sort) : undefined,
      driverName: query.driverName,
      companyId: query.companyId?.join(","),
      applicationType: query.applicationType?.join(","),
      createdAtFrom: query.createdAtFrom,
      createdAtTo: query.createdAtTo,
      invitationApproved: false,
      terminated: false,
    }),
    [query]
  );

  /* 3) write helpers */
  const setMany = useCallback(
    (patch: Record<string, string | number | boolean | undefined | null>) => {
      const current = sp.toString();
      const next = new URLSearchParams(sp.toString());

      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") next.delete(k);
        else next.set(k, String(v));
      });

      if (!("page" in patch)) next.set("page", "1");
      const nextStr = next.toString();
      if (nextStr === current) return;

      router.replace(`${pathname}?${nextStr}`, { scroll: false });
    },
    [router, pathname, sp]
  );

  /* 4) public setters */
  const setPagination = useCallback((page: number, limit?: number) => setMany({ page, ...(limit ? { limit } : {}) }), [setMany]);
  const setDriverName = useCallback((name?: string) => setMany({ driverName: name?.trim() || null }), [setMany]);
  const setSort = useCallback((sort?: InvitationSortToken | string) => setMany({ sort: sort || null }), [setMany]);
  const setCompanyIds = useCallback((ids?: string[]) => setMany({ companyId: ids?.length ? ids.join(",") : null }), [setMany]);
  const setApplicationTypes = useCallback((types?: string[]) => setMany({ applicationType: types?.length ? types.join(",") : null }), [setMany]);
  const setCreatedRange = useCallback((from?: string, to?: string) => setMany({ createdAtFrom: from || null, createdAtTo: to || null }), [setMany]);

  return {
    query,
    apiParams,
    setPagination,
    setDriverName,
    setSort,
    setCompanyIds,
    setApplicationTypes,
    setCreatedRange,
  };
}
