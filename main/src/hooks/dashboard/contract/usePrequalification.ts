"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type PrequalificationsResponse } from "@/app/api/v1/admin/onboarding/[id]/prequalifications/types";

async function fetchPrequalification(trackerId: string): Promise<PrequalificationsResponse> {
  const response = await fetch(`/api/v1/admin/onboarding/${trackerId}/prequalifications`);
  if (!response.ok) {
    // Check if it's a 401 error and include the error message
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`401: ${errorData.message || 'Driver hasn\'t completed this step yet'}`);
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

async function patchPrequalification(
  trackerId: string,
  data: any
): Promise<PrequalificationsResponse> {
  const response = await fetch(
    `/api/v1/admin/onboarding/${trackerId}/prequalifications`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    // Check if it's a 401 error and include the error message
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`401: ${errorData.message || 'Driver hasn\'t completed this step yet'}`);
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || response.statusText);
  }

  return response.json();
}

export function usePrequalification(trackerId: string) {
  const query = useQuery({
    queryKey: ["prequalification", trackerId],
    queryFn: () => fetchPrequalification(trackerId),
    enabled: !!trackerId,
    staleTime: 30_000, // 30 seconds
    retry: 1,
  });

  return query;
}

export function useUpdatePrequalification(trackerId: string) {
  const queryClient = useQueryClient();

  const mutate = useMutation({
    mutationFn: (data: any) => patchPrequalification(trackerId, data),
    
    // Optimistic update to prevent UI flicker
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["prequalification", trackerId] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData<PrequalificationsResponse>([
        "prequalification",
        trackerId,
      ]);

      // Optimistically update the cache
      if (previousData) {
        queryClient.setQueryData<PrequalificationsResponse>(
          ["prequalification", trackerId],
          {
            ...previousData,
            data: {
              ...previousData.data,
              preQualifications: {
                ...previousData.data.preQualifications,
                ...newData,
              },
            },
          }
        );
      }

      return { previousData };
    },

    onError: (_error, _newData, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["prequalification", trackerId], context.previousData);
      }
    },

    onSuccess: (serverData) => {
      // Update with server response
      queryClient.setQueryData<PrequalificationsResponse>(
        ["prequalification", trackerId],
        serverData
      );
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["prequalification", trackerId] });
      // Update progress bar
      queryClient.invalidateQueries({ queryKey: ["contract-context", trackerId] });
    },
  });

  return mutate;
}
