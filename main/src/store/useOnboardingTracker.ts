// src/store/useOnboardingTracker.ts

import { create } from "zustand";

export interface ITrackerContext {
  id: string;
  companyId: string;
  applicationType?: string;
  status: {
    currentStep: string;
    completedStep: string;
    completed: boolean;
  };
  prevUrl: string;
  nextUrl: string;
}

interface OnboardingTrackerStore {
  tracker: ITrackerContext | null;
  setTracker: (data: ITrackerContext) => void;
  clearTracker: () => void;
}

export const useOnboardingTracker = create<OnboardingTrackerStore>()((set) => ({
  tracker: null,
  setTracker: (data) => set({ tracker: data }),
  clearTracker: () => set({ tracker: null }),
}));
