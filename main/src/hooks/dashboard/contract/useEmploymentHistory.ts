"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type EmploymentHistoryResponse } from "@/app/api/v1/admin/onboarding/[id]/application-form/employment-history/types";

// Helper function for API calls
async function fetchEmploymentHistory(trackerId: string): Promise<EmploymentHistoryResponse> {
  const response = await fetch(
    `/api/v1/admin/onboarding/${trackerId}/application-form/employment-history`
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

async function patchEmploymentHistory(
  trackerId: string,
  data: any
): Promise<EmploymentHistoryResponse> {
  const response = await fetch(
    `/api/v1/admin/onboarding/${trackerId}/application-form/employment-history`,
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

export function useEmploymentHistory(trackerId: string) {
  const query = useQuery({
    queryKey: ["employment-history", trackerId],
    queryFn: () => fetchEmploymentHistory(trackerId),
    enabled: !!trackerId,
    staleTime: 30_000, // 30 seconds
    retry: 1,
  });

  return query;
}

export function useUpdateEmploymentHistory(trackerId: string) {
  const queryClient = useQueryClient();

  const mutate = useMutation({
    mutationFn: (data: any) => patchEmploymentHistory(trackerId, data),
    
    // Optimistic update to prevent UI flicker
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["employment-history", trackerId] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData<EmploymentHistoryResponse>([
        "employment-history",
        trackerId,
      ]);

      // Optimistically update the cache
      if (previousData) {
        queryClient.setQueryData<EmploymentHistoryResponse>(
          ["employment-history", trackerId],
          {
            ...previousData,
            data: {
              ...previousData.data,
              employmentHistory: {
                ...previousData.data.employmentHistory,
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
        queryClient.setQueryData(["employment-history", trackerId], context.previousData);
      }
    },

    onSuccess: (serverData) => {
      // Update with server response
      queryClient.setQueryData<EmploymentHistoryResponse>(
        ["employment-history", trackerId],
        serverData
      );
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["employment-history", trackerId] });
      // Update progress bar
      queryClient.invalidateQueries({ queryKey: ["contract-context", trackerId] });
    },
  });

  return mutate;
}
