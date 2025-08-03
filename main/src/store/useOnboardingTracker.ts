// src/store/useOnboardingTracker.ts

import { create } from "zustand";
import { IOnboardingTracker } from "@/types/onboardingTracker.type";

interface OnboardingTrackerStore {
  tracker: IOnboardingTracker | null;
  setTracker: (data: IOnboardingTracker) => void;
  clearTracker: () => void;
}

export const useOnboardingTracker = create<OnboardingTrackerStore>()((set) => ({
  tracker: null,
  setTracker: (data) => set({ tracker: data }),
  clearTracker: () => set({ tracker: null }),
}));
