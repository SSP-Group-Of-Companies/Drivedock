"use client";

import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";

import QueryProvider from "@/lib/dashboard/providers/QueryProvider";
import ThemeProvider from "@/components/shared/ThemeProvider";
import GlobalLayoutWrapper from "@/components/shared/GlobalLayoutWrapper";
import AdminHeader from "./components/layout/AdminHeader";
import AdminSidebar from "./components/layout/AdminSidebar";
import MobileSidebarDrawer from "./components/layout/MobileSidebarDrawer";
import DashboardSkeleton from "./components/layout/DashboardSkeleton";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/dashboard";
  
  // Memoize pathname-based calculations to prevent unnecessary re-renders
  const pathData = useMemo(() => {
    const isContract = pathname.startsWith("/dashboard/contract/");
    const trackerId = isContract ? pathname.split("/")[3] ?? "" : undefined;
    return { isContract, trackerId };
  }, [pathname]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Theme is now handled entirely by the store
  // No need for manual theme application here

  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  return (
    <QueryProvider>
      <ThemeProvider>
        <GlobalLayoutWrapper>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-[var(--color-surface)] focus:px-3 focus:py-2"
          >
            Skip to content
          </a>

          {/* RESPONSIVE APP SHELL */}
          <div
            className={`
              flex flex-col transition-colors duration-200
              ${pathData.isContract ? 'min-h-screen' : 'h-screen overflow-hidden'}
            `}
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
            <div className={`flex min-h-0 flex-1 ${pathData.isContract ? '' : 'overflow-hidden'}`}>
              {/* Desktop sidebar */}
              <div className="hidden xl:block shrink-0">
                {/* Keep a fixed-width fallback to avoid layout shift */}
                <Suspense fallback={<div className="w-72" aria-hidden="true" />}>
                  <AdminSidebar
                    variant={pathData.isContract ? "contract" : "home"}
                    activePath={pathname}
                    trackerId={pathData.trackerId}
                  />
                </Suspense>
              </div>

              {/* Main column */}
              <main
                id="main"
                role="main"
                className={`min-w-0 flex-1 transition-colors duration-200 ${pathData.isContract ? '' : 'overflow-hidden'}`}
                style={{ backgroundColor: "var(--color-surface)" }}
              >
                {/* Container that holds the page's own scrollable region(s) */}
                <div
                  className={`
                    mx-auto w-full max-w-screen-2xl
                    px-3 sm:px-4 md:px-6 lg:px-8
                    pt-4 pb-8
                    ${pathData.isContract ? 'min-h-0' : 'h-full min-h-0 overflow-hidden'}
                  `}
                >
                                  {/* If a child page uses useSearchParams, this boundary keeps 404 prerender safe */}
                <Suspense fallback={
                  <DashboardSkeleton 
                    variant={pathData.isContract ? "contract" : "home"} 
                    showSidebar={true}
                  />
                }>
                  {children}
                </Suspense>
                </div>
              </main>
            </div>

            <Suspense fallback={null}>
              <MobileSidebarDrawer
                open={sidebarOpen}
                onClose={closeSidebar}
                variant={pathData.isContract ? "contract" : "home"}
                trackerId={pathData.trackerId}
              />
            </Suspense>
          </div>
        </GlobalLayoutWrapper>
      </ThemeProvider>
    </QueryProvider>
  );
}
