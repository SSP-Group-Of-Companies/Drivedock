"use client";

/**
 * useDrugTestMutations
 * --------------------
 * - verify() → marks pass/fail
 * - Optimistically removes item from any "Drug Test" scoped lists
 *   (params.currentStep === 'drug-test' OR params.drugTestDocumentsUploaded is set)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  verifyDrugTest,
  type VerifyDrugTestPayload,
} from "@/lib/dashboard/api/drugTestMutations";
import type { OnboardingListResult } from "@/lib/dashboard/api/adminOnboarding";

type ListKey = readonly ["admin-onboarding-list", Record<string, unknown>?];

export function useDrugTestMutations() {
  const qc = useQueryClient();

  function patchDrugTestLists(removeId: string) {
    const queries = qc.getQueriesData<OnboardingListResult>({
      queryKey: ["admin-onboarding-list"],
    });
    queries.forEach(([key, data]) => {
      if (!data) return;
      const [, params] = key as ListKey;
      const p = (params || {}) as any;
      const isDrugTestScoped =
        p?.currentStep === "drug-test" || "drugTestDocumentsUploaded" in p;
      if (!isDrugTestScoped) return;

      const next = {
        ...data,
        items: data.items.filter((it) => it._id !== removeId),
      };
      qc.setQueryData<OnboardingListResult>(key, next);
    });
  }

  const verify = useMutation({
    mutationFn: async (payload: {
      trackerId: string;
      body: VerifyDrugTestPayload;
      signal?: AbortSignal;
    }) => verifyDrugTest(payload.trackerId, payload.body, payload.signal),
    onMutate: async ({ trackerId }) => {
      await qc.cancelQueries({ queryKey: ["admin-onboarding-list"] });
      patchDrugTestLists(trackerId);
      return { trackerId };
    },
    onError: () => {
      // On error, restore truth from the server
      qc.invalidateQueries({ queryKey: ["admin-onboarding-list"] });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin-onboarding-list"] });
    },
  });

  return { verify };
}
