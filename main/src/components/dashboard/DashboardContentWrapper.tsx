/**
 * Dashboard Content Wrapper
 * 
 * Provides responsive width constraints following industry standards.
 * - Mobile: Full width with minimal padding
 * - Desktop: Constrained width for optimal readability
 * - Large displays: Perfect middle ground for optimal proportions
 * This ensures a single source of truth for layout styling across the dashboard.
 */

"use client";

import { ReactNode } from "react";

interface DashboardContentWrapperProps {
  children: ReactNode;
  className?: string;
}

export default function DashboardContentWrapper({ 
  children, 
  className = "" 
}: DashboardContentWrapperProps) {
  return (
    <div className={`
      w-full
      px-2
      sm:px-4
      lg:px-6
      max-w-none
      sm:max-w-none
      md:max-w-none
      lg:max-w-7xl
      xl:max-w-8xl
      2xl:max-w-[1500px]
      mx-auto
      space-y-3
      sm:space-y-4
      flex
      h-full
      min-h-0
      flex-col
      ${className}
    `}>
      {children}
    </div>
  );
}
