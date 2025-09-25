/**
 * Admin Onboarding List API client
 * --------------------------------
 * Typed wrapper around GET /api/v1/admin/onboarding
 * - Accepts already-normalized params (CSV strings, booleans as needed)
 * - Returns the 'data' payload from the API envelope
 * - Plays nicely with React Query (supports AbortSignal)
 */

import type { DashboardOnboardingItem } from "@/types/adminDashboard.types";

export type OnboardingListCounts = {
  all: number;
  driveTest: number;
  carriersEdgeTraining: number;
  drugTest: number;
};

export type OnboardingListResult = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sort: unknown;
  count: number;
  counts: OnboardingListCounts;
  items: DashboardOnboardingItem[];
};

export type OnboardingListApiEnvelope = {
  success: boolean;
  message: string;
  data: OnboardingListResult;
};

export type OnboardingListParams = {
  page?: number;
  limit?: number;
  sort?: string;

  driverName?: string;
  companyId?: string; // csv
  applicationType?: string; // csv

  completed?: boolean;
  terminated?: boolean;

  createdAtFrom?: string; // ISO
  createdAtTo?: string; // ISO

  // Either currentStep OR the CE/DT flags (backend auto-scopes on flags)
  currentStep?: string; // EStepPath string value
  carriersEdgeTrainingEmailSent?: boolean;
  drugTestDocumentsUploaded?: boolean;
};

function toQueryString(params: OnboardingListParams): string {
  const sp = new URLSearchParams();

  // Only set defined params; booleans and numbers become strings
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });

  return sp.toString();
}

/**
 * fetchOnboardingList
 * - Throws on HTTP errors (allowing React Query to surface nicely)
 * - Uses 'no-store' so the browser cache doesn't fight React Query
 */
export async function fetchOnboardingList(
  params: OnboardingListParams,
  opts?: { signal?: AbortSignal }
): Promise<OnboardingListResult> {
  const qs = toQueryString(params);
  const url = `/api/v1/admin/onboarding${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal: opts?.signal,
    headers: { Accept: "application/json" },
  });

  // Surface proper errors for 4xx/5xx
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `List request failed (${res.status}) ${
        text ? `– ${text.slice(0, 140)}` : ""
      }`
    );
  }

  const json = (await res.json()) as OnboardingListApiEnvelope;
  if (!json?.success || !json?.data) {
    throw new Error("Unexpected API envelope for onboarding list");
  }
  return json.data;
}
