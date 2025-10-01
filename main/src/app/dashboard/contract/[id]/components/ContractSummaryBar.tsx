
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import {
  resolveCompanyMeta,
  flagSrcFor,
  listCompaniesByCountry,
} from "@/constants/dashboard/companies";
import { getOnboardingStepFlow } from "@/lib/utils/onboardingUtils";
import type { EStepPath } from "@/types/onboardingTracker.types";
import { ECountryCode } from "@/types/shared.types";
import { ChevronDown, Bell, Building2, StickyNote } from "lucide-react";
import Image from "next/image";

import NotificationsMenu, { computeNotifications } from "./NotificationsMenu";
import CompanyChangeConfirm from "./CompanyChangeConfirm";
import NotesModal from "./NotesModal";
import { useEditMode } from "./EditModeContext";

type Props = { trackerId: string };

function stepLabel(step?: EStepPath) {
  if (!step) return "Unknown";
  const map: Record<string, string> = {
    PRE_QUALIFICATIONS: "Prequalifications",
    APPLICATION_PAGE_1: "Application — Page 1",
    APPLICATION_PAGE_2: "Application — Page 2",
    APPLICATION_PAGE_3: "Application — Page 3",
    APPLICATION_PAGE_4: "Application — Page 4",
    APPLICATION_PAGE_5: "Application — Page 5",
    POLICIES_CONSENTS: "Policies & Consents",
    DRIVE_TEST: "Drive Test",
    CARRIERS_EDGE_TRAINING: "Carrier's Edge",
    DRUG_TEST: "Drug Test",
    FLATBED_TRAINING: "Flatbed Training",
  };
  return map[step] ?? step;
}

export default function ContractSummaryBar({ trackerId }: Props) {
  const pathname = usePathname();
  const { data, isLoading, isError, error, changeCompany } =
    useContract(trackerId);

  const [confirmTarget, setConfirmTarget] = useState<null | {
    id: string;
    name: string;
  }>(null);

  // Single source of truth for which menu is open
  const [whichOpen, setWhichOpen] = useState<"company" | "notif" | null>(null);
  const isCompanyOpen = whichOpen === "company";
  const isNotifOpen = whichOpen === "notif";

  // Notes modal state
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

  // Edit mode context
  const { isEditMode, setIsEditMode } = useEditMode();

  // Check if driver is terminated or resigned
  const isTerminated = data?.terminated === true;

  // Check if we're on the safety processing page (don't show notes icon there)
  const isSafetyProcessingPage = pathname?.includes("/safety-processing");

  // Check if we're on the prequalification page (toggle should be disabled)
  const isPrequalificationPage = pathname?.includes("/prequalification");

  // Check if we're on the quiz-result page (toggle should be disabled)
  const isQuizResultPage = pathname?.includes("/quiz-result");

  // Check if we're on the policies page (toggle should be disabled)
  const isPoliciesPage = pathname?.includes("/policies");

  // Check if we're on the print page (toggle should be disabled)
  const isPrintPage = pathname?.includes("/print");

  // Check if edit mode toggle should be functional (not prequalification, not quiz-result, not policies, not print, not safety processing, not terminated)
  const canToggleEditMode =
    !isPrequalificationPage &&
    !isQuizResultPage &&
    !isPoliciesPage &&
    !isPrintPage &&
    !isSafetyProcessingPage &&
    !isTerminated;

  const companyMenuRef = useRef<HTMLDivElement | null>(null);
  const notifMenuRef = useRef<HTMLDivElement | null>(null);

  // Outside click (bubble phase) + Escape
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      const inCompany = companyMenuRef.current?.contains(t);
      const inNotif = notifMenuRef.current?.contains(t);
      if (inCompany || inNotif) return;
      if (whichOpen) setWhichOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWhichOpen(null);
    };

    document.addEventListener("pointerdown", onPointerDown); // bubble phase
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [whichOpen]);

  const company = useMemo(
    () => resolveCompanyMeta(data?.companyId),
    [data?.companyId]
  );

  const driverName = data?.itemSummary?.driverName || "—";
  const driverEmail = data?.itemSummary?.driverEmail || "—";
  const truckUnitNumber = data?.itemSummary?.truckUnitNumber;
  const step = data?.status?.currentStep;
  const inProgress = !data?.status?.completed;

  const pct = useMemo(() => {
    if (!data?.status?.currentStep) return 0;
    const flow = getOnboardingStepFlow({
      needsFlatbedTraining: !!data?.needsFlatbedTraining,
    });
    const idx = flow.indexOf(data.status.currentStep);
    if (idx < 0) return 0;
    const denom = Math.max(1, flow.length - 1);
    return Math.min(100, Math.max(0, Math.round((idx / denom) * 100)));
  }, [data?.status?.currentStep, data?.needsFlatbedTraining]);

  const switchableCompanies = useMemo(() => {
    const cc = company.countryCode ?? ECountryCode.CA;
    return listCompaniesByCountry(cc);
  }, [company.countryCode]);

  const canEditCompany = company.countryCode === ECountryCode.CA;
  const notifCount = useMemo(
    () => computeNotifications(data ?? null).length,
    [data]
  );

  // Loading / Error states
  if (isLoading) {
    return (
      <div
        className="mb-4 rounded-xl border p-3 sm:p-4"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-outline)",
          boxShadow: "var(--elevation-1)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded bg-gray-200 sm:h-12 sm:w-12" />
          <div className="flex-1">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="mt-1 h-3 w-48 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="mb-4 rounded-xl border p-3 sm:p-4"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-error)",
          boxShadow: "var(--elevation-1)",
        }}
      >
        <div className="text-sm" style={{ color: "var(--color-error)" }}>
          Error loading contract data:{" "}
          {(error as Error)?.message || "Unknown error"}
        </div>
      </div>
    );
  }

  // Toggle handlers on POINTER DOWN (stopPropagation to avoid global closer)
  const onToggleCompany = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWhichOpen((w) => (w === "company" ? null : "company"));
  };
  const onToggleNotif = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWhichOpen((w) => (w === "notif" ? null : "notif"));
  };

  /* ---------- Mobile/Tablet (two rows) ---------- */
  const MobileRows = (
    <div className="xl:hidden flex flex-col gap-2">
      {/* Row 1: logo + name/email */}
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative h-10 w-10 overflow-hidden rounded">
          <Image
            src={company.logoSrc}
            alt={`${company.label} logo`}
            fill
            className="object-contain"
            sizes="40px"
          />
        </div>
        <div className="min-w-0">
          {truckUnitNumber && (
            <div
              className="truncate text-sm font-medium opacity-50"
              style={{ color: "var(--color-on-surface)" }}
            >
              TN#: {truckUnitNumber}
            </div>
          )}
          <div
            className="truncate text-base font-semibold"
            style={{ color: "var(--color-on-surface)" }}
            title={driverName}
          >
            {driverName}
          </div>
          <div
            className="truncate text-xs"
            style={{ color: "var(--color-on-surface-variant)" }}
            title={driverEmail}
          >
            {driverEmail}
          </div>
        </div>
      </div>

      {/* Row 2: step + % spinner | actions */}
      <div className="flex items-center justify-between gap-2">
        {/* Left chunk */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-3 w-3 rounded-full flex-shrink-0"
            style={{
              backgroundColor: inProgress
                ? "var(--color-warning)"
                : "var(--color-success)",
            }}
            aria-hidden
          />
          {inProgress ? (
            <span
              className="min-w-0 truncate text-xs font-medium"
              style={{ color: "var(--color-on-surface)" }}
              title={stepLabel(step)}
            >
              {stepLabel(step)}
            </span>
          ) : null}

          {/* Percentage circle */}
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              className="transform -rotate-90"
            >
              {(() => {
                const stepFlow = getOnboardingStepFlow({
                  needsFlatbedTraining: !!data?.needsFlatbedTraining,
                });
                const currentIndex = step ? stepFlow.indexOf(step) : -1;
                const totalSteps = stepFlow.length;
                const angleStep = (2 * Math.PI) / totalSteps;
                return stepFlow.map((_, index) => {
                  const angle = index * angleStep;
                  const x = 20 + 15 * Math.cos(angle);
                  const y = 20 + 15 * Math.sin(angle);
                  const isCompleted = index <= currentIndex;
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="2"
                      className={`transition-colors duration-200 ${
                        isCompleted
                          ? "fill-blue-500"
                          : "fill-gray-300 dark:fill-gray-600"
                      }`}
                      aria-hidden="true"
                    />
                  );
                });
              })()}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-xs font-medium"
                style={{ color: "var(--color-primary)" }}
              >
                {pct}%
              </span>
            </div>
          </div>
        </div>

        {/* Right chunk: company + notifications + notes */}
        <div className="flex items-center gap-2">
          {/* Company */}
          <div className="relative hidden sm:block" ref={companyMenuRef}>
            <button
              type="button"
              onPointerDown={onToggleCompany}
              className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
              }}
              aria-haspopup="menu"
              aria-expanded={isCompanyOpen}
              aria-controls="company-menu"
            >
              <span className="relative h-5 w-5 overflow-hidden rounded">
                <Image
                  src={company.logoSrc}
                  alt={`${company.label} logo`}
                  fill
                  className="object-contain"
                  sizes="20px"
                />
              </span>
              <ChevronDown className="h-4 w-4 opacity-60" />
            </button>

            {isCompanyOpen && (
              <div
                id="company-menu"
                role="menu"
                className="absolute right-0 z-40 mt-2 w-72 rounded-xl border p-2 shadow-lg"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                }}
              >
                <div
                  className="px-2 pb-2 text-xs"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  {company.countryCode === ECountryCode.US
                    ? "US companies (read-only)"
                    : "Select a Canadian company"}
                </div>

                <ul className="max-h-72 overflow-auto">
                  {switchableCompanies.map((c) => {
                    const active = c.id === data?.companyId;
                    const disabled = !canEditCompany || active;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          role="menuitem"
                          disabled={disabled}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!active && canEditCompany) {
                              setConfirmTarget({ id: c.id, name: c.name });
                            }
                            setWhichOpen(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm disabled:opacity-50 hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <div className="relative h-6 w-6 overflow-hidden rounded">
                            <Image
                              src={c.logo}
                              alt=""
                              fill
                              className="object-contain"
                              sizes="24px"
                            />
                          </div>
                          <span className="flex-1 truncate" title={c.name}>
                            {c.name}
                          </span>
                          {active && (
                            <span className="text-xs opacity-60">
                              (current)
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative hidden sm:block" ref={notifMenuRef}>
            <button
              type="button"
              onPointerDown={onToggleNotif}
              className="relative inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
              }}
              aria-haspopup="menu"
              aria-expanded={isNotifOpen}
              aria-controls="notif-menu"
            >
              <Bell className="h-4 w-4" />
              {notifCount > 0 && (
                <span
                  className="ml-1 inline-flex items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
                  style={{
                    minWidth: "1rem",
                    background: "var(--color-error)",
                    color: "white",
                    border: "1px solid var(--color-surface)",
                  }}
                  aria-label={`${notifCount} pending notifications`}
                >
                  {notifCount}
                </span>
              )}
              <ChevronDown className="h-4 w-4 opacity-60" />
            </button>

            {isNotifOpen && (
              <NotificationsMenu
                id="notif-menu"
                onClose={() => setWhichOpen(null)}
                context={data ?? null}
                trackerId={trackerId}
              />
            )}
          </div>

          {/* Notes - only show if not on safety processing page */}
          {!isSafetyProcessingPage && (
            <button
              type="button"
              onClick={() => setIsNotesModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
              }}
              aria-label="Open contract notes"
            >
              <StickyNote className="h-4 w-4" />
            </button>
          )}

          {/* Edit Mode Toggle - hidden on safety processing page, functional state varies on other pages */}
          {!isSafetyProcessingPage && (
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-medium"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                Edit Mode
              </span>
              <div className="relative group">
                <button
                  type="button"
                  onClick={() =>
                    canToggleEditMode && setIsEditMode(!isEditMode)
                  }
                  disabled={!canToggleEditMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    canToggleEditMode
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-50"
                  }`}
                  style={{
                    background:
                      canToggleEditMode && isEditMode
                        ? "var(--color-primary)"
                        : "var(--color-outline-variant)",
                  }}
                  aria-label={
                    canToggleEditMode
                      ? `Edit mode is ${isEditMode ? "on" : "off"}`
                      : isTerminated
                      ? "Edit mode disabled - driver is terminated/resigned"
                      : isPrequalificationPage
                      ? "Edit mode disabled - prequalification is read-only"
                      : isQuizResultPage
                      ? "Edit mode disabled - quiz results are read-only"
                      : isPoliciesPage
                      ? "Edit mode disabled - policies are read-only"
                      : isPrintPage
                      ? "Edit mode disabled - print page is read-only"
                      : isSafetyProcessingPage
                      ? "Edit mode disabled during safety processing"
                      : "Edit mode disabled"
                  }
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isEditMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                {/* Tooltip for terminated/resigned driver */}
                {isTerminated && (
                  <div
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                    style={{
                      backgroundColor: "var(--color-surface-container-highest)",
                      color: "var(--color-on-surface)",
                      border: "1px solid var(--color-outline)",
                    }}
                  >
                    Driver is terminated/resigned
                    <div
                      className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                      style={{
                        borderTopColor:
                          "var(--color-surface-container-highest)",
                      }}
                    ></div>
                  </div>
                )}
                {/* Tooltip for prequalification page */}
                {!isTerminated && isPrequalificationPage && (
                  <div
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                    style={{
                      backgroundColor: "var(--color-surface-container-highest)",
                      color: "var(--color-on-surface)",
                      border: "1px solid var(--color-outline)",
                    }}
                  >
                    Prequalification is read-only
                    <div
                      className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                      style={{
                        borderTopColor:
                          "var(--color-surface-container-highest)",
                      }}
                    ></div>
                  </div>
                )}
                {/* Tooltip for quiz result page */}
                {!isTerminated && isQuizResultPage && (
                  <div
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                    style={{
                      backgroundColor: "var(--color-surface-container-highest)",
                      color: "var(--color-on-surface)",
                      border: "1px solid var(--color-outline)",
                    }}
                  >
                    Quiz results are read-only
                    <div
                      className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                      style={{
                        borderTopColor:
                          "var(--color-surface-container-highest)",
                      }}
                    ></div>
                  </div>
                )}
                {/* Tooltip for policies page */}
                {!isTerminated && isPoliciesPage && (
                  <div
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                    style={{
                      backgroundColor: "var(--color-surface-container-highest)",
                      color: "var(--color-on-surface)",
                      border: "1px solid var(--color-outline)",
                    }}
                  >
                    Policies are read-only
                    <div
                      className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                      style={{
                        borderTopColor:
                          "var(--color-surface-container-highest)",
                      }}
                    ></div>
                  </div>
                )}
                {/* Tooltip for print page */}
                {!isTerminated && isPrintPage && (
                  <div
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                    style={{
                      backgroundColor: "var(--color-surface-container-highest)",
                      color: "var(--color-on-surface)",
                      border: "1px solid var(--color-outline)",
                    }}
                  >
                    Print page is read-only
                    <div
                      className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                      style={{
                        borderTopColor:
                          "var(--color-surface-container-highest)",
                      }}
                    ></div>
                  </div>
                )}
                {/* Tooltip for safety processing page */}
                {!isTerminated && isSafetyProcessingPage && (
                  <div
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                    style={{
                      backgroundColor: "var(--color-surface-container-highest)",
                      color: "var(--color-on-surface)",
                      border: "1px solid var(--color-outline)",
                    }}
                  >
                    Edit mode disabled during safety processing
                    <div
                      className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                      style={{
                        borderTopColor:
                          "var(--color-surface-container-highest)",
                      }}
                    ></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ---------- Desktop (grid so the middle stays centered/roomy) ---------- */
  const DesktopRow = (
    <div className="hidden xl:grid xl:grid-cols-[minmax(200px,1fr)_minmax(260px,400px)_auto] xl:items-center xl:gap-4 2xl:grid-cols-[minmax(250px,1fr)_minmax(300px,450px)_auto] 2xl:gap-6">
      {/* Left */}
      <div className="min-w-0 flex items-start gap-3">
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded">
          <Image
            src={company.logoSrc}
            alt={`${company.label} logo`}
            fill
            className="object-contain"
            sizes="48px"
          />
        </div>
        <div className="min-w-0 flex-1">
          {truckUnitNumber && (
            <div
              className="truncate text-sm font-medium opacity-50"
              style={{ color: "var(--color-on-surface)" }}
            >
              TN#: {truckUnitNumber}
            </div>
          )}
          <div
            className="truncate text-lg font-semibold"
            style={{ color: "var(--color-on-surface)" }}
            title={driverName}
          >
            {driverName}
          </div>
          <div
            className="truncate text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
            title={driverEmail}
          >
            {driverEmail}
          </div>
        </div>
      </div>

      {/* Middle */}
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-3">
          <span
            className="inline-block rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              backgroundColor: inProgress
                ? "var(--color-warning-container)"
                : "var(--color-success-container)",
              color: inProgress
                ? "var(--color-warning-on-container)"
                : "var(--color-success-on-container)",
            }}
          >
            {inProgress ? "In Progress" : "Completed"}
          </span>
          {inProgress ? (
            <span
              className="text-xs truncate max-w-[150px]"
              style={{ color: "var(--color-on-surface-variant)" }}
              title={stepLabel(step)}
            >
              {stepLabel(step)}
            </span>
          ) : null}
          <div className="ml-auto">
            <div className="relative h-3.5 w-5 overflow-hidden ring-1 ring-[var(--color-outline-variant)] opacity-[.5]">
              <Image
                src={flagSrcFor(company.countryCode)}
                alt={
                  company.countryCode === ECountryCode.US
                    ? "USA flag"
                    : "Canada flag"
                }
                fill
                className="object-cover"
                sizes="20px"
              />
            </div>
          </div>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ background: "var(--color-outline-variant)" }}
          aria-label="Onboarding progress"
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${pct}%`, background: "var(--color-primary)" }}
          />
        </div>
      </div>

      {/* Right */}
      <div className="min-w-0 flex flex-wrap items-center justify-end gap-2">
        {/* Company */}
        <div className="relative" ref={companyMenuRef}>
          <button
            type="button"
            onPointerDown={onToggleCompany}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm max-w-[200px]"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-outline)",
            }}
            aria-haspopup="menu"
            aria-expanded={isCompanyOpen}
            aria-controls="company-menu-desktop"
          >
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="flex-shrink-0 xl-custom:hidden">Company:</span>
            <span
              className="font-medium truncate min-w-0 xl-custom:hidden"
              title={company.label}
            >
              {company.label}
            </span>
            <ChevronDown className="h-4 w-4 opacity-60 flex-shrink-0" />
          </button>

          {isCompanyOpen && (
            <div
              id="company-menu-desktop"
              role="menu"
              className="absolute right-0 z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border p-2 shadow-lg"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
              }}
            >
              <div
                className="px-2 pb-2 text-xs"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                {company.countryCode === ECountryCode.US
                  ? "US companies (read-only)"
                  : "Select a Canadian company"}
              </div>

              <ul className="max-h-72 overflow-auto">
                {switchableCompanies.map((c) => {
                  const active = c.id === data?.companyId;
                  const disabled = !canEditCompany || active;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={disabled}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!active && canEditCompany) {
                            setConfirmTarget({ id: c.id, name: c.name });
                          }
                          setWhichOpen(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm disabled:opacity-50 hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <div className="relative h-6 w-6 overflow-hidden rounded">
                          <Image
                            src={c.logo}
                            alt=""
                            fill
                            className="object-contain"
                            sizes="24px"
                          />
                        </div>
                        <span className="flex-1 truncate" title={c.name}>
                          {c.name}
                        </span>
                        {active && (
                          <span className="text-xs opacity-60">(current)</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifMenuRef}>
          <button
            type="button"
            onPointerDown={onToggleNotif}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm max-w-[150px]"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-outline)",
            }}
            aria-haspopup="menu"
            aria-expanded={isNotifOpen}
            aria-controls="notif-menu-desktop"
          >
            <Bell className="h-4 w-4" />
            <span className="truncate xl-custom:hidden">Notifications</span>
            {notifCount > 0 && (
              <span
                className="ml-1 inline-flex items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
                style={{
                  minWidth: "1rem",
                  background: "var(--color-error)",
                  color: "white",
                  border: "1px solid var(--color-surface)",
                }}
                aria-label={`${notifCount} pending notifications`}
              >
                {notifCount}
              </span>
            )}
            <ChevronDown className="h-4 w-4 opacity-60" />
          </button>

          {isNotifOpen && (
            <NotificationsMenu
              id="notif-menu-desktop"
              onClose={() => setWhichOpen(null)}
              context={data ?? null}
              trackerId={trackerId}
            />
          )}
        </div>

        {/* Notes - only show if not on safety processing page */}
        {!isSafetyProcessingPage && (
          <button
            type="button"
            onClick={() => setIsNotesModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-outline)",
            }}
            aria-label="Open contract notes"
          >
            <StickyNote className="h-4 w-4" />
            <span className="xl-custom:hidden">Notes</span>
          </button>
        )}

        {/* Edit Mode Toggle - hidden on safety processing page, functional state varies on other pages */}
        {!isSafetyProcessingPage && (
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Edit Mode
            </span>
            <div className="relative group">
              <button
                type="button"
                onClick={() => canToggleEditMode && setIsEditMode(!isEditMode)}
                disabled={!canToggleEditMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  canToggleEditMode
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-50"
                }`}
                style={{
                  background:
                    canToggleEditMode && isEditMode
                      ? "var(--color-primary)"
                      : "var(--color-outline-variant)",
                }}
                aria-label={
                  canToggleEditMode
                    ? `Edit mode is ${isEditMode ? "on" : "off"}`
                    : isTerminated
                    ? "Edit mode disabled - driver is terminated/resigned"
                    : isPrequalificationPage
                    ? "Edit mode disabled - prequalification is read-only"
                    : isQuizResultPage
                    ? "Edit mode disabled - quiz results are read-only"
                    : isPoliciesPage
                    ? "Edit mode disabled - policies are read-only"
                    : isPrintPage
                    ? "Edit mode disabled - print page is read-only"
                    : isSafetyProcessingPage
                    ? "Edit mode disabled during safety processing"
                    : "Edit mode disabled"
                }
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isEditMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              {/* Tooltip for terminated/resigned driver */}
              {isTerminated && (
                <div
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                  style={{
                    backgroundColor: "var(--color-surface-container-highest)",
                    color: "var(--color-on-surface)",
                    border: "1px solid var(--color-outline)",
                  }}
                >
                  Driver is terminated/resigned
                  <div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                    style={{
                      borderTopColor: "var(--color-surface-container-highest)",
                    }}
                  ></div>
                </div>
              )}
              {/* Tooltip for prequalification page */}
              {!isTerminated && isPrequalificationPage && (
                <div
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                  style={{
                    backgroundColor: "var(--color-surface-container-highest)",
                    color: "var(--color-on-surface)",
                    border: "1px solid var(--color-outline)",
                  }}
                >
                  Prequalification is read-only
                  <div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                    style={{
                      borderTopColor: "var(--color-surface-container-highest)",
                    }}
                  ></div>
                </div>
              )}
              {/* Tooltip for quiz result page */}
              {!isTerminated && isQuizResultPage && (
                <div
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                  style={{
                    backgroundColor: "var(--color-surface-container-highest)",
                    color: "var(--color-on-surface)",
                    border: "1px solid var(--color-outline)",
                  }}
                >
                  Quiz results are read-only
                  <div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                    style={{
                      borderTopColor: "var(--color-surface-container-highest)",
                    }}
                  ></div>
                </div>
              )}
              {/* Tooltip for policies page */}
              {!isTerminated && isPoliciesPage && (
                <div
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                  style={{
                    backgroundColor: "var(--color-surface-container-highest)",
                    color: "var(--color-on-surface)",
                    border: "1px solid var(--color-outline)",
                  }}
                >
                  Policies are read-only
                  <div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                    style={{
                      borderTopColor: "var(--color-surface-container-highest)",
                    }}
                  ></div>
                </div>
              )}
              {/* Tooltip for print page */}
              {!isTerminated && isPrintPage && (
                <div
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                  style={{
                    backgroundColor: "var(--color-surface-container-highest)",
                    color: "var(--color-on-surface)",
                    border: "1px solid var(--color-outline)",
                  }}
                >
                  Print page is read-only
                  <div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                    style={{
                      borderTopColor: "var(--color-surface-container-highest)",
                    }}
                  ></div>
                </div>
              )}
              {/* Tooltip for safety processing page */}
              {!isTerminated && isSafetyProcessingPage && (
                <div
                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50"
                  style={{
                    backgroundColor: "var(--color-surface-container-highest)",
                    color: "var(--color-on-surface)",
                    border: "1px solid var(--color-outline)",
                  }}
                >
                  Edit mode disabled during safety processing
                  <div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
                    style={{
                      borderTopColor: "var(--color-surface-container-highest)",
                    }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="mb-4 rounded-xl border p-3 sm:p-4"
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-outline)",
        boxShadow: "var(--elevation-1)",
      }}
      role="region"
      aria-label="Contract summary"
    >
      {MobileRows}
      {DesktopRow}

      <CompanyChangeConfirm
        open={!!confirmTarget}
        currentName={company.label}
        targetName={confirmTarget?.name ?? ""}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={async () => {
          if (!confirmTarget) return;
          await changeCompany.mutateAsync({ companyId: confirmTarget.id });
          setConfirmTarget(null);
        }}
        isBusy={changeCompany.isPending}
      />

      {/* Notes Modal */}
      <NotesModal
        trackerId={trackerId}
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
      />
    </div>
  );
}
