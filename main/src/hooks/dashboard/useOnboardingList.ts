"use client";

/**
 * useOnboardingList
 * -----------------
 * Data hook for the dashboard homepage list.
 * - Consumes URL-normalized apiParams from useAdminOnboardingQueryState
 * - Uses React Query WITHOUT keeping previous data, so no “flash” of old rows
 */

import { useQuery } from "@tanstack/react-query";
import {
  fetchOnboardingList,
  type OnboardingListResult,
} from "@/lib/dashboard/api/adminOnboarding";
import { useAdminOnboardingQueryState } from "./useAdminOnboardingQueryState";

export function useOnboardingList() {
  const { apiParams, query } = useAdminOnboardingQueryState();

  const q = useQuery<OnboardingListResult>({
    queryKey: ["admin-onboarding-list", apiParams],
    queryFn: ({ signal }) => fetchOnboardingList(apiParams, { signal }),

    // IMPORTANT: remove previous data carry-over
    // (just omit placeholderData entirely or set to undefined)
    placeholderData: undefined,

    // Make sure a mount always refetches fresh data for this key.
    // (Optional, but helps avoid stale flashes on navigation.)
    refetchOnMount: "always",

    // Ensure new params always trigger a fetch immediately
    staleTime: 0,

    retry: 2,
  });

  return {
    data: q.data,
    isLoading: q.isLoading && !q.data, // first load only
    isFetching: q.isFetching, // background refetches
    isError: q.isError,
    error: q.error as Error | null,

    params: apiParams,
    uiQuery: query,

    refetch: q.refetch,
    queryState: q,
  };
}
