"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";

import QueryProvider from "@/lib/dashboard/providers/QueryProvider";
import ThemeProvider from "@/components/shared/ThemeProvider";
import AdminHeader from "./components/layout/AdminHeader";
import AdminSidebar from "./components/layout/AdminSidebar";
import MobileSidebarDrawer from "./components/layout/MobileSidebarDrawer";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Call usePathname unconditionally (will be undefined during SSR)
  const pathname = usePathname() || "/dashboard";
  const isContract = mounted ? pathname.startsWith("/dashboard/contract/") : false;
  const trackerId = mounted && isContract ? pathname.split("/")[3] ?? "" : undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("drivedock_theme");
    if (savedTheme) {
      const parsed = JSON.parse(savedTheme);
      const resolvedTheme = parsed.state?.resolvedTheme || "light";
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(resolvedTheme);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      closeSidebar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, mounted]);

  // During SSR/static generation, render without client-side functionality
  if (!mounted) {
    return (
      <QueryProvider>
        <ThemeProvider>
          <div className="flex h-dvh flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <main className="min-w-0 flex-1 overflow-hidden">
                <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 pt-4 pb-8 h-full min-h-0 overflow-hidden">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </ThemeProvider>
      </QueryProvider>
    );
  }

  return (
    <QueryProvider>
      <ThemeProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-[var(--color-surface)] focus:px-3 focus:py-2"
        >
          Skip to content
        </a>

        {/* FIXED-HEIGHT APP SHELL (no document scrolling) */}
        <div
          className="
            flex h-dvh flex-col overflow-hidden transition-colors duration-200
            supports-[height:100svh]:h-[100svh]
          "
          style={{
            backgroundColor: "var(--color-background)",
            color: "var(--color-on-background)",
          }}
        >
          {/* Header should not scroll; keep it out of the scroll area */}
          <AdminHeader
            onToggleSidebar={toggleSidebar}
            sidebarOpen={sidebarOpen}
          />

          {/* Fill the remaining height; prevent page scroll */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Desktop sidebar */}
            <div className="hidden lg:block shrink-0">
              <AdminSidebar
                variant={isContract ? "contract" : "home"}
                activePath={pathname}
                trackerId={trackerId}
              />
            </div>

            {/* Main column (no overflow here) */}
            <main
              id="main"
              role="main"
              className="min-w-0 flex-1 overflow-hidden transition-colors duration-200"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              {/* Container that holds the page’s own scrollable region(s) */}
              <div
                className="
                  mx-auto w-full max-w-screen-2xl
                  px-3 sm:px-4 lg:pl-0 md:pr-4 lg:pr-6 xl:pr-8
                  pt-4 pb-8
                  h-full min-h-0 overflow-hidden
                "
              >
                {/* Tip:
                   Make ONE child inside your page the scroll container, e.g.:
                   <div className='min-h-0 flex-1 overflow-auto'>…grid…</div>
                   That keeps the overall page non-scrollable. */}
                {children}
              </div>
            </main>
          </div>

          <MobileSidebarDrawer open={sidebarOpen} onClose={closeSidebar} />
        </div>
      </ThemeProvider>
    </QueryProvider>
  );
}
