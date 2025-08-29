"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useDashboardLoading } from "@/store/useDashboardLoading";

/**
 * useDashboardPageLoading
 * ----------------------
 * Coordinates dashboard page loading states to ensure smooth transitions.
 * Automatically hides the dashboard loader when the page is fully ready.
 * Handles redirects gracefully by preventing premature hiding during navigation.
 * 
 * Usage:
 * const { hideLoader } = useDashboardPageLoading();
 * 
 * // Call hideLoader() when your page is fully loaded and ready
 * useEffect(() => {
 *   if (data && !isLoading) {
 *     hideLoader();
 *   }
 * }, [data, isLoading, hideLoader]);
 */

export function useDashboardPageLoading() {
  const { hide, isVisible } = useDashboardLoading();
  const pathname = usePathname();
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialPathRef = useRef<string | null>(null);

  // Track the initial path when navigation starts
  useEffect(() => {
    if (isVisible && !initialPathRef.current) {
      initialPathRef.current = pathname;
    }
  }, [isVisible, pathname]);

  // Clear timeout and reset when pathname changes
  useEffect(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, [pathname]);

  const hideLoader = () => {
    // Only hide if we're on the final destination path
    const isFinalPath = pathname.includes('/dashboard/contract/') && pathname.includes('/safety-processing');
    
    if (isFinalPath) {
      hideTimeoutRef.current = setTimeout(() => {
        hide();
        initialPathRef.current = null; // Reset for next navigation
      }, 100); // Reduced delay for faster loading
    }
  };

  return { hideLoader };
}
