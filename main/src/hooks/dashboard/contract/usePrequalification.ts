"use client";

import { useQuery } from "@tanstack/react-query";
import { type PrequalificationsResponse } from "@/app/api/v1/admin/onboarding/[id]/prequalifications/types";

async function fetchPrequalification(trackerId: string): Promise<PrequalificationsResponse> {
  const response = await fetch(`/api/v1/admin/onboarding/${trackerId}/prequalifications`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export function usePrequalification(trackerId: string) {
  return useQuery({
    queryKey: ["prequalification", trackerId],
    queryFn: () => fetchPrequalification(trackerId),
    staleTime: 30_000,
    retry: false, // Don't retry on 401 errors
  });
}
