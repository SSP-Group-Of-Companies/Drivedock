"use client";

/**
 * Contract-scoped audit log viewer.
 * - Read-only list of events for a single onboarding tracker.
 * - Compact cards: snapshot + metadata are tucked under "View details" so the
 *   list doesn't feel cluttered. Mirrors the global audit logs page UX.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import CosmeticScrollArea from "@/components/shared/CosmeticScrollArea";
import { getAuditLogActionLabel } from "@/constants/dashboard/auditLogActions";
import type {
  TOnboardingAuditActor,
  TOnboardingAuditLogDTO,
} from "@/types/onboardingAuditLog.types";

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

const PAGE_SIZE = 25;

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

export default function AuditLogsClient() {
  const { id: trackerId } = useParams<{ id: string }>();
  const { isVisible: isDashboardLoaderVisible } = useDashboardLoading();
  const [shouldRender, setShouldRender] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AuditLogsApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isDashboardLoaderVisible) {
      const t = setTimeout(() => setShouldRender(true), 150);
      return () => clearTimeout(t);
    }
    setShouldRender(false);
  }, [isDashboardLoaderVisible]);

  const fetchLogs = useCallback(async () => {
    if (!trackerId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/v1/admin/onboarding/${trackerId}/audit-logs?page=${page}&pageSize=${PAGE_SIZE}`,
        { headers: { Accept: "application/json" } },
      );
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
  }, [trackerId, page]);

  useEffect(() => {
    if (trackerId && shouldRender) {
      void fetchLogs();
    }
  }, [trackerId, shouldRender, fetchLogs]);

  const totalPages = data?.totalPages ?? 0;
  const canPrev = page > 1;
  const canNext = totalPages > 0 && page < totalPages;

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isDashboardLoaderVisible || !shouldRender) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--color-on-surface)" }}
          >
            Audit logs
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Read-only list of events for this onboarding.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <span
            className="text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {data ? `${data.totalCount} event(s)` : "—"}
          </span>
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
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div
          className="rounded-xl border p-8 text-center"
          style={{
            borderColor: "var(--color-outline)",
            background: "var(--color-card)",
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-transparent"
              style={{
                borderTopColor: "var(--color-primary)",
                borderWidth: "2px",
              }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Loading audit logs…
            </span>
          </div>
        </div>
      ) : null}

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
              No audit events yet.
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
    </div>
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
          <div
            className="font-semibold tracking-wide"
            style={{ color: "var(--color-on-surface)" }}
          >
            {getAuditLogActionLabel(entry.action)}
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
          viewportClassName="max-h-96 p-3 pr-3 font-mono text-[11px] leading-relaxed"
        >
          <pre className="m-0 whitespace-pre">
            {JSON.stringify(buildAuditLogDocument(entry), null, 2)}
          </pre>
        </CosmeticScrollArea>
      ) : null}
    </article>
  );
}
