"use client";
import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { createContext, useContext } from "react";

const OnboardingTrackerContext = createContext<IOnboardingTrackerContext | null>(null);
export const useOnboardingTrackerContext = () => useContext(OnboardingTrackerContext);

export function OnboardingTrackerContextProvider({ context, children }: { context: IOnboardingTrackerContext | null; children: React.ReactNode }) {
  return <OnboardingTrackerContext.Provider value={context}>{children}</OnboardingTrackerContext.Provider>;
}
