"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type PersonalDetailsResponse } from "@/app/api/v1/admin/onboarding/[id]/application-form/personal-details/types";

// Helper function for API calls
async function fetchPersonalDetails(trackerId: string): Promise<PersonalDetailsResponse> {
  const response = await fetch(
    `/api/v1/admin/onboarding/${trackerId}/application-form/personal-details`
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

async function patchPersonalDetails(
  trackerId: string,
  data: any
): Promise<PersonalDetailsResponse> {
  const response = await fetch(
    `/api/v1/admin/onboarding/${trackerId}/application-form/personal-details`,
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

export function usePersonalDetails(trackerId: string) {
  const query = useQuery({
    queryKey: ["personal-details", trackerId],
    queryFn: () => fetchPersonalDetails(trackerId),
    enabled: !!trackerId,
    staleTime: 30_000, // 30 seconds
    retry: 1,
  });

  return query;
}

export function useUpdatePersonalDetails(trackerId: string) {
  const queryClient = useQueryClient();

  const mutate = useMutation({
    mutationFn: (data: any) => patchPersonalDetails(trackerId, data),
    
    // Optimistic update to prevent UI flicker
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["personal-details", trackerId] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData<PersonalDetailsResponse>([
        "personal-details",
        trackerId,
      ]);

      // Optimistically update the cache
      if (previousData) {
        queryClient.setQueryData<PersonalDetailsResponse>(
          ["personal-details", trackerId],
          {
            ...previousData,
            data: {
              ...previousData.data,
              personalDetails: {
                ...previousData.data.personalDetails,
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
        queryClient.setQueryData(["personal-details", trackerId], context.previousData);
      }
    },

    onSuccess: (serverData) => {
      // Update with server response
      queryClient.setQueryData<PersonalDetailsResponse>(
        ["personal-details", trackerId],
        serverData
      );
    },

    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["personal-details", trackerId] });
      // Update progress bar
      queryClient.invalidateQueries({ queryKey: ["contract-context", trackerId] });
    },
  });

  return mutate;
}
