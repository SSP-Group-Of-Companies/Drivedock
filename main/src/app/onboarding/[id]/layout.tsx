// src/app/onboarding/[id]/layout.tsx
import { ReactNode } from "react";
import getOnboardingTrackerContext from "@/lib/services/getOnboardingTrackerContext";
import { OnboardingTrackerContextProvider } from "@/app/providers/OnboardingTrackerContextProvider";
import OnboardingLayoutClientShell from "../components/OnboardingLayoutClientShell";

export default async function OnboardingIdLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const ctx = await getOnboardingTrackerContext((await params).id); // may be null: expired/terminated/not-found

  return (
    <OnboardingTrackerContextProvider context={ctx}>
      <OnboardingLayoutClientShell>{children}</OnboardingLayoutClientShell>
    </OnboardingTrackerContextProvider>
  );
}
