/**
 * Dashboard Loading Hook — DriveDock
 *
 * Description:
 * Coordinates data fetching with page mounting to ensure smooth transitions
 * and prevent layout shifts in the dashboard.
 *
 * Features:
 * - Coordinates multiple data fetching operations
 * - Ensures page is fully ready before hiding loader
 * - Prevents premature loader hiding
 * - Smooth transitions between dashboard pages
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { useGlobalLoading } from "@/store/useGlobalLoading";

interface DashboardLoadingOptions {
  delay?: number;
  minVisible?: number;
  message?: string;
}

export function useDashboardLoading(options: DashboardLoadingOptions = {}) {
  const { show, hide } = useGlobalLoading();
  const delay = options.delay ?? 100; // Very fast for dashboard
  const minVisible = options.minVisible ?? 300; // Minimum visible time
  
  const [isLoading, setIsLoading] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAtRef = useRef<number | null>(null);
  const visibleRef = useRef(false);

  const beginOperation = useCallback(() => {
    setPendingOperations(prev => prev + 1);
    
    // Show loader if this is the first operation
    if (pendingOperations === 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        show(options.message || "Loading dashboard...");
        visibleRef.current = true;
        shownAtRef.current = performance.now();
        setIsLoading(true);
      }, delay);
    }
  }, [delay, options.message, pendingOperations, show]);

  const endOperation = useCallback(() => {
    setPendingOperations(prev => {
      const newCount = prev - 1;
      
      // Hide loader if this was the last operation
      if (newCount === 0) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        
        if (visibleRef.current && shownAtRef.current != null) {
          const elapsed = performance.now() - shownAtRef.current;
          const remaining = Math.max(0, minVisible - elapsed);
          
          if (remaining > 0) {
            setTimeout(() => {
              hide();
              visibleRef.current = false;
              shownAtRef.current = null;
              setIsLoading(false);
            }, remaining);
          } else {
            hide();
            visibleRef.current = false;
            shownAtRef.current = null;
            setIsLoading(false);
          }
        }
      }
      
      return newCount;
    });
  }, [hide, minVisible]);

  // Convenience wrapper for async operations
  const withLoader = useCallback(
    async <T>(operation: () => Promise<T>, _operationMessage?: string): Promise<T> => {
      beginOperation();
      try {
        const result = await operation();
        return result;
      } finally {
        endOperation();
      }
    },
    [beginOperation, endOperation]
  );

  // Force hide loader (for error cases)
  const forceHide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    hide();
    visibleRef.current = false;
    shownAtRef.current = null;
    setIsLoading(false);
    setPendingOperations(0);
  }, [hide]);

  return {
    isLoading,
    pendingOperations,
    beginOperation,
    endOperation,
    withLoader,
    forceHide,
  };
}
