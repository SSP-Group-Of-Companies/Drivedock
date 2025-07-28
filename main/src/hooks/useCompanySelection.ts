// hooks/useCompanySelection.ts

import { create } from "zustand";
import type { Company } from "@/constants/companies";
import { persist } from "zustand/middleware";

export type CompanyData = Company & {
  type?: "Flatbed" | "Dry Van" | string;
};

type CompanyStore = {
  selectedCompany: CompanyData | null;
  setSelectedCompany: (company: CompanyData) => void;
  clearSelectedCompany: () => void;
};

export const useCompanySelection = create<CompanyStore>()(
  persist(
    (set) => ({
      selectedCompany: null,
      setSelectedCompany: (company) => set({ selectedCompany: company }),
      clearSelectedCompany: () => set({ selectedCompany: null }),
    }),
    {
      name: "drivedock-selected-company",
    }
  )
);
