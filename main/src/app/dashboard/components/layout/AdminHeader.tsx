"use client";

/**
 * AdminHeader
 * -----------
 * Fixed Row1 across the dashboard (responsive, mobile-first).
 * - Preserves project color tokens via CSS vars (no changes).
 * - Logo scales responsively; no hardcoded dimensions.
 * - Mobile nav button meets 44px tap target on phones.
 */

import Link from "next/link";
import Image from "next/image";
import { UserCircle } from "lucide-react";
import AppLauncher from "./AppLauncher";

interface AdminHeaderProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export default function AdminHeader({
  onToggleSidebar,
  sidebarOpen,
}: AdminHeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 w-full b shadow-sm transition-colors duration-200"
      style={{
        backgroundColor: "var(--color-header)",
        borderBottom: "1px solid var(--color-header-border)",
      }}
    >
      <div className="mx-auto flex h-12 sm:h-14 max-w-screen-2xl items-center justify-between px-3 sm:px-4">
        {/* Left: sidebar toggle (visible below lg) */}
        <div className="flex items-center">
          <button
            type="button"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={sidebarOpen}
            aria-controls="dd-mobile-sidebar"
            onClick={onToggleSidebar}
            className="group flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full transition-all duration-300 shadow-md lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            style={{
              backgroundColor: "var(--color-sidebar)",
              color: "var(--color-on-surface)",
            }}
            title={sidebarOpen ? "Close menu" : "Open menu"}
          >
            {/* Arrow icon that rotates like SSP-Portal */}
            <svg
              className={`h-4 w-4 transition-transform duration-500 ease-in-out ${
                sidebarOpen ? "rotate-180 -translate-x-0.5 scale-110" : ""
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Center: brand (responsive logo) */}
        <Link href="/dashboard/home" className="inline-flex items-center gap-2">
          <span className="relative block w-24 sm:w-28 md:w-32 lg:w-40 h-6 sm:h-7 md:h-8">
            <Image
              src="/assets/logos/SSP-Truck-LineFullLogo.png"
              alt="SSP DriveDock"
              fill
              sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, (max-width: 1024px) 160px, 200px"
              className="object-contain"
              priority
            />
          </span>
        </Link>

        {/* Right: app launcher + profile */}
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <AppLauncher />
          <button
            type="button"
            aria-label="Open profile menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "white",
            }}
          >
            <UserCircle className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
