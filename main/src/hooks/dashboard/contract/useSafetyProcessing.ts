"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSafety, patchSafety, type SafetyGetResponse, type SafetyPatchBody } from "@/lib/dashboard/api/safetyProcessing";

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

    // ⭐ Optimistic update so the checkbox/cert count don't vanish during refetch
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: ["safety-processing", trackerId] });
      const prev = qc.getQueryData<SafetyGetResponse>(["safety-processing", trackerId]);

      if (prev) {
        const next: SafetyGetResponse = structuredClone(prev);

        // notes
        if (typeof body.notes === "string") {
          next.onboardingContext.notes = body.notes;
        }

        // Carrier's Edge (request uses carriersEdgeTraining)
        if (body.carriersEdgeTraining) {
          const inc = body.carriersEdgeTraining;
          const ce = (next.carriersEdge ??= {});

          if (Array.isArray(inc.certificates)) {
            ce.certificates = inc.certificates;
          }
          if (inc.emailSent === true) {
            ce.emailSent = true;
            ce.emailSentBy = inc.emailSentBy || ce.emailSentBy || "Admin";
            ce.emailSentAt = (typeof inc.emailSentAt === "string" ? inc.emailSentAt : inc.emailSentAt?.toISOString()) || ce.emailSentAt || new Date().toISOString();
          }
          if (inc.completed === true) {
            ce.completed = true;
          }
        }

        // Drug Test (optional; keeps UI steady when approving/uploading)
        if (body.drugTest) {
          const dt = (next.drugTest ??= {});
          if (Array.isArray(body.drugTest.driverDocuments)) dt.driverDocuments = body.drugTest.driverDocuments;
          if (Array.isArray(body.drugTest.adminDocuments)) dt.adminDocuments = body.drugTest.adminDocuments;
          if (typeof body.drugTest.status === "string") dt.status = body.drugTest.status;
        }

        qc.setQueryData(["safety-processing", trackerId], next);
      }

      return { prev };
    },

    onError: (_e, _body, ctx) => {
      if (ctx?.prev) qc.setQueryData(["safety-processing", trackerId], ctx.prev);
    },

    onSuccess: (server) => {
      // Write server truth, but don't drop CE if the server momentarily omits it
      const current = qc.getQueryData<SafetyGetResponse>(["safety-processing", trackerId]) ?? server;

      qc.setQueryData<SafetyGetResponse>(["safety-processing", trackerId], {
        ...server,
        carriersEdge: server.carriersEdge ?? current.carriersEdge ?? {},
        drugTest: server.drugTest ?? current.drugTest,
      });

      // keep header/wizard in sync
      qc.setQueryData(["contract-context", trackerId], server.onboardingContext);
    },

    onSettled: () => {
      // still refetch to converge with backend
      qc.invalidateQueries({ queryKey: ["safety-processing", trackerId] });
      qc.invalidateQueries({ queryKey: ["contract-context", trackerId] });
      qc.invalidateQueries({ queryKey: ["admin-onboarding-list"] });
    },
  });

  return { ...query, mutate };
}
