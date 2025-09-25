// /components/dashboard/DashboardLayoutWrapper.tsx
"use client";
import { ReactNode } from "react";
import DashboardLoader from "./DashboardLoader";
import { useDashboardNavigationLoading } from "@/hooks/useDashboardNavigationLoading";

export default function DashboardLayoutWrapper({
  children,
}: {
  children: ReactNode;
}) {
  useDashboardNavigationLoading(); // smart nav loader for dashboard
  return (
    <>
      <DashboardLoader />
      {children}
    </>
  );
}
