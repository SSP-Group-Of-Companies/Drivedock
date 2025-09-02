"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import ContractSummaryBar from "./components/ContractSummaryBar";
import DashboardContentWrapper from "@/components/dashboard/DashboardContentWrapper";
import { EditModeProvider } from "./components/EditModeContext";

type Props = {
  trackerId: string;
  children: ReactNode;
};

export default function ContractLayoutClient({ trackerId, children }: Props) {
  const pathname = usePathname();
  const { isVisible: isDashboardLoaderVisible } = useDashboardLoading();
  const [shouldRender, setShouldRender] = useState(false);

  // Check if we're on the settings page
  const isSettingsPage = pathname?.includes('/settings');

  // Wait for dashboard loader to be hidden before rendering
  useEffect(() => {
    if (!isDashboardLoaderVisible) {
      // Reduced delay for faster loading
      setTimeout(() => {
        setShouldRender(true);
      }, 150); // Reduced from 300ms to 150ms
    } else {
      setShouldRender(false);
    }
  }, [isDashboardLoaderVisible]);

  // Don't render layout content while dashboard loader is visible or before transition is complete
  if (isDashboardLoaderVisible || !shouldRender) {
    return null;
  }

  // For settings page, don't show ContractSummaryBar
  if (isSettingsPage) {
    return (
      <DashboardContentWrapper>
        {children}
      </DashboardContentWrapper>
    );
  }

  return (
    <EditModeProvider>
      <DashboardContentWrapper>
        <ContractSummaryBar trackerId={trackerId} />
        {children}
      </DashboardContentWrapper>
    </EditModeProvider>
  );
}
