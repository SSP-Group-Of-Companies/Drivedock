import { create } from "zustand";
import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

interface OnboardingTrackerStore {
  tracker: IOnboardingTrackerContext | null;
  setTracker: (data: IOnboardingTrackerContext) => void;
  clearTracker: () => void;
}

export const useOnboardingTracker = create<OnboardingTrackerStore>()((set) => ({
  tracker: null,
  setTracker: (data) => set({ tracker: data }),
  clearTracker: () => set({ tracker: null }),
}));
