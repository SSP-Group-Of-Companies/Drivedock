// /hooks/useDashboardSmartLoading.ts
"use client";

import { useRef, useCallback } from "react";
import { useDashboardLoading } from "@/store/useDashboardLoading";

type Opts = {
  delay?: number; // show only if op takes longer than this
  minVisible?: number; // once shown, keep visible at least this long (no flicker)
  message?: string;
};

export function useDashboardSmartLoading(defaults: Opts = {}) {
  const { show, hide } = useDashboardLoading();
  const delay = defaults.delay ?? 500; // <= tuned for App Router
  const minVisible = defaults.minVisible ?? 400;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAtRef = useRef<number | null>(null);
  const visibleRef = useRef(false);

  const begin = useCallback(
    (msg?: string) => {
      // arm delayed show
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        show(msg ?? defaults.message);
        visibleRef.current = true;
        shownAtRef.current = performance.now();
      }, delay);
    },
    [delay, defaults.message, show]
  );

  const end = useCallback(() => {
    // cancel pending show
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // if visible, respect minVisible
    if (visibleRef.current && shownAtRef.current != null) {
      if (minVisible === 0) {
        // Hide immediately if no minimum visible time
        hide();
        visibleRef.current = false;
        shownAtRef.current = null;
      } else {
        const elapsed = performance.now() - shownAtRef.current;
        const remaining = Math.max(0, minVisible - elapsed);
        if (remaining > 0) {
          setTimeout(() => {
            hide();
            visibleRef.current = false;
            shownAtRef.current = null;
          }, remaining);
        } else {
          hide();
          visibleRef.current = false;
          shownAtRef.current = null;
        }
      }
    }
  }, [hide, minVisible]);

  // convenience wrapper
  const withLoader = useCallback(
    async <T>(fn: () => Promise<T>, msg?: string) => {
      begin(msg);
      try {
        return await fn();
      } finally {
        end();
      }
    },
    [begin, end]
  );

  return { begin, end, withLoader };
}
