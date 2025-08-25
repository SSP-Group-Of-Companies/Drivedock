"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSmartGlobalLoading } from "@/hooks/useSmartGlobalLoading";

/** Accept the possible shapes without fighting Next's overloads. */
type AnyHref =
  | string
  | URL
  | { pathname?: string; query?: unknown; hash?: string }
  | unknown;

/** Resolve the destination pathname from a push/replace href. */
function hrefToPathname(href: AnyHref): string {
  if (typeof href === "string") {
    // "?page=2" or "#hash" → keep current pathname
    if (href.startsWith("?") || href.startsWith("#"))
      return window.location.pathname;
    try {
      return new URL(href, window.location.origin).pathname;
    } catch {
      // Could be an internal relative like "/dashboard/home"
      if (href.startsWith("/")) return href;
      return window.location.pathname;
    }
  }

  // URL instance
  if (href instanceof URL) {
    return href.pathname;
  }

  // UrlObject-like (Link supports this in some cases)
  if (href && typeof href === "object") {
    const maybe = href as { pathname?: string; href?: string };
    if (typeof maybe.pathname === "string") return maybe.pathname;
    if (typeof maybe.href === "string") {
      try {
        return new URL(maybe.href, window.location.origin).pathname;
      } catch {
        if (maybe.href.startsWith("/")) return maybe.href;
      }
    }
  }

  return window.location.pathname;
}

export function useNavigationLoadingSmart() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { begin, end } = useSmartGlobalLoading({
    delay: 300,
    minVisible: 0,
    message: "Loading…",
  });

  // This key changes on BOTH path and query changes → good time to end loader.
  const locationKey = useMemo(
    () => `${pathname}?${searchParams?.toString() ?? ""}`,
    [pathname, searchParams]
  );

  // Intercept router.push/replace — show loader ONLY on pathname changes.
  useEffect(() => {
    const originalPush = router.push;
    const originalReplace = router.replace;

    router.push = (...args: Parameters<typeof originalPush>) => {
      const destPath = hrefToPathname(args[0] as AnyHref);
      if (destPath !== window.location.pathname) begin("Loading…");
      return originalPush.apply(router, args);
    };

    router.replace = (...args: Parameters<typeof originalReplace>) => {
      const destPath = hrefToPathname(args[0] as AnyHref);
      if (destPath !== window.location.pathname) begin("Loading…");
      return originalReplace.apply(router, args);
    };

    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
    };
  }, [router, begin]);

  // Link clicks — only show loader when the LINK changes pathname.
  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("a");
      if (!el) return;

      // opt-out for specific links
      if (el.getAttribute("data-no-global-loader") === "true") return;

      const href = (el as HTMLAnchorElement).getAttribute("href") || "";
      const target = (el as HTMLAnchorElement).getAttribute("target");
      const download = (el as HTMLAnchorElement).hasAttribute("download");
      const isInternal = href.startsWith("/") && !href.startsWith("//");

      if (!isInternal || target === "_blank" || download) return;

      // Only if pathname actually changes
      const destPath = (el as HTMLAnchorElement).pathname || "";
      if (destPath && destPath !== window.location.pathname) {
        begin("Loading…");
      }
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [begin]);

  // End loader for BOTH path and query changes (covers query-only refetches).
  useEffect(() => {
    const t = setTimeout(() => end(), 250); // give your PageTransition a tiny buffer
    return () => clearTimeout(t);
  }, [locationKey, end]);
}
