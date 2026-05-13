"use client";

/**
 * AuditLogsToolbar
 * ----------------
 * Compact toolbar for the global audit log search.
 * Mirrors the dashboard/home DataOperationBar layout:
 *  - Search box (left)
 *  - Filter by dropdown (middle)
 *  - Sort by dropdown (right)
 *
 * State is owned by the parent (AuditLogsSearchClient); this component is
 * presentation + callbacks only so URL state, fetching, and debouncing stay
 * in one place.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search as SearchIcon, X } from "lucide-react";
import type { FilterOption } from "@/constants/dashboard/filters";
import type { AuditLogActionOption } from "@/constants/dashboard/auditLogActions";

export type AuditSortToken = "createdAt:desc" | "createdAt:asc";

const SORT_OPTIONS: ReadonlyArray<{ label: string; value: AuditSortToken }> = [
  { label: "Newest first", value: "createdAt:desc" },
  { label: "Oldest first", value: "createdAt:asc" },
];

type Props = Readonly<{
  searchValue: string;
  onSearchChange: (value: string) => void;

  companyOptions: readonly FilterOption[];
  selectedCompanyIds: readonly string[];
  onCompanyChange: (values: string[]) => void;

  actionOptions: readonly AuditLogActionOption[];
  selectedActions: readonly string[];
  onActionChange: (values: string[]) => void;

  dateFrom: string;
  dateTo: string;
  onDateRangeChange: (from: string, to: string) => void;

  sort: AuditSortToken;
  onSortChange: (value: AuditSortToken) => void;

  onClearAll: () => void;
}>;

export default function AuditLogsToolbar({
  searchValue,
  onSearchChange,
  companyOptions,
  selectedCompanyIds,
  onCompanyChange,
  actionOptions,
  selectedActions,
  onActionChange,
  dateFrom,
  dateTo,
  onDateRangeChange,
  sort,
  onSortChange,
  onClearAll,
}: Props) {
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const filterBtnRef = useRef<HTMLButtonElement | null>(null);

  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement | null>(null);
  const sortBtnRef = useRef<HTMLButtonElement | null>(null);

  // Viewport anchoring (mobile)
  const [isMobile, setIsMobile] = useState(true);
  const [filterTop, setFilterTop] = useState(0);
  const [sortTop, setSortTop] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 1280px)");
    setIsMobile(!mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const recalcFilterTop = useCallback(() => {
    if (!filterBtnRef.current) return;
    const r = filterBtnRef.current.getBoundingClientRect();
    setFilterTop(Math.round(r.bottom + 8));
  }, []);
  const recalcSortTop = useCallback(() => {
    if (!sortBtnRef.current) return;
    const r = sortBtnRef.current.getBoundingClientRect();
    setSortTop(Math.round(r.bottom + 8));
  }, []);

  useEffect(() => {
    if (!filterOpen) return;
    recalcFilterTop();
    const onUpdate = () => recalcFilterTop();
    window.addEventListener("scroll", onUpdate, true);
    window.addEventListener("resize", onUpdate);
    return () => {
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
    };
  }, [filterOpen, recalcFilterTop]);

  useEffect(() => {
    if (!sortOpen) return;
    recalcSortTop();
    const onUpdate = () => recalcSortTop();
    window.addEventListener("scroll", onUpdate, true);
    window.addEventListener("resize", onUpdate);
    return () => {
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
    };
  }, [sortOpen, recalcSortTop]);

  // Close on outside click / Escape
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (filterOpen && filterRef.current && !filterRef.current.contains(t))
        setFilterOpen(false);
      if (sortOpen && sortRef.current && !sortRef.current.contains(t))
        setSortOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [filterOpen, sortOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setFilterOpen(false);
      setSortOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedCompanyIds.length > 0) n += 1;
    if (selectedActions.length > 0) n += 1;
    if (dateFrom) n += 1;
    if (dateTo) n += 1;
    return n;
  }, [selectedCompanyIds.length, selectedActions.length, dateFrom, dateTo]);

  const sortLabel = useMemo(
    () => SORT_OPTIONS.find((s) => s.value === sort)?.label ?? "Newest first",
    [sort],
  );

  const onDateFrom = (v: string) => {
    if (dateTo && v && v > dateTo) onDateRangeChange(dateTo, v);
    else onDateRangeChange(v, dateTo);
  };
  const onDateTo = (v: string) => {
    if (dateFrom && v && v < dateFrom) onDateRangeChange(v, dateFrom);
    else onDateRangeChange(dateFrom, v);
  };

  return (
    <div
      className="rounded-2xl overflow-visible"
      style={{
        boxShadow: "var(--elevation-1)",
        border: "1px solid var(--card-border-color)",
        backgroundColor: "var(--color-surface)",
      }}
    >
      <div className="flex w-full items-stretch min-w-0">
        <div
          className="hidden sm:flex items-center gap-2 px-3 sm:px-4 text-sm font-medium select-none shrink-0"
          style={{
            color: "var(--color-on-lightgray-test)",
            borderRight: "1px solid var(--color-outline)",
          }}
        >
          <span className="font-bold">Data Operations</span>
        </div>

        <div className="grid grid-cols-3 items-stretch gap-2 px-2 py-2 sm:px-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative min-w-0">
            <SearchIcon
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60"
              aria-hidden="true"
            />
            <input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Onboarding ID, actor or driver"
              className="w-full rounded-lg pl-9 pr-8 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 shadow-sm"
              style={{
                backgroundColor: "var(--color-card)",
                color: "var(--color-on-surface)",
              }}
              aria-label="Search audit logs"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-label="Clear search"
                title="Clear"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--color-on-surface-variant)",
                }}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Filter by */}
          <div className="relative min-w-0" ref={filterRef}>
            <button
              ref={filterBtnRef}
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              aria-expanded={filterOpen}
              aria-controls="audit-filters-dropdown"
              className="inline-flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 shadow-sm"
              style={{
                backgroundColor: "var(--color-card)",
                color: "var(--color-on-surface)",
              }}
            >
              <span className="inline-flex items-center gap-2">
                <span>Filter by</span>
                {activeFilterCount > 0 && (
                  <span
                    className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium"
                    style={{
                      backgroundColor: "var(--color-primary-container)",
                      color: "var(--color-primary)",
                    }}
                    aria-label={`${activeFilterCount} active filters`}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  filterOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            <div
              id="audit-filters-dropdown"
              className={`${
                isMobile
                  ? "fixed left-1/2 -translate-x-1/2"
                  : "absolute md:right-0 md:left-auto md:translate-x-0"
              } z-[100] mt-2 w-[calc(100vw-2rem)] max-w-xl lg:max-w-2xl xl:max-w-3xl rounded-xl shadow-lg overflow-visible
                ${filterOpen ? "block" : "hidden"}`}
              style={{
                top: isMobile ? filterTop : undefined,
                backgroundColor: "var(--color-card)",
              }}
              role="menu"
            >
              <div className="grid grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-2">
                {/* Company */}
                <div>
                  <div
                    className="mb-1 text-xs font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Company
                  </div>
                  <MultiSelectDropdown
                    options={companyOptions}
                    selected={selectedCompanyIds}
                    onChange={onCompanyChange}
                    placeholder="Select company"
                    ariaLabel="Filter by company"
                  />
                </div>

                {/* Action */}
                <div>
                  <div
                    className="mb-1 text-xs font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Action
                  </div>
                  <MultiSelectDropdown
                    options={actionOptions}
                    selected={selectedActions}
                    onChange={onActionChange}
                    placeholder="Any action"
                    ariaLabel="Filter by action"
                  />
                </div>

                {/* Date range */}
                <div className="md:col-span-2">
                  <div
                    className="mb-1 text-xs font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Date of event (UTC)
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label
                        htmlFor="audit-date-from"
                        className="text-xs"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        From
                      </label>
                      <input
                        id="audit-date-from"
                        type="date"
                        value={dateFrom}
                        max={dateTo || undefined}
                        onChange={(e) => onDateFrom(e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        style={{
                          backgroundColor: "var(--color-surface)",
                          color: "var(--color-on-surface)",
                          border: "1px solid var(--color-outline)",
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor="audit-date-to"
                        className="text-xs"
                        style={{ color: "var(--color-on-surface-variant)" }}
                      >
                        To
                      </label>
                      <input
                        id="audit-date-to"
                        type="date"
                        value={dateTo}
                        min={dateFrom || undefined}
                        onChange={(e) => onDateTo(e.target.value)}
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        style={{
                          backgroundColor: "var(--color-surface)",
                          color: "var(--color-on-surface)",
                          border: "1px solid var(--color-outline)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky footer */}
              <div className="rounded-b-xl overflow-hidden">
                <div
                  className="sticky bottom-0 flex items-center justify-end gap-2 border-t px-3 py-3 sm:px-4"
                  style={{
                    backgroundColor: "var(--color-card)",
                    borderColor: "var(--color-outline)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onClearAll();
                      setFilterOpen(false);
                    }}
                    className="rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 cursor-pointer"
                    style={{
                      backgroundColor: "transparent",
                      color: "var(--color-on-surface-variant)",
                      border: "1px solid var(--color-outline)",
                    }}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sort by */}
          <div className="relative min-w-0 overflow-visible" ref={sortRef}>
            <button
              ref={sortBtnRef}
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              aria-expanded={sortOpen}
              className="inline-flex w-full items-center justify-between gap-2 shadow-sm rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              style={{
                backgroundColor: "var(--color-card)",
                color: "var(--color-on-surface)",
              }}
            >
              <span className="truncate">{sortLabel}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  sortOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            <div
              className={`${
                isMobile
                  ? "fixed left-1/2 -translate-x-1/2"
                  : "absolute md:right-0 md:left-auto md:translate-x-0"
              } z-[120] mt-2 rounded-xl shadow-lg overflow-hidden
              w-[calc(100vw-2rem)] md:w-auto md:min-w-[14rem] md:max-w-[18rem]
              ${sortOpen ? "block" : "hidden"}`}
              style={{ top: isMobile ? sortTop : undefined }}
              role="menu"
            >
              <div className="bg-[var(--color-card)]">
                <ul className="py-2 px-1 sm:px-2">
                  {SORT_OPTIONS.map((opt) => {
                    const selected = opt.value === sort;
                    return (
                      <li key={opt.value}>
                        <button
                          type="button"
                          onClick={() => {
                            onSortChange(opt.value);
                            setSortOpen(false);
                          }}
                          aria-current={selected ? "true" : undefined}
                          className={`w-full text-left px-4 py-2.5 text-sm rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
                          ${
                            selected
                              ? "font-medium bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                              : "text-[var(--color-on-surface)] hover:bg-[var(--color-primary-container)] hover:text-[var(--color-primary)]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* MultiSelectDropdown                                                       */
/* ------------------------------------------------------------------------ */

type Option = Readonly<{ value: string; label: string }>;

type MultiSelectProps = Readonly<{
  options: readonly Option[];
  selected: readonly string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  ariaLabel: string;
}>;

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  ariaLabel,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleValue = (val: string) => {
    const next = new Set(selectedSet);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    onChange(Array.from(next));
  };

  const label = selectedSet.size ? `${selectedSet.size} selected` : placeholder;

  return (
    <div className="relative min-w-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="inline-flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        style={{
          backgroundColor: "var(--color-surface)",
          color: "var(--color-on-surface)",
          border: "1px solid var(--color-outline)",
        }}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
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
          <ul
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-64 overflow-auto py-2"
          >
            {options.map((opt) => {
              const active = selectedSet.has(opt.value);
              return (
                <li key={opt.value} role="option" aria-selected={active}>
                  <label
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-primary-container)]"
                    style={{ color: "var(--color-on-surface)" }}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={active}
                      onChange={() => toggleValue(opt.value)}
                    />
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
