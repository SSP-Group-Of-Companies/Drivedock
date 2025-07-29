import { create } from "zustand";
import { IPreQualifications } from "@/types/preQualifications.types";

interface PrequalificationStore {
  data: IPreQualifications | null;
  setData: (data: IPreQualifications) => void;
  clearData: () => void;
}

export const usePrequalificationStore = create<PrequalificationStore>(
  (set) => ({
    data: null,
    setData: (data) => set({ data }),
    clearData: () => set({ data: null }),
  })
);
