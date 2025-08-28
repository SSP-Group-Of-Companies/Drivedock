"use client";

/**
 * AdminSidebar (SSP-Portal styled, responsive)
 * --------------------------------------------
 * - Preserves color variables.
 * - Sticky under header with responsive offset.
 * - No fixed heights; page scrolls naturally on small/mobile.
 * - Desktop only by default; "mobile" display used inside drawer.
 */

import { useMemo } from "react";
import Link from "next/link";
import {
  HOME_SIDEBAR_ITEMS,
  contractSidebarSections,
  type SidebarItem,
} from "@/constants/dashboard/sidebar";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// Memoized style objects to prevent re-creation on every render
const ACTIVE_STYLES = {
  backgroundColor: "var(--color-primary)",
  color: "white",
} as const;

const INACTIVE_STYLES = {
  backgroundColor: "transparent",
  color: "var(--color-on-surface-variant)",
} as const;

function NavItem({ item, active }: { item: SidebarItem; active: boolean }) {
  const Icon = item.icon;
  const styles = useMemo(() => active ? ACTIVE_STYLES : INACTIVE_STYLES, [active]);
  
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0",
        active ? "font-semibold" : "hover:scale-[1.02]"
      )}
      style={styles}
    >
      <Icon
        className={cx(
          "h-4 w-4 transition-opacity",
          active ? "opacity-95" : "opacity-80 group-hover:opacity-95"
        )}
        aria-hidden="true"
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SidebarNav({
  variant,
  activePath,
  trackerId,
  navLabel,
}: {
  variant: "home" | "contract";
  activePath: string;
  trackerId?: string;
  navLabel: string;
}) {
  // Memoize sections calculation to prevent unnecessary re-renders
  const sections = useMemo(() => {
    if (variant === "home") return null;
    return contractSidebarSections(trackerId ?? "");
  }, [variant, trackerId]);

  if (variant === "home") {
    return (
      <nav role="navigation" aria-label={navLabel} className="space-y-4">
        <div>
          <h3
            className="mb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Navigation
          </h3>
          <ul className="space-y-1">
            {HOME_SIDEBAR_ITEMS.map((it) => (
              <li key={it.href}>
                <NavItem item={it} active={activePath === it.href} />
              </li>
            ))}
          </ul>
        </div>
        <hr style={{ borderColor: "var(--color-outline)" }} />
      </nav>
    );
  }

  return (
    <nav role="navigation" aria-label={navLabel} className="space-y-4">
      {sections?.map((section, idx) => (
        <div key={section.title}>
          <h3
            className="mb-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {section.title}
          </h3>
          <ul className="space-y-1">
            {section.items.map((it) => (
              <li key={it.href}>
                <NavItem item={it} active={activePath === it.href} />
              </li>
            ))}
          </ul>
          {idx < sections.length - 1 && (
            <hr
              className="my-4"
              style={{ borderColor: "var(--color-outline)" }}
            />
          )}
        </div>
      ))}
    </nav>
  );
}

/**
 * AdminSidebar
 * display="desktop" → sticky panel (hidden on mobile).
 * display="mobile"  → nav-only for the drawer.
 */
export default function AdminSidebar({
  variant,
  activePath,
  trackerId,
  display = "desktop",
}: {
  variant: "home" | "contract";
  activePath: string;
  trackerId?: string;
  display?: "desktop" | "mobile";
}) {
  if (display === "mobile") {
    return (
      <div className="px-4 py-4" style={{ color: "var(--color-on-surface)" }}>
        <SidebarNav
          variant={variant}
          activePath={activePath}
          trackerId={trackerId}
          navLabel="DriveDock Mobile Sidebar"
        />
      </div>
    );
  }

  return (
    <aside
      className={cx(
        "hidden md:block",
        // sticky under header; offset matches header h-12 (48px) / h-14 (56px)
        "sticky top-12 sm:top-14",
        // width + no right padding (flush with content)
        "shrink-0 w-56 lg:w-64 pl-3 pr-0 py-4",
        // make it visually span the viewport under the header
        "min-h-[calc(100dvh-48px)] sm:min-h-[calc(100dvh-56px)]",
        "transition-colors duration-200"
      )}
      style={{
        backgroundColor: "var(--color-card)",
        borderRight: "none",
        boxShadow:
          "var(--color-shadow) 0 1px 3px 0, var(--color-shadow) 0 1px 2px -1px",
      }}
    >
      <div className="min-h-0">
        <SidebarNav
          variant={variant}
          activePath={activePath}
          trackerId={trackerId}
          navLabel="DriveDock Sidebar"
        />
      </div>
    </aside>
  );
}
