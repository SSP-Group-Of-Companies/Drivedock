"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSafety,
  patchSafety,
  type SafetyGetResponse,
  type SafetyPatchBody,
} from "@/lib/dashboard/api/safetyProcessing";

export function useSafetyProcessing(trackerId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["safety-processing", trackerId],
    queryFn: ({ signal }) => fetchSafety(trackerId, signal),
    enabled: !!trackerId,
    staleTime: 30_000,
    retry: 1,
  });

  const mutate = useMutation({
    mutationKey: ["safety-processing:patch", trackerId],
    mutationFn: (body: SafetyPatchBody) => patchSafety(trackerId, body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: ["safety-processing", trackerId] });
      const prev = qc.getQueryData<SafetyGetResponse>([
        "safety-processing",
        trackerId,
      ]);
      // Minimal optimistic touches (notes only). Files/status keep server-as-source-of-truth.
      if (prev && typeof body.notes === "string") {
        qc.setQueryData<SafetyGetResponse>(["safety-processing", trackerId], {
          ...prev,
          onboardingContext: { ...prev.onboardingContext, notes: body.notes },
        });
      }
      return { prev };
    },
    onError: (_e, _body, ctx) => {
      if (ctx?.prev)
        qc.setQueryData(["safety-processing", trackerId], ctx.prev);
    },
    onSuccess: (data) => {
      // Keep contract header & wizard in sync
      qc.setQueryData(["safety-processing", trackerId], data);
      qc.setQueryData(["contract-context", trackerId], data.onboardingContext);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["safety-processing", trackerId] });
      qc.invalidateQueries({ queryKey: ["contract-context", trackerId] });
      qc.invalidateQueries({ queryKey: ["admin-onboarding-list"] });
    },
  });

  return { ...query, mutate };
}
