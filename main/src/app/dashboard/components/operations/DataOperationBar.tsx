"use client";

/**
 * DataOperationBar — Unified toolbar (mobile-first)
 * -------------------------------------------------
 * - Label cell is hidden on mobile.
 * - Search flexes; Filter/Sort stay compact (shrink-0).
 * - Menus are full-width on phones, aligned to the right on desktop.
 * - No color changes: everything uses your CSS variables.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type {
  QueryShape,
  SortToken,
  CategoryTab,
} from "@/hooks/dashboard/useAdminOnboardingQueryState";
import { EStepPath } from "@/types/onboardingTracker.types";

import CompanyFilter from "./CompanyFilter";
import ApplicationTypeFilter from "./ApplicationTypeFilter";
import CreatedRangePicker from "./CreatedRangePicker";
import type { FilterOption } from "@/constants/dashboard/filters";
import { ChevronDown, Search as SearchIcon, X } from "lucide-react";

type Props = Readonly<{
  query: QueryShape;
  onSearch: (value?: string) => void;
  onSortChange: (value?: SortToken | string) => void;
  onCompletedToggle: (value?: boolean) => void;
  onTerminatedToggle: (value?: boolean) => void;
  onCEStateChange: (emailSent: boolean | undefined) => void;
  onDTStateChange: (uploaded: boolean | undefined) => void;
  companyOptions?: readonly FilterOption[];
  applicationTypeOptions?: readonly FilterOption[];
  onCompanyChange?: (values?: string[]) => void;
  onApplicationTypeChange?: (values?: string[]) => void;
  onCreatedRangeChange?: (from?: string, to?: string) => void;
  lockedTerminated?: boolean;
  showCompletedToggle?: boolean;
  onCategoryChange?: (tab: CategoryTab) => void;
  onStepFilterChange?: (step?: EStepPath) => void;
  onCompletedWithTruckToggle?: (value?: boolean) => void;
  onClearAll?: () => void;
}>;

const SORT_OPTIONS: Array<{ label: string; value: SortToken | string }> = [
  { label: "Last updated (newest)", value: "updatedAt:desc" },
  { label: "Date created (oldest first)", value: "createdAt:asc" },
  { label: "Date created (newest first)", value: "createdAt:desc" },
  { label: "Name A–Z", value: "driverNameAsc" },
  { label: "Name Z–A", value: "driverNameDesc" },
  { label: "Progress ↑", value: "progress:asc" },
  { label: "Progress ↓", value: "progress:desc" },
];

export default function DataOperationBar({
  query,
  onSearch,
  onSortChange,
  onCompletedToggle,
  onTerminatedToggle,
  onCEStateChange,
  onDTStateChange,
  companyOptions,
  applicationTypeOptions,
  onCompanyChange,
  onApplicationTypeChange,
  onCreatedRangeChange,
  lockedTerminated = false,
  showCompletedToggle = true,
  onCategoryChange,
  onStepFilterChange,
  onCompletedWithTruckToggle,
  onClearAll,
}: Props) {
  const [search, setSearch] = useState(query.driverName ?? "");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement | null>(null);

  // In-progress step filter options
  const IN_PROGRESS_STEPS: readonly EStepPath[] = useMemo(
    () => [
      EStepPath.APPLICATION_PAGE_1,
      EStepPath.APPLICATION_PAGE_2,
      EStepPath.APPLICATION_PAGE_3,
      EStepPath.APPLICATION_PAGE_4,
      EStepPath.APPLICATION_PAGE_5,
      EStepPath.POLICIES_CONSENTS,
    ],
    []
  );

  const isInProgressStep = useCallback(
    (step?: EStepPath): step is EStepPath => {
      return !!step && IN_PROGRESS_STEPS.includes(step);
    },
    [IN_PROGRESS_STEPS]
  );

  // CE/DT single-select dropdowns
  const [ceOpen, setCeOpen] = useState(false);
  const ceRef = useRef<HTMLDivElement | null>(null);
  const [dtOpen, setDtOpen] = useState(false);
  const dtRef = useRef<HTMLDivElement | null>(null);

  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement | null>(null);

  const [stepOpen, setStepOpen] = useState(false);
  const stepRef = useRef<HTMLDivElement | null>(null);

  // Sync from URL
  useEffect(() => setSearch(query.driverName ?? ""), [query.driverName]);

  // Debounce search
  useEffect(() => {
    const current = query.driverName ?? "";
    if (search === current) return;
    const t = setTimeout(() => onSearch(search || undefined), 350);
    return () => clearTimeout(t);
  }, [search, onSearch, query.driverName]);

  // Close dropdowns on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (open && dropdownRef.current && !dropdownRef.current.contains(target))
        setOpen(false);
      if (
        statusOpen &&
        statusRef.current &&
        !statusRef.current.contains(target)
      )
        setStatusOpen(false);
      if (sortOpen && sortRef.current && !sortRef.current.contains(target))
        setSortOpen(false);
      if (ceOpen && ceRef.current && !ceRef.current.contains(target))
        setCeOpen(false);
      if (dtOpen && dtRef.current && !dtRef.current.contains(target))
        setDtOpen(false);
      if (stepOpen && stepRef.current && !stepRef.current.contains(target))
        setStepOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open, statusOpen, sortOpen, ceOpen, dtOpen, stepOpen]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      setStatusOpen(false);
      setSortOpen(false);
      setCeOpen(false);
      setDtOpen(false);
      setStepOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Sort menu: viewport-anchored on mobile
  const sortBtnRef = useRef<HTMLButtonElement | null>(null);
  const [isMobile, setIsMobile] = useState(true);
  const [sortTop, setSortTop] = useState(0);

  // media query: initialize from mql, then listen for events (no unions)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 1280px)");
    setIsMobile(!mql.matches); // desktop => matches=true => isMobile=false
    const onChange = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // compute panel top under the button (Sort)
  const recalcSortTop = useCallback(() => {
    if (!sortBtnRef.current) return;
    const r = sortBtnRef.current.getBoundingClientRect();
    setSortTop(Math.round(r.bottom + 8)); // 8px gap
  }, []);

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

  const sortValue = useMemo(() => query.sort ?? "updatedAt:desc", [query.sort]);
  const selectedCategory: CategoryTab = query.currentTab;
  const showCE = selectedCategory === "carriers-edge-training";
  const showDT = selectedCategory === "drug-test";

  // Completed / truck filter tri-state helpers
  const completedFlag = query.completed;
  const hasTruckFlag = query.hasTruckUnitNumber;

  // In "all completed" state (completed=true, hasTruckFlag undefined),
  // both checkboxes render as checked.
  const isCompletedWithoutChecked =
    completedFlag === true &&
    (hasTruckFlag === false || typeof hasTruckFlag === "undefined");

  const isCompletedWithChecked =
    completedFlag === true &&
    (hasTruckFlag === true || typeof hasTruckFlag === "undefined");

  // Labels for CE/DT custom single-selects
  const ceLabel = useMemo(() => {
    if (typeof query.carriersEdgeTrainingEmailSent === "boolean") {
      return query.carriersEdgeTrainingEmailSent
        ? "Email sent"
        : "Pending email";
    }
    return "All";
  }, [query.carriersEdgeTrainingEmailSent]);

  const dtLabel = useMemo(() => {
    if (typeof query.drugTestDocumentsUploaded === "boolean") {
      return query.drugTestDocumentsUploaded ? "Uploaded" : "Pending upload";
    }
    return "All";
  }, [query.drugTestDocumentsUploaded]);

  const stepLabel = useMemo(() => {
    if (!isInProgressStep(query.currentStep)) {
      return "Any in-progress step";
    }

    switch (query.currentStep) {
      case EStepPath.APPLICATION_PAGE_1:
        return "Application form – Page 1";
      case EStepPath.APPLICATION_PAGE_2:
        return "Application form – Page 2";
      case EStepPath.APPLICATION_PAGE_3:
        return "Application form – Page 3";
      case EStepPath.APPLICATION_PAGE_4:
        return "Application form – Page 4";
      case EStepPath.APPLICATION_PAGE_5:
        return "Application form – Page 5";
      case EStepPath.POLICIES_CONSENTS:
        return "Policies & consents";
      default:
        return "Any in-progress step";
    }
  }, [query.currentStep, isInProgressStep]);

  // Active filter count (for the Filter by button badge)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (Array.isArray(query.companyId) && query.companyId.length > 0)
      count += 1;
    if (
      Array.isArray(query.applicationType) &&
      query.applicationType.length > 0
    )
      count += 1;
    if (query.createdAtFrom) count += 1;
    if (query.createdAtTo) count += 1;
    if (typeof query.carriersEdgeTrainingEmailSent === "boolean") count += 1;
    if (typeof query.drugTestDocumentsUploaded === "boolean") count += 1;
    if (typeof query.completed === "boolean") count += 1;
    if (typeof query.terminated === "boolean") count += 1;
    if (typeof query.hasTruckUnitNumber === "boolean") count += 1;
    if (isInProgressStep(query.currentStep)) count += 1;
    return count;
  }, [
    query.companyId,
    query.applicationType,
    query.createdAtFrom,
    query.createdAtTo,
    query.carriersEdgeTrainingEmailSent,
    query.drugTestDocumentsUploaded,
    query.completed,
    query.terminated,
    query.hasTruckUnitNumber,
    query.currentStep,
    isInProgressStep,
  ]);

  // ---------- NEW: Filter dropdown viewport anchoring (mobile) ----------
  const filterBtnRef = useRef<HTMLButtonElement | null>(null);
  const [filterTop, setFilterTop] = useState(0);

  const recalcFilterTop = useCallback(() => {
    if (!filterBtnRef.current) return;
    const r = filterBtnRef.current.getBoundingClientRect();
    setFilterTop(Math.round(r.bottom + 8)); // 8px gap
  }, []);

  useEffect(() => {
    if (!open) return;
    recalcFilterTop();
    const onUpdate = () => recalcFilterTop();
    window.addEventListener("scroll", onUpdate, true);
    window.addEventListener("resize", onUpdate);
    return () => {
      window.removeEventListener("scroll", onUpdate, true);
      window.removeEventListener("resize", onUpdate);
    };
  }, [open, recalcFilterTop]);
  // ---------------------------------------------------------------------

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
        {/* Label cell (hidden on mobile) */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 sm:px-4 text-sm font-medium select-none shrink-0"
          style={{
            color: "var(--color-on-lightgray-test)",
            borderRight: "1px solid var(--color-outline)",
          }}
        >
          <span className="font-bold">Data Operations</span>
        </div>

        {/* Controls: EXACT equal widths via 3-col grid */}
        <div className="grid grid-cols-3 items-stretch gap-2 px-2 py-2 sm:px-3 flex-1 min-w-0">
          {/* Search (col 1) */}
          <div className="relative min-w-0">
            <SearchIcon
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60"
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or Truck No"
              className="w-full rounded-lg pl-9 pr-8 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 shadow-sm"
              style={{
                backgroundColor: "var(--color-card)",
                color: "var(--color-on-surface)",
              }}
              aria-label="Search by driver name or truck number"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
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

          {/* Filter by (col 2) */}
          <div className="relative min-w-0" ref={dropdownRef}>
            <button
              ref={filterBtnRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="filters-dropdown"
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
                  open ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {/* Dropdown panel (fixed on phones, right-aligned absolute on desktop) */}
            <div
              id="filters-dropdown"
              className={`${
                isMobile
                  ? "fixed left-1/2 -translate-x-1/2"
                  : "absolute md:right-0 md:left-auto md:translate-x-0"
              } z-[100] mt-2 w-[calc(100vw-2rem)] max-w-xl lg:max-w-2xl xl:max-w-3xl rounded-xl shadow-lg overflow-visible
                ${open ? "block" : "hidden"}`}
              style={{
                top: isMobile ? filterTop : undefined, // NEW dynamic top on mobile
                backgroundColor: "var(--color-card)",
              }}
              role="menu"
            >
              <div className="grid grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-2 xl:grid-cols-3">
                {/* Category selector */}
                {onCategoryChange && (
                  <div>
                    <div
                      className="mb-1 text-xs font-medium"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      Category
                    </div>
                    <select
                      className="w-full rounded-lg px-2 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      style={{
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-on-surface)",
                        border: "1px solid var(--color-outline)",
                      }}
                      value={selectedCategory}
                      onChange={(e) =>
                        onCategoryChange(e.target.value as CategoryTab)
                      }
                    >
                      <option value="all">All</option>
                      <option value="drive-test">Drive Test</option>
                      <option value="carriers-edge-training">
                        Carriers Edge
                      </option>
                      <option value="drug-test">Drug Test</option>
                    </select>
                  </div>
                )}

                {/* Company */}
                {companyOptions && onCompanyChange && (
                  <div>
                    <div
                      className="mb-1 text-xs font-medium"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      Company
                    </div>
                    <CompanyFilter
                      options={companyOptions}
                      selected={query.companyId}
                      onChange={onCompanyChange}
                    />
                  </div>
                )}

                {/* Application Type */}
                {applicationTypeOptions && onApplicationTypeChange && (
                  <div>
                    <div
                      className="mb-1 text-xs font-medium"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      Application Type
                    </div>
                    <ApplicationTypeFilter
                      options={applicationTypeOptions}
                      selected={query.applicationType}
                      onChange={onApplicationTypeChange}
                    />
                  </div>
                )}

                {/* Status */}
                <div className="md:col-span-1 relative" ref={statusRef}>
                  <div
                    className="mb-1 text-xs font-medium"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Status
                  </div>
                  <button
                    type="button"
                    onClick={() => setStatusOpen((v) => !v)}
                    aria-expanded={statusOpen}
                    className="inline-flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      color: "var(--color-on-surface)",
                      border: "1px solid var(--color-outline)",
                    }}
                  >
                    Select status{" "}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        statusOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {statusOpen && (
                    <div
                      className="absolute left-0 right-0 z-[120] mt-2 rounded-xl shadow-md"
                      style={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-outline)",
                      }}
                      role="dialog"
                      aria-modal="false"
                    >
                      <div
                        className="space-y-2 p-3 sm:p-4"
                        style={{ color: "var(--color-on-surface)" }}
                      >
                        {showCompletedToggle && (
                          <>
                            {/* Completed – WITHOUT truck/unit assigned */}
                            {onCompletedWithTruckToggle && (
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={isCompletedWithoutChecked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    const { completed, hasTruckUnitNumber } =
                                      query;

                                    let nextCompleted: boolean | undefined =
                                      completed;
                                    let nextHasTruck: boolean | undefined =
                                      hasTruckUnitNumber;

                                    if (checked) {
                                      // Turning ON "without"
                                      if (
                                        completed === true &&
                                        hasTruckUnitNumber === true
                                      ) {
                                        // was: only WITH → now BOTH
                                        nextCompleted = true;
                                        nextHasTruck = undefined;
                                      } else {
                                        // default: only WITHOUT
                                        nextCompleted = true;
                                        nextHasTruck = false;
                                      }
                                    } else {
                                      // Turning OFF "without"
                                      if (
                                        completed === true &&
                                        hasTruckUnitNumber === false
                                      ) {
                                        // was: only WITHOUT → now none
                                        nextCompleted = undefined;
                                        nextHasTruck = undefined;
                                      } else if (
                                        completed === true &&
                                        typeof hasTruckUnitNumber ===
                                          "undefined"
                                      ) {
                                        // was: BOTH → now only WITH
                                        nextCompleted = true;
                                        nextHasTruck = true;
                                      }
                                    }

                                    onCompletedWithTruckToggle(nextHasTruck);
                                    onCompletedToggle(nextCompleted);
                                  }}
                                />
                                <span>
                                  Completed – without truck/unit assigned
                                </span>
                              </label>
                            )}

                            {/* Completed – WITH truck/unit assigned */}
                            {onCompletedWithTruckToggle && (
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={isCompletedWithChecked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    const { completed, hasTruckUnitNumber } =
                                      query;

                                    let nextCompleted: boolean | undefined =
                                      completed;
                                    let nextHasTruck: boolean | undefined =
                                      hasTruckUnitNumber;

                                    if (checked) {
                                      // Turning ON "with"
                                      if (
                                        completed === true &&
                                        hasTruckUnitNumber === false
                                      ) {
                                        // was: only WITHOUT → now BOTH
                                        nextCompleted = true;
                                        nextHasTruck = undefined;
                                      } else {
                                        // default: only WITH
                                        nextCompleted = true;
                                        nextHasTruck = true;
                                      }
                                    } else {
                                      // Turning OFF "with"
                                      if (
                                        completed === true &&
                                        hasTruckUnitNumber === true
                                      ) {
                                        // was: only WITH → now none
                                        nextCompleted = undefined;
                                        nextHasTruck = undefined;
                                      } else if (
                                        completed === true &&
                                        typeof hasTruckUnitNumber ===
                                          "undefined"
                                      ) {
                                        // was: BOTH → now only WITHOUT
                                        nextCompleted = true;
                                        nextHasTruck = false;
                                      }
                                    }

                                    onCompletedWithTruckToggle(nextHasTruck);
                                    onCompletedToggle(nextCompleted);
                                  }}
                                />
                                <span>
                                  Completed – with truck/unit assigned
                                </span>
                              </label>
                            )}

                            {/* In-progress only */}
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={query.completed === false}
                                onChange={(e) => {
                                  const checked = e.target.checked;

                                  if (checked) {
                                    // Moving to in-progress: clear *any* completed / truck filters
                                    onCompletedWithTruckToggle?.(undefined);
                                    onCompletedToggle?.(false);
                                  } else {
                                    // Turning off in-progress: clear specific step selection and completed flag
                                    onStepFilterChange?.(undefined);
                                    onCompletedToggle?.(undefined);
                                  }
                                }}
                              />
                              <span>In-progress applications</span>
                            </label>

                            {/* In-progress step filter */}
                            {onStepFilterChange && (
                              <div
                                className="mt-2 space-y-1 relative"
                                ref={stepRef}
                              >
                                <div
                                  className="text-xs"
                                  style={{
                                    color: "var(--color-on-surface-variant)",
                                  }}
                                >
                                  In-progress step
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setStepOpen((v) => !v)}
                                  aria-expanded={stepOpen}
                                  className="inline-flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                  style={{
                                    backgroundColor: "var(--color-surface)",
                                    color: "var(--color-on-surface)",
                                    border: "1px solid var(--color-outline)",
                                  }}
                                >
                                  <span className="truncate">{stepLabel}</span>
                                  <ChevronDown
                                    className={`h-4 w-4 shrink-0 transition-transform ${
                                      stepOpen ? "rotate-180" : ""
                                    }`}
                                    aria-hidden="true"
                                  />
                                </button>

                                {stepOpen && (
                                  <div
                                    className="absolute left-0 right-0 z-[130] mt-2 rounded-xl shadow-md"
                                    style={{
                                      backgroundColor: "var(--color-card)",
                                      border: "1px solid var(--color-outline)",
                                    }}
                                    role="listbox"
                                    aria-label="In-progress step"
                                  >
                                    <ul className="py-2">
                                      {[
                                        {
                                          label: "Any in-progress step",
                                          value: undefined,
                                        },
                                        {
                                          label: "Application form – Page 1",
                                          value: EStepPath.APPLICATION_PAGE_1,
                                        },
                                        {
                                          label: "Application form – Page 2",
                                          value: EStepPath.APPLICATION_PAGE_2,
                                        },
                                        {
                                          label: "Application form – Page 3",
                                          value: EStepPath.APPLICATION_PAGE_3,
                                        },
                                        {
                                          label: "Application form – Page 4",
                                          value: EStepPath.APPLICATION_PAGE_4,
                                        },
                                        {
                                          label: "Application form – Page 5",
                                          value: EStepPath.APPLICATION_PAGE_5,
                                        },
                                        {
                                          label: "Policies & consents",
                                          value: EStepPath.POLICIES_CONSENTS,
                                        },
                                      ].map((opt) => (
                                        <li key={String(opt.value ?? "any")}>
                                          <button
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[var(--color-primary-container)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                            style={{
                                              color: "var(--color-on-surface)",
                                            }}
                                            onClick={() => {
                                              const nextStep = opt.value;

                                              if (nextStep) {
                                                // Concrete step => force in-progress and clear completed filters
                                                onCompletedWithTruckToggle?.(
                                                  undefined
                                                );
                                                onCompletedToggle?.(false);
                                              }

                                              onStepFilterChange(nextStep);
                                              setStepOpen(false);
                                            }}
                                          >
                                            {opt.label}
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {!lockedTerminated ? (
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={query.terminated === true}
                              onChange={(e) =>
                                onTerminatedToggle?.(
                                  e.target.checked ? true : undefined
                                )
                              }
                            />
                            <span>Terminated applications</span>
                          </label>
                        ) : (
                          <span
                            className="text-sm"
                            style={{ color: "var(--color-on-surface-variant)" }}
                          >
                            Terminated only
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Created range */}
                {onCreatedRangeChange && (
                  <div className="md:col-span-2 lg:col-span-2">
                    <div
                      className="mb-1 text-xs font-medium"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      Date of creation
                    </div>
                    <CreatedRangePicker
                      from={query.createdAtFrom}
                      to={query.createdAtTo}
                      onChange={onCreatedRangeChange}
                    />
                  </div>
                )}

                {/* CE sub-state */}
                {showCE && (
                  <div className="relative md:self-end min-w-0" ref={ceRef}>
                    <div
                      className="mb-1 text-xs font-medium"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      Carriers Edge status
                    </div>
                    <button
                      type="button"
                      onClick={() => setCeOpen((v) => !v)}
                      aria-expanded={ceOpen}
                      className="inline-flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      style={{
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-on-surface)",
                        border: "1px solid var(--color-outline)",
                      }}
                    >
                      <span className="truncate">{ceLabel}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          ceOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    {ceOpen && (
                      <div
                        className="absolute left-0 right-0 z-[120] mt-2 rounded-xl shadow-md"
                        style={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-outline)",
                        }}
                        role="listbox"
                        aria-label="Carriers Edge status"
                      >
                        <ul className="py-2">
                          {[
                            { label: "All", value: undefined },
                            { label: "Pending email", value: false },
                            { label: "Email sent", value: true },
                          ].map((opt) => (
                            <li key={String(opt.value)}>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[var(--color-primary-container)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                style={{ color: "var(--color-on-surface)" }}
                                onClick={() => {
                                  onCEStateChange(
                                    opt.value as boolean | undefined
                                  );
                                  setCeOpen(false);
                                }}
                              >
                                {opt.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* DT sub-state */}
                {showDT && (
                  <div className="relative md:self-end min-w-0" ref={dtRef}>
                    <div
                      className="mb-1 text-xs font-medium"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    >
                      Drug Test status
                    </div>
                    <button
                      type="button"
                      onClick={() => setDtOpen((v) => !v)}
                      aria-expanded={dtOpen}
                      className="inline-flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      style={{
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-on-surface)",
                        border: "1px solid var(--color-outline)",
                      }}
                    >
                      <span className="truncate">{dtLabel}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          dtOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    {dtOpen && (
                      <div
                        className="absolute left-0 right-0 z-[120] mt-2 rounded-xl shadow-md"
                        style={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-outline)",
                        }}
                        role="listbox"
                        aria-label="Drug Test status"
                      >
                        <ul className="py-2">
                          {[
                            { label: "All", value: undefined },
                            { label: "Pending upload", value: false },
                            { label: "Uploaded", value: true },
                          ].map((opt) => (
                            <li key={String(opt.value)}>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-[var(--color-primary-container)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                style={{ color: "var(--color-on-surface)" }}
                                onClick={() => {
                                  onDTStateChange(
                                    opt.value as boolean | undefined
                                  );
                                  setDtOpen(false);
                                }}
                              >
                                {opt.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sticky footer (wrapped to respect rounded corners) */}
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
                      setSearch(""); // Clear local input immediately for UX
                      onClearAll?.(); // Let HomeClient do a single router.replace with all params wiped
                      // Close the filter panels
                      setOpen(false);
                      setStatusOpen(false);
                      setCeOpen?.(false);
                      setDtOpen?.(false);
                      setStepOpen(false);
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

          {/* Sort by (col 3) */}
          <div className="relative min-w-0 overflow-visible" ref={sortRef}>
            <button
              ref={sortBtnRef}
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              aria-expanded={sortOpen}
              className="inline-flex w-full items-center justify-between gap-2 shadow-sm  rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              style={{
                backgroundColor: "var(--color-card)",
                color: "var(--color-on-surface)",
              }}
            >
              Sort by{" "}
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
     w-[calc(100vw-2rem)] md:w-auto md:min-w-[18rem] md:max-w-[22rem]
     ${sortOpen ? "block" : "hidden"}`}
              style={{ top: isMobile ? sortTop : undefined }}
              role="menu"
            >
              <div className="bg-[var(--color-card)]">
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
                          aria-current={selected ? "true" : undefined}
                          className={`w-full text-left px-4 py-2.5 text-sm rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30
                          ${
                            selected
                              ? "font-medium bg-[var(--color-primary-container)] text-[var(--color-primary)]"
                              : "text-[var(--color-on-surface)] hover:bg-[var(--color-primary-container)]"
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
