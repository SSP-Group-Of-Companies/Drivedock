// src/app/onboarding/[id]/layout.tsx
import { ReactNode } from "react";
import { unstable_noStore as noStore } from "next/cache";
import getOnboardingTrackerContext from "@/lib/services/getOnboardingTrackerContext";
import { OnboardingTrackerContextProvider } from "@/app/providers/OnboardingTrackerContextProvider";
import OnboardingLayoutClientShell from "../../components/OnboardingLayoutClientShell";

// Disable ISR for this route segment and force dynamic rendering
export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function OnboardingIdLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  // Opt out of the RSC cache for this render
  noStore();

  const { id } = await params;
  const ctx = await getOnboardingTrackerContext(id); // fresh each navigation
  return (
    <OnboardingTrackerContextProvider context={ctx}>
      <OnboardingLayoutClientShell showStepInfo={false}>{children}</OnboardingLayoutClientShell>
    </OnboardingTrackerContextProvider>
  );
}
