import { create } from "zustand";
import { ITrackerContext } from "@/types/onboardingTracker.type";

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
