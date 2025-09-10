"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { DashboardOnboardingItem } from "@/types/adminDashboard.types";
import type { CategoryTab } from "@/hooks/dashboard/useAdminOnboardingQueryState";
import { getOnboardingStepFlow } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";
import { EDrugTestStatus } from "@/types/drugTest.types";

import ConfirmTerminateDialog from "@/app/dashboard/components/dialogs/ConfirmTerminateDialog";
import UploadCarriersEdgeCertificateDialog from "@/app/dashboard/components/dialogs/UploadCarriersEdgeCertificateDialog";

import { useOnboardingMutations } from "@/hooks/dashboard/useOnboardingMutations";
import { useCarriersEdgeMutations } from "@/hooks/dashboard/useCarriersEdgeMutations";
import { useDashboardLoading } from "@/store/useDashboardLoading";

import CompanyBadge from "./atoms/CompanyBadge";
import CountryFlag from "./atoms/CountryFlag";
import {
  Eye,
  Trash2,
  UploadCloud,
  Send,
  FlaskConical,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

/* ---------------- helpers ---------------- */

function stepLabel(step: EStepPath | undefined) {
  if (!step) return "Unknown";
  switch (step) {
    case EStepPath.PRE_QUALIFICATIONS:
      return "Prequalifications";
    case EStepPath.APPLICATION_PAGE_1:
      return "Application — Page 1";
    case EStepPath.APPLICATION_PAGE_2:
      return "Application — Page 2";
    case EStepPath.APPLICATION_PAGE_3:
      return "Application — Page 3";
    case EStepPath.APPLICATION_PAGE_4:
      return "Application — Page 4";
    case EStepPath.APPLICATION_PAGE_5:
      return "Application — Page 5";
    case EStepPath.POLICIES_CONSENTS:
      return "Policies & Consents";
    case EStepPath.DRIVE_TEST:
      return "Drive Test";
    case EStepPath.CARRIERS_EDGE_TRAINING:
      return "Carrier's Edge";
    case EStepPath.DRUG_TEST:
      return "Drug Test";
    case EStepPath.FLATBED_TRAINING:
      return "Flatbed Training";
    default:
      return step;
  }
}

function progressPercent(item: DashboardOnboardingItem) {
  const step = item.status.currentStep;
  if (!step) return 0;
  const stepFlow = getOnboardingStepFlow({
    needsFlatbedTraining: item.needsFlatbedTraining,
  });
  const idx = stepFlow.indexOf(step);
  if (idx < 0) return 0;
  const denom = Math.max(1, stepFlow.length - 1);
  return Math.min(100, Math.max(0, Math.round((idx / denom) * 100)));
}

// Build compact pagination items: numbers + ellipsis
type PageItem = number | "dots";
function buildPaginationItems(current: number, total: number): PageItem[] {
  if (total <= 1) return [1];
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  pages.add(current);
  pages.add(Math.max(1, current - 1));
  pages.add(Math.min(total, current + 1));

  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }

  const ordered = Array.from(pages)
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const n = ordered[i];
    const prev = ordered[i - 1];
    if (i > 0 && n - (prev as number) > 1) items.push("dots");
    items.push(n);
  }
  return items;
}

/* ---------------- component ---------------- */

type Props = Readonly<{
  isLoading: boolean;
  isFetching: boolean;
  hasData: boolean;
  isDefinitelyEmpty: boolean;
  items: DashboardOnboardingItem[];
  page: number;
  totalPages: number;
  currentTab: CategoryTab;
  onPageChange: (page: number) => void;
  /** When 'terminated', actions switch to "Restore". Default is 'active'. */
  mode?: "active" | "terminated";
}>;

export default function DataGrid({
  isLoading,
  isFetching,
  hasData: _hasData, // Unused but required for type safety
  isDefinitelyEmpty,
  items,
  page,
  totalPages,
  onPageChange,
  currentTab,
  mode = "active",
}: Props) {
  /* ---------- Terminate / Restore ---------- */
  const { terminate, restore } = useOnboardingMutations();
  const [pending, setPending] = useState<null | {
    id: string;
    name?: string;
    mode: "terminate" | "restore";
  }>(null);

  const open = (action: "terminate" | "restore", id: string, name?: string) =>
    setPending({ id, name, mode: action });
  const close = () => setPending(null);

  const busyRowId = useMemo(() => pending?.id ?? null, [pending]);
  const isRowBusy = (rowId: string) =>
    (pending?.mode === "terminate" &&
      terminate.isPending &&
      busyRowId === rowId) ||
    (pending?.mode === "restore" && restore.isPending && busyRowId === rowId);

  const confirm = async (action?: "resigned" | "terminated") => {
    if (!pending) return;
    try {
      if (pending.mode === "terminate") {
        if (!action) {
          throw new Error("Termination type is required");
        }
        await terminate.mutateAsync({
          id: pending.id,
          terminationType: action,
          signal: undefined,
        });
      } else {
        // For restore, we don't need an action parameter
        await restore.mutateAsync({ id: pending.id });
      }
      close();
    } catch (err) {
      alert((err as Error)?.message ?? "Action failed");
      close();
    }
  };

  /* ---------- Carrier's Edge ---------- */
  const { uploadCertificate } = useCarriersEdgeMutations();
  const router = useRouter();

  /* ---------- Navigation with Loading ---------- */
  const { show } = useDashboardLoading();

  const navigateToContract = (trackerId: string) => {
    show("Loading application...");
    router.push(`/dashboard/contract/${trackerId}/safety-processing`);
  };

  const navigateToCarriersEdge = (trackerId: string) => {
    router.push(
      `/dashboard/contract/${trackerId}/safety-processing?highlight=carriers-edge`
    );
  };

  /* ---------- Drug test navigation ---------- */
  const navigateToDrugTest = (trackerId: string) => {
    router.push(
      `/dashboard/contract/${trackerId}/safety-processing?highlight=drug-test`
    );
  };

  const [ceUpload, setCeUpload] = useState<null | {
    id: string;
    name?: string;
  }>(null);
  const [ceUploadErr, setCeUploadErr] = useState<string | null>(null);
  const openCeUpload = (id: string, name?: string) => {
    setCeUploadErr(null);
    setCeUpload({ id, name });
  };
  const closeCeUpload = () => setCeUpload(null);
  const confirmCeUpload = async (payload: {
    certificateId: string;
    completedAt?: string;
  }) => {
    if (!ceUpload) return;
    try {
      await uploadCertificate.mutateAsync({
        trackerId: ceUpload.id,
        body: payload,
      });
      closeCeUpload();
    } catch (e) {
      setCeUploadErr((e as Error).message || "Failed to upload CE certificate");
    }
  };
  const isCEUploadBusy = (rowId: string) =>
    uploadCertificate.isPending && ceUpload?.id === rowId;

  /* ---------- Reusable action button ---------- */
  const ActionBtn = ({
    children,
    icon: Icon,
    disabled,
    href,
    onClick,
    "data-testid": testId,
  }: {
    children: string;
    icon: any;
    disabled?: boolean;
    href?: string;
    onClick?: () => void;
    "data-testid"?: string;
  }) => {
    const base =
      "inline-flex items-center gap-1 rounded-lg px-1.5 py-1 sm:gap-2 sm:px-2.5 sm:py-1.5 text-sm transition-colors disabled:opacity-50 cursor-pointer";
    const styleBtn: React.CSSProperties = {
      backgroundColor: "var(--color-card)",
      color: "var(--color-on-surface)",
      border: "1px solid var(--color-outline)",
    };
    const label = children;
    const content = (
      <>
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
        <span className="hidden sm:inline">{children}</span>
      </>
    );
    return href ? (
      <Link
        href={href}
        className={`${base} whitespace-nowrap`}
        style={styleBtn}
        aria-label={label}
        data-testid={testId}
      >
        {content}
      </Link>
    ) : (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${base} whitespace-nowrap`}
        style={styleBtn}
        aria-label={label}
        data-testid={testId}
      >
        {content}
      </button>
    );
  };

  /* ---------------- Render ---------------- */
  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden h-full"
      style={{
        backgroundColor: "var(--color-card)",
        boxShadow: "var(--elevation-1)",
        border: "1px solid var(--card-border-color)",
      }}
    >
      {/* Header with results count and pagination */}
      <div
        className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--color-outline)",
          color: "var(--color-on-surface-variant)",
        }}
      >
        <div className="text-sm font-medium" role="status" aria-live="polite">
          {isLoading
            ? "Loading…"
            : isFetching
            ? "Refreshing…"
            : `${items.length} result(s)`}
        </div>
        <div className="flex items-center justify-center gap-1.5 sm:justify-end">
          {/* Prev */}
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-on-surface)",
              border: "1px solid var(--color-outline)",
            }}
            aria-label="Previous page"
          >
            ‹
          </button>

          {/* Page numbers with ellipsis */}
          {buildPaginationItems(page, totalPages).map((item, idx) =>
            item === "dots" ? (
              <span
                key={`dots-${idx}`}
                className="px-1 text-sm select-none"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                …
              </span>
            ) : (
              <button
                key={item}
                onClick={() => onPageChange(item)}
                aria-current={item === page ? "page" : undefined}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] active:scale-95 ${
                  item === page
                    ? "text-white"
                    : "hover:bg-[var(--color-primary-container)]"
                }`}
                style={
                  item === page
                    ? { backgroundColor: "var(--color-primary)" }
                    : {
                        backgroundColor: "transparent",
                        color: "var(--color-on-surface)",
                      }
                }
              >
                {item}
              </button>
            )
          )}

          {/* Next */}
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-on-surface)",
              border: "1px solid var(--color-outline)",
            }}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>

      {/* Table (fills remaining space) */}
      <div className="relative flex-1 min-h-[400px] overflow-x-auto overflow-y-auto overscroll-auto no-scrollbar">
        <motion.table
          className="w-full border-separate border-spacing-0 text-sm table-fixed sm:table-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <colgroup>
            {mode === "terminated" ? (
              <>
                <col className="w-[30%] sm:w-[20%]" />
                <col className="w-[40%] sm:w-[30%]" />
                <col className="hidden sm:table-column sm:w-[20%]" />
                <col className="w-[15%] sm:w-[15%]" />
                <col className="w-[15%] sm:w-[15%]" />
              </>
            ) : (
              <>
                <col className="w-[30%] sm:w-[30%]" />
                <col className="w-[40%] sm:w-[40%]" />
                <col className="hidden sm:table-column sm:w-[15%]" />
                <col className="w-[30%] sm:w-[15%]" />
              </>
            )}
          </colgroup>

          <thead
            className="sticky top-0 z-30"
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-on-surface-variant)",
            }}
          >
            <tr>
              <th
                className="px-2 py-3 text-left font-medium sm:px-3 "
                style={{ borderBottom: "1px solid var(--color-outline)" }}
              >
                Driver
              </th>
              <th
                className="px-2 py-3 text-left font-medium sm:px-3"
                style={{ borderBottom: "1px solid var(--color-outline)" }}
              >
                Status / Progress
              </th>
              <th
                className="hidden px-3 py-3 text-left font-medium sm:table-cell"
                style={{ borderBottom: "1px solid var(--color-outline)" }}
              >
                Company
              </th>
              {mode === "terminated" && (
                <th
                  className="px-2 py-3 text-center font-medium sm:px-3"
                  style={{ borderBottom: "1px solid var(--color-outline)" }}
                >
                  <span className="hidden sm:inline">Termination Type</span>
                </th>
              )}
              <th
                className="px-2 py-3 text-center font-medium sm:px-3"
                style={{ borderBottom: "1px solid var(--color-outline)" }}
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            <AnimatePresence mode="wait">
              {/* Show loading spinner during initial load */}
              {isLoading && (
                <motion.tr
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <td
                    colSpan={mode === "terminated" ? 5 : 4}
                    className="px-3 py-16 text-center"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="h-10 w-10 animate-spin rounded-full border-3 border-transparent"
                        style={{
                          borderTopColor: "var(--color-primary)",
                          borderWidth: "3px",
                        }}
                      />
                      <span className="text-sm font-medium">
                        Loading records…
                      </span>
                    </div>
                  </td>
                </motion.tr>
              )}

              {/* Show "No records found" only when we're definitely empty */}
              {isDefinitelyEmpty && (
                <motion.tr
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <td
                    colSpan={mode === "terminated" ? 5 : 4}
                    className="px-3 py-10 text-center"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    No records found for this filter.
                  </td>
                </motion.tr>
              )}

              {/* Show data rows with smooth animations */}
              {!isLoading && items.length > 0 && (
                <>
                  {items.map((it, index) => {
                    const pct = progressPercent(it);
                    const step = stepLabel(it.status?.currentStep);
                    const inProgress = !it.status?.completed;

                    return (
                      <motion.tr
                        key={it._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{
                          duration: 0.3,
                          delay: index * 0.05, // Stagger animation
                          ease: "easeOut",
                        }}
                        className="align-middle transition-colors hover:bg-opacity-50"
                        style={{ backgroundColor: "var(--color-surface)" }}
                      >
                        {/* Driver */}
                        <td
                          className="px-2 py-4 sm:px-3 align-middle"
                          style={{
                            borderBottom: "1px solid var(--color-outline)",
                          }}
                        >
                          <div className="flex items-start gap-2 sm:gap-3">
                            <div className="flex-shrink-0 sm:hidden">
                              <CompanyBadge
                                companyId={it.companyId}
                                hideLabelOnMobile
                                size="xl"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              {it.itemSummary?.truckUnitNumber && (
                                <div
                                  className="truncate text-sm font-medium opacity-50"
                                  style={{ color: "var(--color-on-surface)" }}
                                >
                                  TN#: {it.itemSummary.truckUnitNumber}
                                </div>
                              )}
                              <div
                                className="truncate text-sm font-medium sm:text-base"
                                style={{ color: "var(--color-on-surface)" }}
                              >
                                {it.itemSummary?.driverName ?? "—"}
                              </div>
                              <div
                                className="mt-1 truncate text-xs"
                                style={{
                                  color: "var(--color-on-surface-variant)",
                                }}
                                title={it.itemSummary?.driverEmail || undefined}
                              >
                                {it.itemSummary?.driverEmail ?? "—"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status / Progress */}
                        <td
                          className="px-2 py-4 sm:px-3 align-middle"
                          style={{
                            borderBottom: "1px solid var(--color-outline)",
                          }}
                        >
                          {/* Mobile + Tablet */}
                          <div className="xl:hidden min-w-0">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: inProgress
                                    ? "var(--color-warning)"
                                    : "var(--color-success)",
                                }}
                                aria-hidden
                              />
                              {inProgress && (
                                <span
                                  className="min-w-0 flex-1 truncate text-xs font-medium"
                                  style={{ color: "var(--color-on-surface)" }}
                                  title={step}
                                >
                                  {step}
                                </span>
                              )}
                              <div className="relative w-10 h-10 flex-shrink-0">
                                {/* Circular progress with dots */}
                                <svg
                                  width="40"
                                  height="40"
                                  viewBox="0 0 40 40"
                                  className="transform -rotate-90"
                                >
                                  {(() => {
                                    const stepFlow = getOnboardingStepFlow({
                                      needsFlatbedTraining:
                                        it.needsFlatbedTraining,
                                    });
                                    const currentIndex = stepFlow.indexOf(
                                      it.status?.currentStep
                                    );
                                    const totalSteps = stepFlow.length;
                                    const angleStep =
                                      (2 * Math.PI) / totalSteps;

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

                                {/* Percentage in center */}
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
                            <span className="sr-only">
                              Step{" "}
                              {(() => {
                                const stepFlow = getOnboardingStepFlow({
                                  needsFlatbedTraining: it.needsFlatbedTraining,
                                });
                                return (
                                  stepFlow.indexOf(it.status?.currentStep) + 1
                                );
                              })()}{" "}
                              of{" "}
                              {(() => {
                                const stepFlow = getOnboardingStepFlow({
                                  needsFlatbedTraining: it.needsFlatbedTraining,
                                });
                                return stepFlow.length;
                              })()}
                            </span>
                          </div>

                          {/* Desktop */}
                          <div className="hidden xl:block">
                            <div className="w-full sm:max-w-xs">
                              <div className="mb-2 flex items-center gap-3 w-full">
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
                                    className="text-xs"
                                    style={{
                                      color: "var(--color-on-surface-variant)",
                                    }}
                                  >
                                    {step}
                                  </span>
                                ) : null}
                                <div className="ml-auto flex items-center">
                                  <CountryFlag
                                    companyId={it.companyId}
                                    size="md"
                                    className="opacity-60"
                                  />
                                </div>
                              </div>
                              <div
                                className="h-2 w-full overflow-hidden rounded-full"
                                style={{
                                  backgroundColor:
                                    "var(--color-outline-variant)",
                                }}
                              >
                                <div
                                  className="h-full rounded-full transition-[width] duration-300"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: "var(--color-primary)",
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Company (desktop only) */}
                        <td
                          className="hidden px-3 py-4 sm:table-cell align-middle"
                          style={{
                            borderBottom: "1px solid var(--color-outline)",
                          }}
                        >
                          <CompanyBadge companyId={it.companyId} size="xl" />
                        </td>

                        {/* Termination Type (only shown on terminated page) */}
                        {mode === "terminated" && (
                          <td
                            className="px-2 py-4 text-center sm:px-3 align-middle"
                            style={{
                              borderBottom: "1px solid var(--color-outline)",
                            }}
                          >
                            {it.terminationType === "resigned" ? (
                              <span
                                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                                style={{
                                  backgroundColor:
                                    "var(--color-warning-container)",
                                  color: "var(--color-warning-on-container)",
                                }}
                              >
                                Resigned
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                                style={{
                                  backgroundColor:
                                    "var(--color-error-container)",
                                  color: "var(--color-error-on-container)",
                                }}
                              >
                                Terminated
                              </span>
                            )}
                          </td>
                        )}

                        {/* Actions */}
                        <td
                          className="px-2 py-4 text-right sm:px-3 align-middle"
                          style={{
                            borderBottom: "1px solid var(--color-outline)",
                          }}
                        >
                          {mode === "active" ? (
                            <>
                              {currentTab === "all" && (
                                <div className="inline-flex justify-end gap-1 sm:gap-1.5 lg:gap-2">
                                  <ActionBtn
                                    icon={Eye}
                                    onClick={() => navigateToContract(it._id)}
                                  >
                                    View application
                                  </ActionBtn>
                                  <ActionBtn
                                    icon={Trash2}
                                    disabled={
                                      !!it.terminated || isRowBusy(it._id)
                                    }
                                    onClick={() =>
                                      open(
                                        "terminate",
                                        it._id,
                                        it.itemSummary?.driverName ?? undefined
                                      )
                                    }
                                  >
                                    Terminate
                                  </ActionBtn>
                                </div>
                              )}

                              {currentTab === "drive-test" && (
                                <div className="inline-flex justify-end gap-1 sm:gap-1.5 lg:gap-2">
                                  <ActionBtn
                                    icon={FlaskConical}
                                    href={`/dashboard/contract/${it._id}/appraisal/drive-test`}
                                  >
                                    Drive Test
                                  </ActionBtn>
                                </div>
                              )}

                              {currentTab === "carriers-edge-training" && (
                                <div className="inline-flex justify-end gap-1 sm:gap-1.5 lg:gap-2">
                                  {it.itemSummary?.carrierEdgeTraining
                                    ?.emailSent ? (
                                    <ActionBtn
                                      icon={UploadCloud}
                                      disabled={isCEUploadBusy(it._id)}
                                      onClick={() =>
                                        openCeUpload(
                                          it._id,
                                          it.itemSummary?.driverName ??
                                            undefined
                                        )
                                      }
                                    >
                                      Upload certificate
                                    </ActionBtn>
                                  ) : (
                                    <ActionBtn
                                      icon={Send}
                                      onClick={() =>
                                        navigateToCarriersEdge(it._id)
                                      }
                                    >
                                      Assign test
                                    </ActionBtn>
                                  )}
                                </div>
                              )}

                              {/* Actions → currentTab === "drug-test" */}
                              {currentTab === "drug-test" && (
                                <div className="inline-flex justify-end gap-1 sm:gap-1.5 lg:gap-2">
                                  {(() => {
                                    const s = it.itemSummary?.drugTest?.status;

                                    if (s === EDrugTestStatus.AWAITING_REVIEW) {
                                      // Navigate to Safety Processing (highlight Drug Test card)
                                      return (
                                        <ActionBtn
                                          icon={CheckCircle2}
                                          onClick={() =>
                                            navigateToDrugTest(it._id)
                                          }
                                        >
                                          Verify result
                                        </ActionBtn>
                                      );
                                    }

                                    if (
                                      s === EDrugTestStatus.NOT_UPLOADED ||
                                      !s
                                    ) {
                                      return (
                                        <span
                                          className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                                          style={{
                                            backgroundColor:
                                              "var(--color-outline-variant)",
                                            color:
                                              "var(--color-on-surface-variant)",
                                          }}
                                        >
                                          Pending upload
                                        </span>
                                      );
                                    }

                                    if (s === EDrugTestStatus.APPROVED) {
                                      return (
                                        <span
                                          className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                                          style={{
                                            backgroundColor:
                                              "var(--color-success-container)",
                                            color:
                                              "var(--color-success-on-container)",
                                          }}
                                        >
                                          Verified
                                        </span>
                                      );
                                    }

                                    if (s === EDrugTestStatus.REJECTED) {
                                      return (
                                        <span
                                          className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                                          style={{
                                            backgroundColor:
                                              "var(--color-error-container)",
                                            color:
                                              "var(--color-error-on-container)",
                                          }}
                                        >
                                          Rejected
                                        </span>
                                      );
                                    }

                                    return null;
                                  })()}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="inline-flex justify-end gap-1 sm:gap-1.5 lg:gap-2">
                              <ActionBtn
                                icon={Eye}
                                href={`/dashboard/contract/${it._id}`}
                              >
                                View application
                              </ActionBtn>
                              <ActionBtn
                                icon={RotateCcw}
                                disabled={isRowBusy(it._id)}
                                onClick={() =>
                                  open(
                                    "restore",
                                    it._id,
                                    it.itemSummary?.driverName ?? undefined
                                  )
                                }
                              >
                                Restore
                              </ActionBtn>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </>
              )}
            </AnimatePresence>
          </tbody>
        </motion.table>
      </div>

      {/* Dialogs */}
      <ConfirmTerminateDialog
        open={!!pending}
        mode={pending?.mode ?? "terminate"}
        driverName={pending?.name}
        onCancel={close}
        onConfirm={confirm}
        isBusy={
          pending?.mode === "terminate"
            ? terminate.isPending
            : restore.isPending
        }
      />

      <UploadCarriersEdgeCertificateDialog
        open={!!ceUpload}
        driverName={ceUpload?.name}
        onCancel={closeCeUpload}
        onConfirm={confirmCeUpload}
        isBusy={uploadCertificate.isPending}
        errorText={ceUploadErr}
      />
    </div>
  );
}
