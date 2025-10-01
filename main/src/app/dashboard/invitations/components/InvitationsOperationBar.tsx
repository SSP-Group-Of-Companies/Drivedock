// invitations/components/InvitationsOperationBar.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { InvitationQueryShape, InvitationSortToken } from "@/hooks/dashboard/useAdminInvitationQueryState";
import type { FilterOption } from "@/constants/dashboard/filters";
import { ChevronDown, Search as SearchIcon, X } from "lucide-react";
import CompanyFilter from "./filters/CompanyFilter";
import ApplicationTypeFilter from "./filters/ApplicationTypeFilter";

type Props = Readonly<{
  query: InvitationQueryShape;
  onSearch: (value?: string) => void;
  onSortChange: (value?: InvitationSortToken | string) => void;
  companyOptions?: readonly FilterOption[];
  applicationTypeOptions?: readonly FilterOption[];
  onCompanyChange?: (values?: string[]) => void;
  onApplicationTypeChange?: (values?: string[]) => void;
  onClearAll?: () => void;
}>;

const SORT_OPTIONS: Array<{ label: string; value: InvitationSortToken | string }> = [
  { label: "Last updated (newest)", value: "updatedAt:desc" },
  { label: "Date created (oldest first)", value: "createdAt:asc" },
  { label: "Date created (newest first)", value: "createdAt:desc" },
  { label: "Name A–Z", value: "name:asc" },
  { label: "Name Z–A", value: "name:desc" },
];

export default function InvitationsOperationBar({ query, onSearch, onSortChange, companyOptions, applicationTypeOptions, onCompanyChange, onApplicationTypeChange, onClearAll }: Props) {
  const [search, setSearch] = useState(query.driverName ?? "");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const sortRef = useRef<HTMLDivElement | null>(null);

  // sync & debounce search
  useEffect(() => setSearch(query.driverName ?? ""), [query.driverName]);
  useEffect(() => {
    const current = query.driverName ?? "";
    if (search === current) return;
    const t = setTimeout(() => onSearch(search || undefined), 350);
    return () => clearTimeout(t);
  }, [search, onSearch, query.driverName]);

  // close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const n = e.target as Node;
      if (filterOpen && filterRef.current && !filterRef.current.contains(n)) setFilterOpen(false);
      if (sortOpen && sortRef.current && !sortRef.current.contains(n)) setSortOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [filterOpen, sortOpen]);

  // mobile viewport anchoring (same as Terminated)
  const sortBtnRef = useRef<HTMLButtonElement | null>(null);
  const filterBtnRef = useRef<HTMLButtonElement | null>(null);
  const [isMobile, setIsMobile] = useState(true);
  const [sortTop, setSortTop] = useState(0);
  const [filterTop, setFilterTop] = useState(0);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1280px)");
    setIsMobile(!mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const recalcSortTop = useCallback(() => {
    if (!sortBtnRef.current) return;
    setSortTop(Math.round(sortBtnRef.current.getBoundingClientRect().bottom + 8));
  }, []);
  const recalcFilterTop = useCallback(() => {
    if (!filterBtnRef.current) return;
    setFilterTop(Math.round(filterBtnRef.current.getBoundingClientRect().bottom + 8));
  }, []);
  useEffect(() => {
    if (!sortOpen && !filterOpen) return;
    const onUpdate = () => {
      if (sortOpen) recalcSortTop();
      if (filterOpen) recalcFilterTop();
    };
    window.addEventListener("scroll", onUpdate, true);
    window.addEventListener("resize", onUpdate);
    onUpdate();
    return () => {
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
    };
  }, [sortOpen, filterOpen, recalcSortTop, recalcFilterTop]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (query.companyId?.length) n += 1;
    if (query.applicationType?.length) n += 1;
    return n;
  }, [query.companyId, query.applicationType]);

  const sortValue = useMemo(() => query.sort ?? "updatedAt:desc", [query.sort]);

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
        {/* left label cell (hidden on mobile) – matches Terminated */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 sm:px-4 text-sm font-medium select-none shrink-0"
          style={{
            color: "var(--color-on-lightgray-test)",
            borderRight: "1px solid var(--color-outline)",
          }}
        >
          <span className="font-bold">Data Operations</span>
        </div>

        {/* 3 equal columns: Search | Filter by | Sort by */}
        <div className="grid grid-cols-3 items-stretch gap-2 px-2 py-2 sm:px-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative min-w-0">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, Email or Phone"
              className="w-full rounded-lg pl-9 pr-8 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 shadow-sm"
              style={{ backgroundColor: "var(--color-card)", color: "var(--color-on-surface)" }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1" aria-label="Clear">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter by */}
          <div className="relative min-w-0" ref={filterRef}>
            <button
              ref={filterBtnRef}
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="inline-flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary/30 shadow-sm"
              style={{ backgroundColor: "var(--color-card)", color: "var(--color-on-surface)" }}
            >
              <span className="inline-flex items-center gap-2">
                <span>Filter by</span>
                {activeFilterCount > 0 && (
                  <span
                    className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium"
                    style={{ backgroundColor: "var(--color-primary-container)", color: "var(--color-primary)" }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
            </button>

            <div
              className={`${
                isMobile ? "fixed left-1/2 -translate-x-1/2" : "absolute right-0"
              } z-[100] mt-2 w-[calc(100vw-2rem)] max-w-xl lg:max-w-2xl xl:max-w-3xl rounded-xl shadow-lg overflow-visible ${filterOpen ? "block" : "hidden"}`}
              style={{ top: isMobile ? filterTop : undefined, backgroundColor: "var(--color-card)" }}
              role="menu"
            >
              <div className="grid grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-2 xl:grid-cols-3">
                {companyOptions && onCompanyChange && (
                  <div>
                    <div className="mb-1 text-xs font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                      Company
                    </div>
                    <CompanyFilter options={companyOptions} selected={query.companyId} onChange={onCompanyChange} />
                  </div>
                )}

                {applicationTypeOptions && onApplicationTypeChange && (
                  <div>
                    <div className="mb-1 text-xs font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                      Application Type
                    </div>
                    <ApplicationTypeFilter options={applicationTypeOptions} selected={query.applicationType} onChange={onApplicationTypeChange} />
                  </div>
                )}
              </div>

              {/* sticky footer like Terminated */}
              <div className="rounded-b-xl overflow-hidden">
                <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t px-3 py-3 sm:px-4" style={{ backgroundColor: "var(--color-card)", borderColor: "var(--color-outline)" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      onClearAll?.();
                      setFilterOpen(false);
                    }}
                    className="rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: "transparent", color: "var(--color-on-surface-variant)", border: "1px solid var(--color-outline)" }}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sort by */}
          <div className="relative min-w-0" ref={sortRef}>
            <button
              ref={sortBtnRef}
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              className="inline-flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-primary/30 shadow-sm"
              style={{ backgroundColor: "var(--color-card)", color: "var(--color-on-surface)" }}
            >
              Sort by <ChevronDown className={`h-4 w-4 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
            </button>

            <div
              className={`${
                isMobile ? "fixed left-1/2 -translate-x-1/2" : "absolute right-0"
              } z-[120] mt-2 rounded-xl shadow-lg overflow-hidden w-[calc(100vw-2rem)] md:w-auto md:min-w-[18rem] md:max-w-[22rem] ${sortOpen ? "block" : "hidden"}`}
              style={{ top: isMobile ? sortTop : undefined, backgroundColor: "var(--color-card)" }}
              role="menu"
            >
              <ul className="py-2 px-1 sm:px-2">
                {SORT_OPTIONS.map((opt) => {
                  const selected = opt.value === sortValue;
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        onClick={() => {
                          onSortChange(opt.value);
                          setSortOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm rounded-md ${
                          selected ? "font-medium bg-[var(--color-primary-container)] text-[var(--color-primary)]" : "hover:bg-[var(--color-primary-container)]"
                        }`}
                        style={{ color: "var(--color-on-surface)" }}
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
  );
}
