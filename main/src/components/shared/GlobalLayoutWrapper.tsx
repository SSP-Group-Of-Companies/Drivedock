// /components/shared/GlobalLayoutWrapper.tsx
"use client";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import GlobalLoader from "./GlobalLoader";
import { useNavigationLoadingSmart } from "@/hooks/useNavigationLoadingSmart";

// Separate component for onboarding loading to avoid conditional hooks
function OnboardingLoadingWrapper({ children }: { children: ReactNode }) {
  useNavigationLoadingSmart(); // smart nav loader for onboarding only
  return (
    <>
      <GlobalLoader />
      {children}
    </>
  );
}

// Separate component for dashboard (no global loading)
function DashboardWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default function GlobalLayoutWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  
  // Only apply global loading system to non-dashboard routes
  const isDashboardRoute = pathname?.startsWith('/dashboard');
  
  // Use appropriate wrapper based on route
  if (isDashboardRoute) {
    return <DashboardWrapper>{children}</DashboardWrapper>;
  }
  
  return <OnboardingLoadingWrapper>{children}</OnboardingLoadingWrapper>;
}
