"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchContractContext,
  changeCompany,
  type ContractContext,
} from "@/lib/dashboard/api/contracts";

export function useContract(trackerId: string) {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["contract-context", trackerId],
    queryFn: ({ signal }) => fetchContractContext(trackerId, signal),
    staleTime: 30_000,
  });

  const changeCompanyMut = useMutation({
    mutationFn: ({ companyId }: { companyId: string }) =>
      changeCompany(trackerId, companyId),
    onMutate: async ({ companyId }) => {
      await qc.cancelQueries({ queryKey: ["contract-context", trackerId] });
      const prev = qc.getQueryData<ContractContext>([
        "contract-context",
        trackerId,
      ]);
      if (prev) {
        qc.setQueryData<ContractContext>(["contract-context", trackerId], {
          ...prev,
          companyId,
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["contract-context", trackerId], ctx.prev);
    },
    onSuccess: (serverCtx) => {
      if (serverCtx)
        qc.setQueryData(["contract-context", trackerId], serverCtx);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["contract-context", trackerId] });
      // Also keep homepage caches true (optional):
      qc.invalidateQueries({ queryKey: ["admin-onboarding-list"] });
    },
  });

  return { ...q, changeCompany: changeCompanyMut };
}
