"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { FilterOption } from "@/constants/dashboard/filters";
import { ChevronDown } from "lucide-react";

type Props = Readonly<{
  options: readonly FilterOption[];
  selected?: readonly string[]; // CSV in URL, but array in UI
  onChange: (values?: string[]) => void; // undefined → clear param
}>;

export default function CompanyFilter({ options, selected, onChange }: Props) {
  const selectedSet = useMemo(() => new Set(selected ?? []), [selected]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const btnId = "invitations-company-filter-button";
  const listId = "invitations-company-filter-list";

  const toggleValue = useCallback(
    (val: string) => {
      const next = new Set(selectedSet);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      onChange(next.size ? Array.from(next) : undefined);
    },
    [selectedSet, onChange]
  );

  // Click-outside to close
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const label = selectedSet.size ? `${selectedSet.size} selected` : "Select company";

  return (
    <div className="relative min-w-0" ref={ref}>
      <button
        id={btnId}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        className="inline-flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        style={{
          backgroundColor: "var(--color-card)",
          color: "var(--color-on-surface)",
          border: "1px solid var(--color-outline)",
        }}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-[120] mt-2 rounded-xl shadow-md"
          style={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-outline)",
          }}
          role="dialog"
          aria-modal="false"
        >
          <ul id={listId} role="listbox" aria-labelledby={btnId} className="max-h-64 overflow-auto py-2">
            {options.map((opt) => {
              const active = selectedSet.has(opt.value);
              return (
                <li key={opt.value} role="option" aria-selected={active}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm" style={{ color: "var(--color-on-surface)" }}>
                    <input type="checkbox" className="h-4 w-4" checked={active} onChange={() => toggleValue(opt.value)} />
                    <span className="truncate">{opt.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
