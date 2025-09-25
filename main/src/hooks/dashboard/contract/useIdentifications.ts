"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type IdentificationsResponse } from "@/app/api/v1/admin/onboarding/[id]/application-form/identifications/types";

// Helper function for API calls
async function fetchIdentifications(trackerId: string): Promise<IdentificationsResponse> {
  const response = await fetch(
    `/api/v1/admin/onboarding/${trackerId}/application-form/identifications`
  );
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

async function patchIdentifications(
  trackerId: string,
  data: any
): Promise<IdentificationsResponse> {
  const response = await fetch(
    `/api/v1/admin/onboarding/${trackerId}/application-form/identifications`,
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

export function useIdentifications(trackerId: string) {
  const query = useQuery({
    queryKey: ["identifications", trackerId],
    queryFn: () => fetchIdentifications(trackerId),
    enabled: !!trackerId,
    staleTime: 30_000, // 30 seconds
    retry: 1,
  });

  return query;
}

export function useUpdateIdentifications(trackerId: string) {
  const queryClient = useQueryClient();

  const mutate = useMutation({
    mutationFn: (data: any) => patchIdentifications(trackerId, data),
    
    // Optimistic update to prevent UI flicker
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["identifications", trackerId] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData<IdentificationsResponse>([
        "identifications",
        trackerId,
      ]);

      // Optimistically update the cache
      if (previousData) {
        queryClient.setQueryData<IdentificationsResponse>(
          ["identifications", trackerId],
          {
            ...previousData,
            data: {
              ...previousData.data,
              ...newData,
            },
          }
        );
      }

      return { previousData };
    },

    onError: (_error, _newData, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["identifications", trackerId], context.previousData);
      }
    },

    onSuccess: (serverData) => {
      // Update with server response
      queryClient.setQueryData<IdentificationsResponse>(
        ["identifications", trackerId],
        serverData
      );
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["identifications", trackerId] });
      // Update progress bar
      queryClient.invalidateQueries({ queryKey: ["contract-context", trackerId] });
    },
  });

  return mutate;
}
