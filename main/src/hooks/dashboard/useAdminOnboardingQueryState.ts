"use client";

/**
 * useAdminOnboardingQueryState
 * ----------------------------
 * Single source of truth for the dashboard homepage query state.
 * - URL is the canonical state (deep-linkable, shareable)
 * - Read searchParams → normalize (types, defaults)
 * - Provide setters that PATCH the URL (replace, no scroll)
 * - Produce apiParams you can pass directly to GET /api/v1/admin/onboarding
 *
 * Notes:
 * - We intentionally keep the UI "tab" logic here so that components stay dumb.
 * - CE/DT sub-states use boolean flags per backend contract and auto-scope.
 */

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { EStepPath } from "@/types/onboardingTracker.types";

/** Sort tokens supported by the backend */
export type SortToken =
  | "driverNameAsc"
  | "driverNameDesc"
  | "progress:asc"
  | "progress:desc";

/** Tabs we render on the homepage */
export type CategoryTab =
  | "all"
  | "drive-test"
  | "carriers-edge-training"
  | "drug-test";

export type QueryShape = {
  page: number;
  limit: number;
  sort?: SortToken | string; // string allows "field:dir,field:dir"
  driverName?: string;

  // Filters
  companyId?: string[]; // csv
  applicationType?: string[]; // csv
  completed?: boolean;
  terminated?: boolean;

  createdAtFrom?: string; // ISO date
  createdAtTo?: string; // ISO date

  // Derived from tabs / sub-filters
  currentTab: CategoryTab; // all | drive-test | carriers-edge-training | drug-test
  currentStep?: EStepPath; // when tab is not 'all'
  carriersEdgeTrainingEmailSent?: boolean;
  drugTestDocumentsUploaded?: boolean;
};

export type ApiParams = {
  page?: number;
  limit?: number;
  sort?: string;
  driverName?: string;
  companyId?: string; // csv
  applicationType?: string; // csv
  completed?: boolean;
  terminated?: boolean;
  createdAtFrom?: string;
  createdAtTo?: string;

  // Step or flags (backend will auto-scope when flags are present)
  currentStep?: EStepPath;
  carriersEdgeTrainingEmailSent?: boolean;
  drugTestDocumentsUploaded?: boolean;
};

/** Helpers */
const toBool = (v: string | null) =>
  v === "true" ? true : v === "false" ? false : undefined;

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

export function useAdminOnboardingQueryState() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // 1) READ + NORMALIZE -------------------------------------------------------
  const query: QueryShape = useMemo(() => {
    const page = toNumber(sp.get("page"), 1);
    const limit = Math.min(200, Math.max(1, toNumber(sp.get("limit"), 20)));
    const sort = sp.get("sort") ?? undefined;
    const driverName = sp.get("driverName")?.trim() || undefined;

    const companyId = toArray(sp.get("companyId"));
    const applicationType = toArray(sp.get("applicationType"));
    const completed = toBool(sp.get("completed"));
    const terminated = toBool(sp.get("terminated"));

    const createdAtFrom = sp.get("createdAtFrom") ?? undefined;
    const createdAtTo = sp.get("createdAtTo") ?? undefined;

    // Tab / step derivation:
    // If currentStep is present → tab is that step.
    // Else if CE/DT flags exist → tab implied by the flag.
    // Else → 'all'
    const currentStep = sp.get("currentStep") as EStepPath | null;

    let currentTab: CategoryTab = "all";
    if (currentStep === "drive-test") currentTab = "drive-test";
    else if (currentStep === "carriers-edge-training")
      currentTab = "carriers-edge-training";
    else if (currentStep === "drug-test") currentTab = "drug-test";
    else if (sp.has("carriersEdgeTrainingEmailSent"))
      currentTab = "carriers-edge-training";
    else if (sp.has("drugTestDocumentsUploaded")) currentTab = "drug-test";

    const carriersEdgeTrainingEmailSent = toBool(
      sp.get("carriersEdgeTrainingEmailSent")
    );
    const drugTestDocumentsUploaded = toBool(
      sp.get("drugTestDocumentsUploaded")
    );

    return {
      page,
      limit,
      sort: sort as SortToken | string | undefined,
      driverName,
      companyId,
      applicationType,
      completed,
      terminated,
      createdAtFrom,
      createdAtTo,
      currentTab,
      currentStep: currentStep ?? undefined,
      carriersEdgeTrainingEmailSent,
      drugTestDocumentsUploaded,
    };
  }, [sp]);

  // 2) API PARAMS (derived) ----------------------------------------------------
  const apiParams: ApiParams = useMemo(() => {
    const p: ApiParams = {
      page: query.page,
      limit: query.limit,
      sort: query.sort ? String(query.sort) : undefined,
      driverName: query.driverName,
      companyId: query.companyId?.join(","),
      applicationType: query.applicationType?.join(","),
      completed: query.completed,
      terminated: query.terminated,
      createdAtFrom: query.createdAtFrom,
      createdAtTo: query.createdAtTo,
    };

    if (query.currentTab === "drive-test") {
      p.currentStep = "drive-test" as EStepPath;
    } else if (query.currentTab === "carriers-edge-training") {
      // For CE, prefer the boolean flag; backend auto-scopes to CE when flag is present
      if (typeof query.carriersEdgeTrainingEmailSent === "boolean") {
        p.carriersEdgeTrainingEmailSent = query.carriersEdgeTrainingEmailSent;
      } else {
        p.currentStep = "carriers-edge-training" as EStepPath;
      }
    } else if (query.currentTab === "drug-test") {
      if (typeof query.drugTestDocumentsUploaded === "boolean") {
        p.drugTestDocumentsUploaded = query.drugTestDocumentsUploaded;
      } else {
        p.currentStep = "drug-test" as EStepPath;
      }
    }
    return p;
  }, [query]);

  // 3) WRITE HELPERS (update URL without scroll) -------------------------------
  const setMany = useCallback(
    (patch: Record<string, string | number | boolean | undefined | null>) => {
      const current = sp.toString();
      const next = new URLSearchParams(sp.toString());

      // Apply patch
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") next.delete(k);
        else next.set(k, String(v));
      });

      // Determine if the patch actually changed anything
      const changed = Object.keys(patch).some((k) => {
        const v = patch[k];
        const normalized =
          v === undefined || v === null || v === "" ? null : String(v);
        const curHas = sp.has(k);
        const curVal = sp.get(k);
        return normalized === null ? curHas : !curHas || curVal !== normalized;
      });

      // Only force page=1 when *something else* changed and caller did not set page
      if (changed && !("page" in patch)) {
        next.set("page", "1");
      }

      const nextStr = next.toString();

      // Exit early if URL would be identical → prevents replace loops
      if (nextStr === current) return;

      router.replace(`${pathname}?${nextStr}`, { scroll: false });
    },
    [router, pathname, sp]
  );

  // 4) PUBLIC SETTERS ----------------------------------------------------------
  const setPagination = useCallback(
    (page: number, limit?: number) => {
      setMany({ page, ...(limit ? { limit } : {}) });
    },
    [setMany]
  );

  const setDriverName = useCallback(
    (name?: string) => {
      setMany({ driverName: name?.trim() || null });
    },
    [setMany]
  );

  const setSort = useCallback(
    (sort?: SortToken | string) => {
      setMany({ sort: sort || null });
    },
    [setMany]
  );

  const setCompanyIds = useCallback(
    (ids?: string[]) => {
      setMany({ companyId: ids?.length ? ids.join(",") : null });
    },
    [setMany]
  );

  const setApplicationTypes = useCallback(
    (types?: string[]) => {
      setMany({ applicationType: types?.length ? types.join(",") : null });
    },
    [setMany]
  );

  const setCreatedRange = useCallback(
    (from?: string, to?: string) => {
      setMany({ createdAtFrom: from || null, createdAtTo: to || null });
    },
    [setMany]
  );

  const setCompleted = useCallback(
    (val?: boolean) => {
      setMany({ completed: typeof val === "boolean" ? val : null });
    },
    [setMany]
  );

  const setTerminated = useCallback(
    (val?: boolean) => {
      setMany({ terminated: typeof val === "boolean" ? val : null });
    },
    [setMany]
  );

  /** Switch top-level tab (resets step/flag params appropriately) */
  const setTab = useCallback(
    (tab: CategoryTab) => {
      const clearFlags = {
        currentStep: null,
        carriersEdgeTrainingEmailSent: null,
        drugTestDocumentsUploaded: null,
      } as const;

      if (tab === "all") {
        setMany(clearFlags);
      } else if (tab === "drive-test") {
        setMany({ ...clearFlags, currentStep: "drive-test" });
      } else if (tab === "carriers-edge-training") {
        setMany({ ...clearFlags, currentStep: "carriers-edge-training" });
      } else if (tab === "drug-test") {
        setMany({ ...clearFlags, currentStep: "drug-test" });
      }
    },
    [setMany]
  );

  /** CE sub-filter: "Email sent" | "Pending email" */
  const setCEState = useCallback(
    (emailSent: boolean | undefined) => {
      // When a CE boolean is set, we rely on auto-scoping and clear currentStep
      setMany({
        currentStep: null,
        carriersEdgeTrainingEmailSent:
          typeof emailSent === "boolean" ? emailSent : null,
        drugTestDocumentsUploaded: null,
      });
    },
    [setMany]
  );

  /** DT sub-filter: "Uploaded" | "Pending upload" */
  const setDTState = useCallback(
    (uploaded: boolean | undefined) => {
      setMany({
        currentStep: null,
        drugTestDocumentsUploaded:
          typeof uploaded === "boolean" ? uploaded : null,
        carriersEdgeTrainingEmailSent: null,
      });
    },
    [setMany]
  );

  return {
    // normalized current query (for UI)
    query,

    // params ready for the backend call
    apiParams,

    // setters
    setPagination,
    setDriverName,
    setSort,
    setCompanyIds,
    setApplicationTypes,
    setCreatedRange,
    setCompleted,
    setTerminated,
    setTab,
    setCEState,
    setDTState,
  };
}
