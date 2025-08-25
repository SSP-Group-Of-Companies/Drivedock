"use client";

import { useMemo, useState } from "react";
import type { DashboardOnboardingItem } from "@/types/adminDashboard.types";
import type { CategoryTab } from "@/hooks/dashboard/useAdminOnboardingQueryState";
import { onboardingStepFlow } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";

import ConfirmTerminateDialog from "@/app/dashboard/components/dialogs/ConfirmTerminateDialog";
import VerifyDrugTestDialog from "@/app/dashboard/components/dialogs/VerifyDrugTestDialog";
import AssignCarriersEdgeDialog from "@/app/dashboard/components/dialogs/AssignCarriersEdgeDialog";
import UploadCarriersEdgeCertificateDialog from "@/app/dashboard/components/dialogs/UploadCarriersEdgeCertificateDialog";

import { useOnboardingMutations } from "@/hooks/dashboard/useOnboardingMutations";
import { useDrugTestMutations } from "@/hooks/dashboard/useDrugTestMutations";
import { useCarriersEdgeMutations } from "@/hooks/dashboard/useCarriersEdgeMutations";

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
    case "prequalifications":
      return "Prequalifications";
    case "application-form/page-1":
      return "Application — Page 1";
    case "application-form/page-2":
      return "Application — Page 2";
    case "application-form/page-3":
      return "Application — Page 3";
    case "application-form/page-4":
      return "Application — Page 4";
    case "application-form/page-5":
      return "Application — Page 5";
    case "policies-consents":
      return "Policies & Consents";
    case "drive-test":
      return "Drive Test";
    case "carriers-edge-training":
      return "Carrier's Edge";
    case "drug-test":
      return "Drug Test";
    case "flat-bed-training":
      return "Flatbed Training";
    default:
      return step;
  }
}

function progressPercent(step: EStepPath | undefined) {
  if (!step) return 0;
  const idx = onboardingStepFlow.indexOf(step);
  if (idx < 0) return 0;
  const denom = Math.max(1, onboardingStepFlow.length - 1);
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

  // Expand near the start/end for better feel
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

  const confirm = async () => {
    if (!pending) return;
    try {
      if (pending.mode === "terminate")
        await terminate.mutateAsync({ id: pending.id });
      else await restore.mutateAsync({ id: pending.id });
      close();
    } catch (err) {
      alert((err as Error)?.message ?? "Action failed");
      close();
    }
  };

  /* ---------- Drug Test Verify ---------- */
  const { verify } = useDrugTestMutations();
  const [dtPending, setDtPending] = useState<null | {
    id: string;
    name?: string;
  }>(null);
  const [dtError, setDtError] = useState<string | null>(null);
  const openVerify = (id: string, name?: string) => {
    setDtError(null);
    setDtPending({ id, name });
  };
  const closeVerify = () => setDtPending(null);
  const confirmVerify = async (opts: {
    result: "pass" | "fail";
    notes?: string;
  }) => {
    if (!dtPending) return;
    try {
      await verify.mutateAsync({ trackerId: dtPending.id, body: opts });
      closeVerify();
    } catch (e) {
      setDtError((e as Error).message || "Verification failed");
    }
  };
  const isDTBusy = (rowId: string) =>
    verify.isPending && dtPending?.id === rowId;

  /* ---------- Carrier's Edge ---------- */
  const { assign, uploadCertificate } = useCarriersEdgeMutations();

  const [ceAssign, setCeAssign] = useState<null | {
    id: string;
    name?: string;
  }>(null);
  const [ceAssignErr, setCeAssignErr] = useState<string | null>(null);
  const openCeAssign = (id: string, name?: string) => {
    setCeAssignErr(null);
    setCeAssign({ id, name });
  };
  const closeCeAssign = () => setCeAssign(null);
  const confirmCeAssign = async () => {
    if (!ceAssign) return;
    try {
      await assign.mutateAsync({ trackerId: ceAssign.id });
      closeCeAssign();
    } catch (e) {
      setCeAssignErr((e as Error).message || "Failed to assign CE test");
    }
  };
  const isCEAssignBusy = (rowId: string) =>
    assign.isPending && ceAssign?.id === rowId;

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
      "inline-flex items-center gap-1.5 sm:gap-2 rounded-lg px-2 py-1.5 sm:px-2.5 text-sm transition-colors disabled:opacity-50";
    const styleBtn: React.CSSProperties = {
      backgroundColor: "var(--color-card)",
      color: "var(--color-on-surface)",
      border: "1px solid var(--color-outline)",
    };
    const label = children;
    const content = (
      <>
        <Icon className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{children}</span>
      </>
    );
    return href ? (
      <a
        href={href}
        className={`${base} whitespace-nowrap`}
        style={styleBtn}
        aria-label={label}
        data-testid={testId}
      >
        {content}
      </a>
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
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--color-card)",
        boxShadow: "var(--elevation-1)",
        border: "1px solid var(--card-border-color)",
      }}
    >
      {/* Header with results count and pagination */}
      <div
        className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0"
        style={{
          borderBottom: "1px solid var(--color-outline)",
          color: "var(--color-on-surface-variant)",
        }}
      >
        <div className="text-sm font-medium" role="status" aria-live="polite">
          {isFetching
            ? "Refreshing…"
            : isLoading
            ? "Loading…"
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

      {/* Table (responsive scrolling) */}
      <div
        className="relative -mx-2 overflow-x-auto overflow-y-auto overscroll-auto no-scrollbar sm:mx-0"
        style={{ maxHeight: "60vh" }}
      >
        {/* Fixed layout on mobile; auto on desktop */}
        <table className="w-full border-separate border-spacing-0 text-sm table-fixed sm:table-auto">
          {/* Mobile column widths so "All" never collapses actions */}
          <colgroup>
            <col className="w-[46%] sm:w-auto" />
            <col className="w-[34%] sm:w-auto" />
            <col className="hidden sm:table-column" />
            <col className="w-[20%] sm:w-auto" />
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
              <th
                className="px-2 py-3 text-center font-medium sm:px-3"
                style={{ borderBottom: "1px solid var(--color-outline)" }}
              >
                <span className="hidden sm:inline">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {isLoading && items.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-10 text-center"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
                      style={{ borderTopColor: "var(--color-primary)" }}
                    />
                    <span>Loading records…</span>
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && items.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-10 text-center"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  No records found for this filter.
                </td>
              </tr>
            )}

            {items.map((it) => {
              const pct = progressPercent(it.status?.currentStep);
              const step = stepLabel(it.status?.currentStep);
              const inProgress = !it.status?.completed;

              return (
                <tr
                  key={it._id}
                  className="align-middle transition-colors hover:bg-opacity-50"
                  style={{ backgroundColor: "var(--color-surface)" }}
                >
                  {/* Driver */}
                  <td
                    className="px-2 py-4 sm:px-3 align-middle"
                    style={{ borderBottom: "1px solid var(--color-outline)" }}
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
                        <div
                          className="truncate text-sm font-medium sm:text-base"
                          style={{ color: "var(--color-on-surface)" }}
                        >
                          {it.itemSummary?.driverName ?? "—"}
                        </div>
                        <div
                          className="mt-1 truncate text-xs"
                          style={{ color: "var(--color-on-surface-variant)" }}
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
                    style={{ borderBottom: "1px solid var(--color-outline)" }}
                  >
                    {/* Mobile */}
                    <div className="sm:hidden min-w-0">
                      <div className="mb-2">
                        <div
                          className="h-4 w-4 sm:h-2.5 sm:w-2.5 rounded-full"
                          style={{
                            backgroundColor: inProgress
                              ? "var(--color-warning)"
                              : "var(--color-success)",
                          }}
                          aria-hidden
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="min-w-0 flex-1 truncate text-xs"
                          style={{ color: "var(--color-on-surface-variant)" }}
                          title={step}
                        >
                          {step}
                        </span>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          className="flex-shrink-0"
                          aria-hidden
                        >
                          <circle
                            cx="8"
                            cy="8"
                            r="6"
                            stroke="var(--color-outline-variant)"
                            strokeWidth="2"
                            fill="none"
                          />
                          <circle
                            cx="8"
                            cy="8"
                            r="6"
                            stroke="var(--color-primary)"
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray={2 * Math.PI * 6}
                            strokeDashoffset={2 * Math.PI * 6 * (1 - pct / 100)}
                            strokeLinecap="round"
                            transform="rotate(-90 8 8)"
                          />
                        </svg>
                        <span className="sr-only">{pct}% complete</span>
                      </div>
                    </div>

                    {/* Desktop */}
                    <div className="hidden sm:block">
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
                          <span
                            className="text-xs"
                            style={{ color: "var(--color-on-surface-variant)" }}
                          >
                            {step}
                          </span>
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
                            backgroundColor: "var(--color-outline-variant)",
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
                    style={{ borderBottom: "1px solid var(--color-outline)" }}
                  >
                    <CompanyBadge companyId={it.companyId} size="xl" />
                  </td>

                  {/* Actions */}
                  <td
                    className="px-2 py-4 text-right sm:px-3 align-middle"
                    style={{ borderBottom: "1px solid var(--color-outline)" }}
                  >
                    {mode === "active" ? (
                      <>
                        {currentTab === "all" && (
                          <div className="inline-flex flex-wrap justify-end gap-1 sm:flex-nowrap sm:gap-1.5 lg:gap-2">
                            <ActionBtn
                              icon={Eye}
                              href={`/dashboard/contract/${it._id}`}
                            >
                              View application
                            </ActionBtn>
                            <ActionBtn
                              icon={Trash2}
                              disabled={!!it.terminated || isRowBusy(it._id)}
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
                          <div className="inline-flex flex-wrap justify-end gap-1 sm:flex-nowrap sm:gap-1.5 lg:gap-2">
                            <ActionBtn
                              icon={FlaskConical}
                              href={`/dashboard/contract/${it._id}/drive-test/appraisal`}
                            >
                              Drive Test
                            </ActionBtn>
                          </div>
                        )}

                        {currentTab === "carriers-edge-training" && (
                          <div className="inline-flex flex-wrap justify-end gap-1 sm:flex-nowrap sm:gap-1.5 lg:gap-2">
                            {it.itemSummary?.carrierEdgeTraining?.emailSent ? (
                              <ActionBtn
                                icon={UploadCloud}
                                disabled={isCEUploadBusy(it._id)}
                                onClick={() =>
                                  openCeUpload(
                                    it._id,
                                    it.itemSummary?.driverName ?? undefined
                                  )
                                }
                              >
                                Upload certificate
                              </ActionBtn>
                            ) : (
                              <ActionBtn
                                icon={Send}
                                disabled={isCEAssignBusy(it._id)}
                                onClick={() =>
                                  openCeAssign(
                                    it._id,
                                    it.itemSummary?.driverName ?? undefined
                                  )
                                }
                              >
                                Assign test
                              </ActionBtn>
                            )}
                          </div>
                        )}

                        {currentTab === "drug-test" && (
                          <div className="inline-flex flex-wrap justify-end gap-1 sm:flex-nowrap sm:gap-1.5 lg:gap-2">
                            {it.itemSummary?.drugTest?.documentsUploaded ? (
                              <ActionBtn
                                icon={CheckCircle2}
                                disabled={isDTBusy(it._id)}
                                onClick={() =>
                                  openVerify(
                                    it._id,
                                    it.itemSummary?.driverName ?? undefined
                                  )
                                }
                              >
                                Verify result
                              </ActionBtn>
                            ) : (
                              <span
                                className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                                style={{
                                  backgroundColor:
                                    "var(--color-outline-variant)",
                                  color: "var(--color-on-surface-variant)",
                                }}
                              >
                                Pending upload
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="inline-flex flex-wrap justify-end gap-1 sm:flex-nowrap sm:gap-1.5 lg:gap-2">
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
                </tr>
              );
            })}
          </tbody>
        </table>
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
      <VerifyDrugTestDialog
        open={!!dtPending}
        driverName={dtPending?.name}
        onCancel={closeVerify}
        onConfirm={confirmVerify}
        isBusy={verify.isPending}
        errorText={dtError}
      />
      <AssignCarriersEdgeDialog
        open={!!ceAssign}
        driverName={ceAssign?.name}
        onCancel={closeCeAssign}
        onConfirm={confirmCeAssign}
        isBusy={assign.isPending}
        errorText={ceAssignErr}
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
