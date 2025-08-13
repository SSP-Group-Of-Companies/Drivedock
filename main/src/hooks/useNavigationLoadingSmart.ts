// /hooks/useNavigationLoadingSmart.ts
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSmartGlobalLoading } from "@/hooks/useSmartGlobalLoading";

export function useNavigationLoadingSmart() {
  const pathname = usePathname();
  const router = useRouter();
  const { begin, end } = useSmartGlobalLoading({
    delay: 500, // show only if nav takes longer than 500ms (industry standard)
    minVisible: 0, // no minimum visible time - hide immediately when done
    message: "Loading…",
  });

  // 1) Intercept router.push and router.replace calls
  useEffect(() => {
    const originalPush = router.push;
    const originalReplace = router.replace;

    router.push = (...args: Parameters<typeof originalPush>) => {
      begin("Loading…");
      return originalPush.apply(router, args);
    };

    router.replace = (...args: Parameters<typeof originalReplace>) => {
      begin("Loading…");
      return originalReplace.apply(router, args);
    };

    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
    };
  }, [router, begin]);

  // 2) Arm loader when a user clicks an internal link (<Link/> renders <a>)
  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("a");
      if (!el) return;
      const href = (el as HTMLAnchorElement).getAttribute("href") || "";
      const target = (el as HTMLAnchorElement).getAttribute("target");
      const download = (el as HTMLAnchorElement).hasAttribute("download");

      // internal navigations only
      const isInternal = href.startsWith("/") && !href.startsWith("//");
      if (!isInternal || target === "_blank" || download) return;

      begin("Loading…");
    };

    document.addEventListener("click", onClickCapture, true); // capture phase
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [begin]);

  // 3) When route actually changes, end loader
  useEffect(() => {
    end();
  }, [pathname, end]);
}
