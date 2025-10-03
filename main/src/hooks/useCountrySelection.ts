/**
 * Country selection store (persisted)
 * - Used pre-approval to drive CA/US specific UX and validation
 */

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ECountryCode } from "@/types/shared.types";

type CountryStore = {
  selectedCountryCode: ECountryCode | null;
  setSelectedCountryCode: (code: ECountryCode) => void;
  clearSelectedCountry: () => void;
};

export const useCountrySelection = create<CountryStore>()(
  persist(
    (set) => ({
      selectedCountryCode: null,
      setSelectedCountryCode: (code) => set({ selectedCountryCode: code }),
      clearSelectedCountry: () => set({ selectedCountryCode: null }),
    }),
    { name: "drivedock-selected-country" }
  )
);


