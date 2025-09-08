"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type ExtrasResponse } from "@/app/api/v1/admin/onboarding/[id]/application-form/extras/types";

// Helper function for API calls
async function fetchExtras(trackerId: string): Promise<ExtrasResponse> {
  const response = await fetch(
    `/api/v1/admin/onboarding/${trackerId}/application-form/extras`
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

async function patchExtras(
  trackerId: string,
  data: any
): Promise<ExtrasResponse> {
  const response = await fetch(
    `/api/v1/admin/onboarding/${trackerId}/application-form/extras`,
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

export function useExtras(trackerId: string) {
  const query = useQuery({
    queryKey: ["extras", trackerId],
    queryFn: () => fetchExtras(trackerId),
    enabled: !!trackerId,
    staleTime: 30_000, // 30 seconds
    retry: 1,
  });

  return query;
}

export function useUpdateExtras(trackerId: string) {
  const queryClient = useQueryClient();

  const mutate = useMutation({
    mutationFn: (data: any) => patchExtras(trackerId, data),
    
    // Optimistic update to prevent UI flicker
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["extras", trackerId] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData<ExtrasResponse>([
        "extras",
        trackerId,
      ]);

      // Optimistically update the cache
      if (previousData) {
        queryClient.setQueryData<ExtrasResponse>(
          ["extras", trackerId],
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
        queryClient.setQueryData(["extras", trackerId], context.previousData);
      }
    },

    onSuccess: (serverData) => {
      // Update with server response
      queryClient.setQueryData<ExtrasResponse>(
        ["extras", trackerId],
        serverData
      );
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["extras", trackerId] });
      // Update progress bar
      queryClient.invalidateQueries({ queryKey: ["contract-context", trackerId] });
    },
  });

  return mutate;
}
