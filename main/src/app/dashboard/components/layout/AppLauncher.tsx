"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { APP_LAUNCHER_ITEMS } from "@/lib/dashboard/constants/appLauncher";

function cx(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function AppLauncher() {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const items = useMemo(() => APP_LAUNCHER_ITEMS, []);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  // Track viewport for responsive positioning
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node | null;
      if (panelRef.current?.contains(t) || buttonRef.current?.contains(t))
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Esc + focus trap
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusables = panel.querySelectorAll<HTMLElement>(
      "a[href],button:not([disabled])"
    );
    focusables[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === "Tab") {
        const list = Array.from(focusables);
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Prevent background scroll on mobile
  useEffect(() => {
    if (!open || !isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  return (
    <div className="relative">
      {/* Launcher button (3×3 dots) */}
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open SSP apps"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="ssp-apps-panel"
        onClick={toggle}
        className={cx(
          "inline-flex size-9 items-center justify-center rounded-lg transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
          "bg-[var(--color-sidebar)] text-[var(--color-on-surface)]",
          "hover:bg-[var(--color-sidebar-hover)] active:bg-[var(--color-sidebar)]"
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 opacity-95"
          aria-hidden="true"
        >
          {Array.from({ length: 9 }).map((_, i) => {
            const r = Math.floor(i / 3),
              c = i % 3;
            return (
              <circle
                key={i}
                cx={6 + c * 6}
                cy={6 + r * 6}
                r="1.5"
                fill="currentColor"
              />
            );
          })}
        </svg>
      </button>

      {/* Backdrop (mobile) */}
      {open && isMobile && (
        <div
          aria-hidden="true"
          onClick={close}
          className="fixed inset-0 z-[120] bg-black/20 sm:hidden"
        />
      )}

      {/* Popover panel */}
      {open && (
        <div
          id="ssp-apps-panel"
          ref={panelRef}
          role="menu"
          aria-label="SSP apps"
          className={cx(
            isMobile
              ? "fixed left-1/2 -translate-x-1/2 z-[130] w-[calc(100vw-1rem)] max-w-sm"
              : "absolute right-0 z-[130] mt-2 w-[calc(100vw-2rem)] max-w-sm",
            "rounded-[22px] border-[6px] p-2",
            "bg-[var(--popUp-card)] border-[var(--color-outline)] shadow-lg"
          )}
          style={{
            top: isMobile ? "calc(var(--header-h,3.5rem) + 8px)" : undefined,
          }}
        >
          <div className="max-h-[60vh] sm:max-h-[70vh] overflow-y-auto pr-1 overscroll-contain">
            <div className="grid grid-cols-3 gap-2 p-2">
              {items.map((app) => (
                <a
                  key={app.id}
                  href={app.url}
                  {...(app.newTab
                    ? { target: "_blank", rel: "noreferrer noopener" }
                    : {})}
                  onClick={close}
                  role="menuitem"
                  title={app.label}
                  className={cx(
                    "group flex flex-col items-center justify-start rounded-xl p-3 text-center transition-colors",
                    "min-h-28", // reserve space; panel won’t jump
                    "hover:bg-[var(--popUp-card-item-hover)] active:bg-[var(--color-surface-variant)]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-outline)]"
                  )}
                >
                  {/* Icon */}
                  <div className="flex items-center justify-center size-10 rounded-lg">
                    {app.logoSrc ? (
                      <Image
                        src={app.logoSrc}
                        alt={app.label}
                        width={40}
                        height={40}
                        sizes="40px"
                        className="size-10 object-contain"
                        priority={false}
                      />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[22px] w-[22px] opacity-90"
                        aria-hidden="true"
                      >
                        {Array.from({ length: 9 }).map((_, i) => {
                          const r = Math.floor(i / 3),
                            c = i % 3;
                          return (
                            <circle
                              key={i}
                              cx={6 + c * 6}
                              cy={6 + r * 6}
                              r="1.5"
                              fill="currentColor"
                            />
                          );
                        })}
                      </svg>
                    )}
                  </div>

                  {/* Label (truncate by default; reveal full on hover/focus without resizing) */}
                  <div
                    className="relative mt-2 h-10 w-full text-center text-xs leading-tight text-[var(--color-on-surface)]"
                    aria-hidden="true"
                  >
                    {/* default: single-line ellipsis */}
                    <span className="absolute inset-0 inline-block truncate whitespace-nowrap group-hover:hidden group-focus-visible:hidden">
                      {app.label}
                    </span>
                    {/* hover/focus: two-line reveal clipped to the fixed height */}
                    <span className="absolute inset-0 hidden overflow-hidden break-words group-hover:block group-focus-visible:block">
                      {app.label}
                    </span>
                  </div>

                  {/* SR label for accessibility on mobile icon-only reading */}
                  <span className="sr-only">{app.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
