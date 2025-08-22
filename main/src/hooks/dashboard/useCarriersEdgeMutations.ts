"use client";

/**
 * useCarriersEdgeMutations
 * ------------------------
 * - assign(): flips emailSent=true optimistically in any CE-scoped lists
 * - uploadCertificate(): removes the row from CE-scoped lists (driver moves forward)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  assignCarriersEdge,
  uploadCarriersEdgeCertificate,
  type UploadCECertificatePayload,
} from "@/lib/dashboard/api/carriersEdgeMutations";
import type { OnboardingListResult } from "@/lib/dashboard/api/adminOnboarding";

type ListKey = readonly ["admin-onboarding-list", Record<string, unknown>?];

export function useCarriersEdgeMutations() {
  const qc = useQueryClient();

  function forEachCEScopedList(
    cb: (
      key: ListKey,
      data: OnboardingListResult,
      params: Record<string, unknown>
    ) => void
  ) {
    const queries = qc.getQueriesData<OnboardingListResult>({
      queryKey: ["admin-onboarding-list"],
    });
    queries.forEach(([key, data]) => {
      if (!data) return;
      const [, paramsRaw] = key as ListKey;
      const params = (paramsRaw || {}) as any;
      const isCEScoped =
        params?.currentStep === "carriers-edge-training" ||
        "carriersEdgeTrainingEmailSent" in params;
      if (!isCEScoped) return;
      cb(key as ListKey, data, params);
    });
  }

  const assign = useMutation({
    mutationFn: async (payload: { trackerId: string; signal?: AbortSignal }) =>
      assignCarriersEdge(payload.trackerId, payload.signal),
    onMutate: async ({ trackerId }) => {
      await qc.cancelQueries({ queryKey: ["admin-onboarding-list"] });

      // Optimistically mark emailSent=true on the item in any CE list
      forEachCEScopedList((key, data) => {
        const items = data.items.map((it) =>
          it._id === trackerId
            ? {
                ...it,
                itemSummary: {
                  ...it.itemSummary,
                  carrierEdgeTraining: {
                    ...(it.itemSummary?.carrierEdgeTraining ?? {}),
                    emailSent: true,
                  },
                },
              }
            : it
        );
        qc.setQueryData<OnboardingListResult>(key, { ...data, items });
      });

      return { trackerId };
    },
    onError: () => {
      // Refresh truth
      qc.invalidateQueries({ queryKey: ["admin-onboarding-list"] });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin-onboarding-list"] });
    },
  });

  const uploadCertificate = useMutation({
    mutationFn: async (payload: {
      trackerId: string;
      body: UploadCECertificatePayload;
      signal?: AbortSignal;
    }) =>
      uploadCarriersEdgeCertificate(
        payload.trackerId,
        payload.body,
        payload.signal
      ),
    onMutate: async ({ trackerId }) => {
      await qc.cancelQueries({ queryKey: ["admin-onboarding-list"] });

      // Optimistically remove from CE lists (driver advances to Drug Test)
      forEachCEScopedList((key, data) => {
        const items = data.items.filter((it) => it._id !== trackerId);
        qc.setQueryData<OnboardingListResult>(key, { ...data, items });
      });

      return { trackerId };
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["admin-onboarding-list"] });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin-onboarding-list"] });
    },
  });

  return { assign, uploadCertificate };
}
