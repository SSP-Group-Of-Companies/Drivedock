"use client";

/**
 * AuditLogsSearchClient
 * ---------------------
 * Global admin search across every onboarding event (including events for
 * onboardings that have since been permanently deleted).
 *
 * UX goals (matches dashboard/home patterns):
 *  - Compact toolbar: single search box, filter dropdown, sort dropdown.
 *  - Search runs automatically on input change (debounced); no separate button.
 *  - Filters: multi-select company, multi-select action, date range.
 *  - Sort: newest / oldest first.
 *  - Each result card is compact by default. Snapshot + metadata are tucked
 *    behind "View details" so the list isn't visually cluttered.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import DashboardContentWrapper from "@/components/dashboard/DashboardContentWrapper";
import CosmeticScrollArea from "@/components/shared/CosmeticScrollArea";
import { COMPANY_OPTIONS } from "@/constants/dashboard/filters";
import {
  AUDIT_LOG_ACTION_OPTIONS,
  getAuditLogActionLabel,
} from "@/constants/dashboard/auditLogActions";
import {
  type TOnboardingAuditActor,
  type TOnboardingAuditLogDTO,
} from "@/types/onboardingAuditLog.types";

import AuditLogsToolbar, { type AuditSortToken } from "./AuditLogsToolbar";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 350;

type AuditLogsApiData = {
  items: TOnboardingAuditLogDTO[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type AuditLogsApiResponse = {
  success: boolean;
  message?: string;
  data: AuditLogsApiData;
};

function formatActorLine(actor: TOnboardingAuditActor): string {
  const role = actor.type
    ? actor.type.charAt(0) + actor.type.slice(1).toLowerCase()
    : "";
  return [actor.name, role, actor.email].filter(Boolean).join(" · ");
}

/**
 * Rebuild the full audit log document for display so admins can see the
 * entire stored record in one place (id, snapshot fields, metadata,
 * timestamps). This is the value rendered inside the "View details" panel.
 */
function buildAuditLogDocument(
  entry: TOnboardingAuditLogDTO,
): Record<string, unknown> {
  const doc: Record<string, unknown> = {
    _id: entry.id,
    onboardingId: entry.onboardingId,
    action: entry.action,
    actor: entry.actor,
    message: entry.message,
  };
  if (entry.driverName !== undefined) doc.driverName = entry.driverName;
  if (entry.driverEmail !== undefined) doc.driverEmail = entry.driverEmail;
  if (entry.companyId !== undefined) doc.companyId = entry.companyId;
  if (entry.companyName !== undefined) doc.companyName = entry.companyName;
  doc.metadata = entry.metadata ?? {};
  doc.createdAt = entry.createdAt;
  return doc;
}

export default function AuditLogsSearchClient() {
  const { isVisible: isDashboardLoaderVisible } = useDashboardLoading();
  const [shouldRender, setShouldRender] = useState(false);

  // Search (debounced)
  const [searchInput, setSearchInput] = useState("");
  const [appliedQ, setAppliedQ] = useState("");

  // Filters
  const [companyIds, setCompanyIds] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Sort + pagination
  const [sort, setSort] = useState<AuditSortToken>("createdAt:desc");
  const [page, setPage] = useState(1);

  // Data
  const [data, setData] = useState<AuditLogsApiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Gate render on dashboard loader
  useEffect(() => {
    if (!isDashboardLoaderVisible) {
      const t = setTimeout(() => setShouldRender(true), 150);
      return () => clearTimeout(t);
    }
    setShouldRender(false);
  }, [isDashboardLoaderVisible]);

  // Debounce search input -> applied query.
  useEffect(() => {
    if (searchInput === appliedQ) return;
    const t = setTimeout(() => {
      setAppliedQ(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput, appliedQ]);

  // Reset to first page whenever filter/sort inputs change.
  useEffect(() => {
    setPage(1);
  }, [companyIds, actions, dateFrom, dateTo, sort]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const p = new URLSearchParams();
      p.set("page", String(page));
      p.set("pageSize", String(PAGE_SIZE));
      if (appliedQ.trim()) p.set("q", appliedQ.trim());
      for (const id of companyIds) p.append("companyId", id);
      for (const a of actions) p.append("action", a);
      if (dateFrom) p.set("dateFrom", dateFrom);
      if (dateTo) p.set("dateTo", dateTo);
      p.set("sort", sort === "createdAt:asc" ? "asc" : "desc");

      const res = await fetch(`/api/v1/admin/audit-logs?${p.toString()}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || `Request failed (${res.status})`);
      }
      const json: AuditLogsApiResponse = await res.json();
      setData(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, appliedQ, companyIds, actions, dateFrom, dateTo, sort]);

  useEffect(() => {
    if (shouldRender) {
      void fetchLogs();
    }
  }, [shouldRender, fetchLogs]);

  const totalPages = data?.totalPages ?? 0;
  const canPrev = page > 1;
  const canNext = totalPages > 0 && page < totalPages;

  const clearAllFilters = () => {
    setSearchInput("");
    setAppliedQ("");
    setCompanyIds([]);
    setActions([]);
    setDateFrom("");
    setDateTo("");
    setSort("createdAt:desc");
    setPage(1);
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resultsLabel = useMemo(() => {
    if (!data) return "—";
    if (data.totalCount === 1) return "1 result";
    return `${data.totalCount} results`;
  }, [data]);

  if (isDashboardLoaderVisible || !shouldRender) {
    return null;
  }

  return (
    <DashboardContentWrapper>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--color-on-surface)" }}
          >
            Audit logs
          </h1>
          <p
            className="mt-1 max-w-2xl text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Search the full audit log history across all onboardings. Logs
            remain searchable even after an onboarding has been permanently
            deleted.
          </p>
        </div>
      </div>

      <AuditLogsToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        companyOptions={COMPANY_OPTIONS}
        selectedCompanyIds={companyIds}
        onCompanyChange={setCompanyIds}
        actionOptions={AUDIT_LOG_ACTION_OPTIONS}
        selectedActions={actions}
        onActionChange={setActions}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateRangeChange={(f, t) => {
          setDateFrom(f);
          setDateTo(t);
        }}
        sort={sort}
        onSortChange={setSort}
        onClearAll={clearAllFilters}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className="text-sm"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {loading && !data ? "Loading…" : resultsLabel}
        </span>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-lg border px-1 py-0.5"
            style={{ borderColor: "var(--color-outline)" }}
          >
            <button
              type="button"
              aria-label="Previous page"
              disabled={!canPrev || loading}
              onClick={() => canPrev && setPage((p) => Math.max(1, p - 1))}
              className="rounded-md p-1.5 transition-colors disabled:opacity-40 hover:bg-[var(--color-sidebar-hover)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span
              className="min-w-[2rem] text-center text-sm tabular-nums"
              style={{ color: "var(--color-on-surface)" }}
            >
              {loading ? "…" : page}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={!canNext || loading}
              onClick={() => canNext && setPage((p) => p + 1)}
              className="rounded-md p-1.5 transition-colors disabled:opacity-40 hover:bg-[var(--color-sidebar-hover)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => void fetchLogs()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 hover:bg-[var(--color-sidebar-hover)]"
            style={{
              borderColor: "var(--color-outline)",
              color: "var(--color-on-surface)",
            }}
            aria-label="Refresh audit logs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {data && !error ? (
        <div className="space-y-3">
          {data.items.length === 0 ? (
            <div
              className="rounded-xl border p-8 text-center text-sm"
              style={{
                borderColor: "var(--color-outline)",
                background: "var(--color-card)",
                color: "var(--color-on-surface-variant)",
              }}
            >
              No matching audit events.
            </div>
          ) : (
            data.items.map((entry) => (
              <AuditLogCard
                key={entry.id}
                entry={entry}
                isOpen={!!expanded[entry.id]}
                onToggle={() => toggleExpanded(entry.id)}
              />
            ))
          )}
        </div>
      ) : null}
    </DashboardContentWrapper>
  );
}

/* ------------------------------------------------------------------------ */
/* AuditLogCard                                                              */
/* ------------------------------------------------------------------------ */

type CardProps = Readonly<{
  entry: TOnboardingAuditLogDTO;
  isOpen: boolean;
  onToggle: () => void;
}>;

function AuditLogCard({ entry, isOpen, onToggle }: CardProps) {
  return (
    <article
      className="rounded-xl border p-4 sm:p-5 shadow-sm dark:shadow-none"
      style={{
        borderColor: "var(--color-outline)",
        background: "var(--color-card)",
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="font-semibold tracking-wide"
              style={{ color: "var(--color-on-surface)" }}
            >
              {getAuditLogActionLabel(entry.action)}
            </span>
            {entry.onboardingExists ? (
              <Link
                href={`/dashboard/contract/${entry.onboardingId}/audit-logs`}
                className="rounded-md border px-2 py-0.5 font-mono text-xs font-medium hover:opacity-90"
                style={{
                  borderColor: "var(--color-outline)",
                  color: "var(--color-primary)",
                }}
                title="Open this onboarding's audit log"
              >
                {entry.onboardingId}
              </Link>
            ) : (
              <span
                className="rounded-md border px-2 py-0.5 font-mono text-xs font-medium"
                style={{
                  borderColor: "var(--color-outline)",
                  color: "var(--color-on-surface-variant)",
                  background: "var(--color-surface-variant)",
                }}
                title="Onboarding no longer exists"
              >
                {entry.onboardingId}
              </span>
            )}
          </div>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--color-on-surface)" }}
          >
            {entry.message}
          </p>
          <p
            className="text-xs sm:text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Actor: {formatActorLine(entry.actor)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
          <time
            className="text-xs sm:text-sm tabular-nums"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {new Date(entry.createdAt).toLocaleString()}
          </time>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            className="text-xs font-medium underline-offset-2 hover:underline"
            style={{ color: "var(--color-primary)" }}
          >
            {isOpen ? "Hide details" : "View details"}
          </button>
        </div>
      </div>

      {isOpen ? (
        <CosmeticScrollArea
          className="mt-3 max-h-96 overflow-hidden rounded-md"
          style={{
            background: "var(--color-code-block)",
            color: "var(--color-on-surface)",
          }}
          viewportClassName="max-h-96 p-3 pr-1 font-mono text-[11px] leading-relaxed"
        >
          <pre className="m-0 whitespace-pre">
            {JSON.stringify(buildAuditLogDocument(entry), null, 2)}
          </pre>
        </CosmeticScrollArea>
      ) : null}
    </article>
  );
}
