"use client";

import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import QueryProvider from "@/lib/dashboard/providers/QueryProvider";
import ThemeProvider from "@/components/shared/ThemeProvider";
import AdminHeader from "./components/layout/AdminHeader";
import AdminSidebar from "./components/layout/AdminSidebar";
import MobileSidebarDrawer from "./components/layout/MobileSidebarDrawer";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/dashboard";
  const isContract = pathname.startsWith("/dashboard/contract/");
  const trackerId = isContract ? pathname.split("/")[3] ?? "" : undefined;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("drivedock_theme");
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        const resolvedTheme = parsed.state?.resolvedTheme || "light";
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(resolvedTheme);
      } catch {
        // ignore bad localStorage
      }
    }
  }, []);

  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  return (
    <QueryProvider>
      <ThemeProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-[var(--color-surface)] focus:px-3 focus:py-2"
        >
          Skip to content
        </a>

        {/* RESPONSIVE APP SHELL */}
        <div
          className="
            flex h-screen flex-col overflow-hidden transition-colors duration-200
          "
          style={{
            backgroundColor: "var(--color-background)",
            color: "var(--color-on-background)",
          }}
        >
          {/* Header should not scroll; keep it out of the scroll area */}
          <Suspense fallback={null}>
            <AdminHeader
              onToggleSidebar={toggleSidebar}
              sidebarOpen={sidebarOpen}
            />
          </Suspense>

          {/* Main content area */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Desktop sidebar */}
            <div className="hidden lg:block shrink-0">
              {/* Keep a fixed-width fallback to avoid layout shift */}
              <Suspense fallback={<div className="w-72" aria-hidden="true" />}>
                <AdminSidebar
                  variant={isContract ? "contract" : "home"}
                  activePath={pathname}
                  trackerId={trackerId}
                />
              </Suspense>
            </div>

            {/* Main column */}
            <main
              id="main"
              role="main"
              className="min-w-0 flex-1 transition-colors duration-200 overflow-hidden"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              {/* Container that holds the page's own scrollable region(s) */}
              <div
                className="
                  mx-auto w-full max-w-screen-2xl
                  px-3 sm:px-4 lg:pl-0 md:pr-4 lg:pr-6 xl:pr-8
                  pt-4 pb-8
                  h-full min-h-0 overflow-hidden
                "
              >
                {/* If a child page uses useSearchParams, this boundary keeps 404 prerender safe */}
                <Suspense fallback={null}>{children}</Suspense>
              </div>
            </main>
          </div>

          <Suspense fallback={null}>
            <MobileSidebarDrawer open={sidebarOpen} onClose={closeSidebar} />
          </Suspense>
        </div>
      </ThemeProvider>
    </QueryProvider>
  );
}
