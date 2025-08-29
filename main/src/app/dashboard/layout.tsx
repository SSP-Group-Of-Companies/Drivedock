"use client";

import type { ReactNode } from "react";
import { Suspense, useCallback, useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";

import QueryProvider from "@/lib/dashboard/providers/QueryProvider";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
// Removed useDashboardLoading import to prevent white flash
import AdminHeader from "./components/layout/AdminHeader";
import AdminSidebar from "./components/layout/AdminSidebar";
import MobileSidebarDrawer from "./components/layout/MobileSidebarDrawer";
import { useCookieThemeStore } from "@/store/useCookieThemeStore";

// Apply theme immediately to prevent flash
function applyThemeImmediately() {
  if (typeof document === "undefined") return;
  
  try {
    // Get theme from cookies synchronously
    const cookies = document.cookie.split(";");
    const themeCookie = cookies.find(cookie => 
      cookie.trim().startsWith("drivedock-theme=")
    );
    
    let theme: "light" | "dark" = "light";
    if (themeCookie) {
      const value = themeCookie.split("=")[1]?.trim();
      if (value === "dark") {
        theme = "dark";
      } else if (value === "system") {
        // Check system preference
        theme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
    }
    
    // Apply theme immediately
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        theme === "dark" ? "#000000" : "#ffffff"
      );
    }
  } catch (error) {
    console.warn("Failed to apply theme immediately:", error);
  }
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/dashboard";
  // Removed dashboard loader visibility check to prevent white flash
  const [shouldRender, setShouldRender] = useState(false);
  const { resolvedTheme } = useCookieThemeStore();

  // Apply theme immediately on mount to prevent flash
  useEffect(() => {
    applyThemeImmediately();
  }, []);

  // Apply theme when resolvedTheme changes (for theme switching)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        resolvedTheme === "dark" ? "#000000" : "#ffffff"
      );
    }
  }, [resolvedTheme]);

  // Memoize pathname-based calculations to prevent unnecessary re-renders
  const pathData = useMemo(() => {
    const isContract = pathname.startsWith("/dashboard/contract/");
    const trackerId = isContract ? pathname.split("/")[3] ?? "" : undefined;
    return { isContract, trackerId };
  }, [pathname]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Always render content immediately to prevent white flash
  useEffect(() => {
    setShouldRender(true);
  }, []);

  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

      return (
      <QueryProvider>
        <DashboardLayoutWrapper>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-[var(--color-surface)] focus:px-3 focus:py-2"
          >
            Skip to content
          </a>

          {/* Always render content to prevent white flash */}
          {shouldRender && (
            <div
              className={`
                flex flex-col transition-colors duration-200
                ${
                  pathData.isContract
                    ? "min-h-screen"
                    : "h-screen overflow-hidden"
                }
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
            <div
              className={`flex min-h-0 flex-1 ${
                pathData.isContract ? "" : "overflow-hidden"
              }`}
            >
              {/* Sidebar */}
              <Suspense fallback={null}>
                <AdminSidebar
                  variant={pathData.isContract ? "contract" : "home"}
                  activePath={pathname}
                  trackerId={pathData.trackerId}
                />
              </Suspense>

              {/* Mobile sidebar overlay */}
              <MobileSidebarDrawer
                open={sidebarOpen}
                onClose={closeSidebar}
                trackerId={pathData.trackerId}
              />

              {/* Main content */}
              <main
                id="main"
                className={`
                  flex-1 overflow-auto transition-all duration-200
                  xl:ml-56 2xl:ml-64
                  ${
                    pathData.isContract
                      ? "px-4 py-6 sm:px-6 lg:px-8"
                      : "p-4 sm:p-6 lg:p-8"
                  }
                `}
                style={{
                  backgroundColor: "var(--color-background)",
                  color: "var(--color-on-background)",
                }}
              >
                {children}
              </main>
            </div>
          </div>
          )}
        </DashboardLayoutWrapper>
      </QueryProvider>
    );
}
