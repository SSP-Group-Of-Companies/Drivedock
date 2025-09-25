"use client";

import { useEffect, useState } from "react";

/** Returns true at >=640px (Tailwind 'sm' breakpoint). */
export default function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // SSR safety
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(min-width: 768px)");
    const apply = (e: MediaQueryList | MediaQueryListEvent) => setIsDesktop(!!(e as MediaQueryList).matches);

    // Initialize and subscribe
    apply(mq);
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  return isDesktop;
}
