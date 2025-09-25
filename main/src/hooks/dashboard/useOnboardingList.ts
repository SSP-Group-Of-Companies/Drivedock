"use client";

/**
 * useOnboardingList
 * -----------------
 * Data hook for the dashboard homepage list.
 * - Consumes URL-normalized apiParams from useAdminOnboardingQueryState
 * - Uses React Query WITHOUT keeping previous data, so no "flash" of old rows
 * - Provides coordinated loading states to prevent UI flickering
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

  // Enhanced loading state logic to prevent data flashing and ensure clean transitions
  const isFetching = q.isFetching; // True during any fetch (initial or background)
  
  // Prevent showing cached data when parameters change (like switching to terminated)
  // Only show data when we're not fetching and have fresh data
  const shouldShowData = !isFetching && q.data;
  const safeData = shouldShowData ? q.data : null;
  
  // Show loading state when we're fetching OR when we don't have safe data to show
  const isLoading = isFetching || !safeData;

  return {
    data: safeData,
    isLoading,
    isFetching,
    hasData: Boolean(safeData?.items && safeData.items.length > 0),
    isDefinitelyEmpty: !isLoading && !isFetching && safeData && safeData.items.length === 0,
    isError: q.isError,
    error: q.error as Error | null,

    params: apiParams,
    uiQuery: query,

    refetch: q.refetch,
    queryState: q,
  };
}
