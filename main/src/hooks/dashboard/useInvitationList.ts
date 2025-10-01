"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchInvitationList, type InvitationListResult } from "@/lib/dashboard/api/adminInvitations";
import { useAdminInvitationQueryState } from "@/hooks/dashboard/useAdminInvitationQueryState";

export function useInvitationList() {
  const { apiParams, query } = useAdminInvitationQueryState();

  const q = useQuery<InvitationListResult>({
    queryKey: ["admin-invitations-list", apiParams],
    queryFn: ({ signal }) => fetchInvitationList(apiParams, { signal }),
    placeholderData: undefined,
    refetchOnMount: "always",
    staleTime: 0,
    retry: 2,
  });

  const isFetching = q.isFetching;
  const shouldShowData = !isFetching && q.data;
  const safeData = shouldShowData ? q.data : null;
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
    uiQuery: query, // InvitationQueryShape
    refetch: q.refetch,
    queryState: q,
  };
}
