"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "./AdminSidebar";

export default function MobileSidebarDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname() || "/dashboard";
  const isContract = pathname.startsWith("/dashboard/contract/");
  const trackerId = isContract ? pathname.split("/")[3] ?? "" : undefined;

  // ESC to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Scroll lock while open
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    if (open) document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  return (
    <div
      id="dd-mobile-sidebar"
      className={[
        "fixed inset-0 z-[2000] lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      {/* Scrim (fades in/out) */}
      <button
        aria-label="Close sidebar"
        onClick={onClose}
        className={[
          "absolute inset-0 transition-opacity duration-500 ease-in-out",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
        style={{
          backgroundColor: 'var(--color-shadow-high)'
        }}
      />

      {/* Slide-over panel (SSP-Portal look & transitions) */}
      <div
        className={[
          "absolute inset-y-0 left-0 z-10 w-72 sm:w-80",
          "flex flex-col",
          "transform transition-all duration-500 ease-in-out will-change-transform",
          open
            ? "translate-x-0 opacity-100 scale-100 pointer-events-auto"
            : "-translate-x-full opacity-0 scale-[0.98] pointer-events-none",
        ].join(" ")}
        style={{
          backgroundColor: 'var(--color-card)',
          borderRight: '1px solid var(--color-outline)',
          boxShadow: 'var(--color-shadow-elevated) 0 10px 15px -3px, var(--color-shadow-elevated) 0 4px 6px -2px'
        }}
      >
        <div className="h-14 flex items-center justify-end px-4">
          {/* Close button mirrors portal */}
          <button
            onClick={onClose}
            className="group w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--color-sidebar)',
              color: 'var(--color-on-surface)'
            }}
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <svg
              className="w-4 h-4 rotate-180 transition-transform duration-600 ease-in-out group-hover:scale-110 group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Nav content (mobile variant) */}
        <div className="flex-1 overflow-y-auto">
          <AdminSidebar
            display="mobile"
            variant={isContract ? "contract" : "home"}
            activePath={pathname}
            trackerId={trackerId}
          />
        </div>
      </div>
    </div>
  );
}
