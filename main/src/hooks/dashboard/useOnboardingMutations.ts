"use client";

/**
 * useOnboardingMutations
 * ----------------------
 * - terminate / restore with optimistic UI
 * - patches only the relevant cached lists:
 *    • Terminate → remove from ACTIVE lists (terminated != true)
 *    • Restore   → remove from TERMINATED lists (terminated == true)
 * - always invalidates to sync counts/pages from the server afterward
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  terminateTracker,
  restoreTracker,
} from "@/lib/dashboard/api/onboardingMutations";
import type { OnboardingListResult } from "@/lib/dashboard/api/adminOnboarding";

export function useOnboardingMutations() {
  const qc = useQueryClient();

  /**
   * patchLists
   * ----------
   * Iterate cached queries for the onboarding list and conditionally patch them in memory.
   * This works with our queryKey shape: ['admin-onboarding-list', { ...params }]
   */
  function patchLists(
    predicate: (params: any) => boolean,
    updater: (data: OnboardingListResult) => OnboardingListResult
  ) {
    const queries = qc.getQueriesData<OnboardingListResult>({
      queryKey: ["admin-onboarding-list"],
    });

    queries.forEach(([key, data]) => {
      if (!data) return;

      // key is a TanStack QueryKey (readonly unknown[])
      const keyArr = Array.isArray(key) ? key : [key as any];
      const params = (keyArr[1] ?? {}) as any;

      if (!predicate(params)) return;
      qc.setQueryData<OnboardingListResult>(key, updater(data));
    });
  }

  const terminate = useMutation({
    mutationFn: async (payload: { id: string; signal?: AbortSignal }) =>
      terminateTracker(payload.id, payload.signal),

    onMutate: async ({ id }) => {
      // Avoid clobbering optimistic state with any in-flight refetches
      await qc.cancelQueries({ queryKey: ["admin-onboarding-list"] });

      // Remove from ACTIVE lists only (terminated != true)
      patchLists(
        (params) =>
          !(params?.terminated === true || params?.terminated === "true"),
        (data) => ({
          ...data,
          items: data.items.filter((it) => it._id !== id),
          // Optionally nudge counts for instant feedback; server will correct on invalidate
          counts: { ...data.counts, all: Math.max(0, data.counts.all - 1) },
        })
      );

      return { id };
    },

    onError: () => {
      // Roll back by refetching truth from server
      qc.invalidateQueries({ queryKey: ["admin-onboarding-list"] });
    },

    onSettled: () => {
      // Finalize with a fresh snapshot (counts/pages)
      qc.invalidateQueries({ queryKey: ["admin-onboarding-list"] });
    },
  });

  const restore = useMutation({
    mutationFn: async (payload: { id: string; signal?: AbortSignal }) =>
      restoreTracker(payload.id, payload.signal),

    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ["admin-onboarding-list"] });

      // Remove from TERMINATED lists only (terminated == true)
      patchLists(
        (params) =>
          params?.terminated === true || params?.terminated === "true",
        (data) => ({
          ...data,
          items: data.items.filter((it) => it._id !== id),
          // We generally leave counts alone here; invalidate will sync them.
        })
      );

      return { id };
    },

    onError: () => {
      qc.invalidateQueries({ queryKey: ["admin-onboarding-list"] });
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin-onboarding-list"] });
    },
  });

  return { terminate, restore };
}
