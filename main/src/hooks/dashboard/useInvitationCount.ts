"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Fetches just the count of pending invitations (no filters applied)
 */
async function fetchInvitationCount(signal?: AbortSignal): Promise<number> {
  const params = new URLSearchParams({
    page: "1",
    limit: "1", // Minimum limit to reduce data transfer
    invitationApproved: "false",
    terminated: "false",
  });

  const res = await fetch(`/api/v1/admin/onboarding/invitations?${params.toString()}`, {
    method: "GET",
    signal,
  });

  if (!res.ok) {
    throw new Error("Failed to fetch invitation count");
  }

  const json = await res.json();
  return json.data?.total ?? 0;
}

/**
 * Hook to get the current count of pending invitations
 * Refetches on mount and every 30 seconds
 */
export function useInvitationCount() {
  const query = useQuery<number>({
    queryKey: ["invitation-count"],
    queryFn: ({ signal }) => fetchInvitationCount(signal),
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnMount: true,
    staleTime: 20000, // Consider data stale after 20 seconds
    retry: 2,
  });

  return {
    count: query.data ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

