"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import {
  resolveCompanyMeta,
  flagSrcFor,
  listCompaniesByCountry,
} from "@/constants/dashboard/companies";
import { getOnboardingStepFlow } from "@/lib/utils/onboardingUtils";
import type { EStepPath } from "@/types/onboardingTracker.types";
import { ECountryCode } from "@/types/shared.types";
import { ChevronDown, Bell, Building2 } from "lucide-react";
import Image from "next/image";

import NotificationsMenu, { computeNotifications } from "./NotificationsMenu";
import CompanyChangeConfirm from "./CompanyChangeConfirm";

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
  const { data, isLoading, isError, error, changeCompany } =
    useContract(trackerId);

  const [confirmTarget, setConfirmTarget] = useState<null | {
    id: string;
    name: string;
  }>(null);

  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Refs for click-outside
  const companyMenuRef = useRef<HTMLDivElement | null>(null);
  const notifMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (companyMenuOpen && companyMenuRef.current && target) {
        if (!companyMenuRef.current.contains(target)) setCompanyMenuOpen(false);
      }
      if (notifOpen && notifMenuRef.current && target) {
        if (!notifMenuRef.current.contains(target)) setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, [companyMenuOpen, notifOpen]);

  const company = useMemo(
    () => resolveCompanyMeta(data?.companyId),
    [data?.companyId]
  );

  const driverName = data?.itemSummary?.driverName || "—";
  const driverEmail = data?.itemSummary?.driverEmail || "—";

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

  // Build switchable companies by current country
  const switchableCompanies = useMemo(() => {
    const cc = company.countryCode ?? ECountryCode.CA;
    return listCompaniesByCountry(cc);
  }, [company.countryCode]);

  const canEditCompany = company.countryCode === ECountryCode.CA;

  // Notification count ribbon
  const notifCount = useMemo(
    () => computeNotifications(data ?? null).length,
    [data]
  );

  // Loading
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

  // Error
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

  /* ---------- Small screens layout (two rows) ---------- */
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
          <span
            className="min-w-0 truncate text-xs font-medium"
            style={{ color: "var(--color-on-surface)" }}
            title={stepLabel(step)}
          >
            {stepLabel(step)}
          </span>

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

        {/* Right chunk: company + notifications */}
        <div className="flex items-center gap-2">
          {/* Company dropdown */}
          <div className="relative" ref={companyMenuRef}>
            <button
              type="button"
              onClick={() => setCompanyMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
              }}
              aria-haspopup="menu"
              aria-expanded={companyMenuOpen}
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

            {companyMenuOpen && (
              <div
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
                          disabled={disabled}
                          onClick={() => {
                            setCompanyMenuOpen(false);
                            if (!active && canEditCompany) {
                              setConfirmTarget({ id: c.id, name: c.name });
                            }
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
                          <span className="flex-1">{c.name}</span>
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
          <div className="relative" ref={notifMenuRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
              }}
              aria-haspopup="menu"
              aria-expanded={notifOpen}
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

            {notifOpen && (
              <NotificationsMenu
                onClose={() => setNotifOpen(false)}
                context={data ?? null}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  /* ---------- Desktop layout (grid for proper middle spacing) ---------- */
  const DesktopRow = (
    <div
      className="
        hidden xl:grid
        xl:grid-cols-[minmax(0,1fr)_minmax(320px,42%)_auto]
        xl:items-center xl:gap-4
      "
    >
      {/* Left */}
      <div className="min-w-0 flex items-start gap-3">
        <div className="relative h-12 w-12 overflow-hidden rounded">
          <Image
            src={company.logoSrc}
            alt={`${company.label} logo`}
            fill
            className="object-contain"
            sizes="48px"
          />
        </div>
        <div className="min-w-0">
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

      {/* Middle (width controlled by the grid column) */}
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
          <span
            className="text-xs"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {stepLabel(step)}
          </span>
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
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${pct}%`, background: "var(--color-primary)" }}
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center justify-end gap-2">
        {/* Company dropdown */}
        <div className="relative" ref={companyMenuRef}>
          <button
            type="button"
            onClick={() => setCompanyMenuOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-outline)",
            }}
            aria-haspopup="menu"
            aria-expanded={companyMenuOpen}
          >
            <Building2 className="h-4 w-4" />
            <span>Company:</span>
            <span className="font-medium">{company.label}</span>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </button>

          {companyMenuOpen && (
            <div
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
                        disabled={disabled}
                        onClick={() => {
                          setCompanyMenuOpen(false);
                          if (!active && canEditCompany) {
                            setConfirmTarget({ id: c.id, name: c.name });
                          }
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
                        <span className="flex-1">{c.name}</span>
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
            onClick={() => setNotifOpen((v) => !v)}
            className="relative inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-outline)",
            }}
            aria-haspopup="menu"
            aria-expanded={notifOpen}
          >
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
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

          {notifOpen && (
            <NotificationsMenu
              onClose={() => setNotifOpen(false)}
              context={data ?? null}
            />
          )}
        </div>
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
      {/* Mobile/Tablet two-row layout */}
      {MobileRows}

      {/* Desktop single-row layout (grid) */}
      {DesktopRow}

      {/* Confirm change-company */}
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
    </div>
  );
}
