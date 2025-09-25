"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDashboardSmartLoading } from "@/hooks/useDashboardSmartLoading";

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

export function useDashboardNavigationLoading() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Don't use automatic navigation loading for contract pages
  // since we're handling loading manually for better control
  const isContractPage = pathname.startsWith('/dashboard/contract/');

  const { begin, end } = useDashboardSmartLoading({
    delay: 500, // Increased delay to avoid conflicts with React Query
    minVisible: 200, // Minimum visible time to prevent flickering
    message: "Loading…",
  });

  // Track the current navigation state
  const navigationState = useMemo(
    () => ({
      pathname,
      search: searchParams.toString(),
    }),
    [pathname, searchParams]
  );

  // Intercept router.push and router.replace
  useEffect(() => {
    // Skip automatic loading for contract pages
    if (isContractPage) {
      return;
    }

    const originalPush = router.push;
    const originalReplace = router.replace;

    router.push = function (href: any, options?: any) {
      const destination = hrefToPathname(href);
      if (destination !== pathname) {
        begin();
      }
      return originalPush.call(this, href, options);
    };

    router.replace = function (href: any, options?: any) {
      const destination = hrefToPathname(href);
      if (destination !== pathname) {
        begin();
      }
      return originalReplace.call(this, href, options);
    };

    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
    };
  }, [router, pathname, begin, isContractPage]);

  // End loading when navigation completes
  // Use a longer delay to ensure React Query has time to load data
  useEffect(() => {
    // Skip automatic loading for contract pages
    if (isContractPage) {
      return;
    }

    const timer = setTimeout(() => {
      end();
    }, 100); // Small delay to let React Query settle
    
    return () => clearTimeout(timer);
  }, [navigationState, end, isContractPage]);
}
