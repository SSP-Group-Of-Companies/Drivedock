"use client";

import { usePathname } from "next/navigation";

export default function ConditionalBackground() {
  const pathname = usePathname();
  
  // Only show the background gradient for non-dashboard routes
  const isDashboardRoute = pathname?.startsWith('/dashboard');
  
  if (isDashboardRoute) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-[-2] bg-gradient-to-br from-white via-blue-100 to-blue-600 opacity-40" />
  );
}
