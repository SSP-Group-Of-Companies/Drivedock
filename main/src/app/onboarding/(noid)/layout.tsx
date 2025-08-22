// src/app/onboarding/(noid)/layout.tsx
import { ReactNode } from "react";
import { OnboardingTrackerContextProvider } from "@/app/providers/OnboardingTrackerContextProvider";
import OnboardingLayoutClientShell from "../components/OnboardingLayoutClientShell";

export default function OnboardingNoIdLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingTrackerContextProvider context={null}>
      <OnboardingLayoutClientShell>{children}</OnboardingLayoutClientShell>
    </OnboardingTrackerContextProvider>
  );
}
