// invitations/components/InvitationsDataGrid.tsx
"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { DashboardInvitationItem } from "@/types/adminDashboard.types";
import CountryFlag from "@/app/dashboard/components/table/atoms/CountryFlag";
import CompanyBadge from "@/app/dashboard/components/table/atoms/CompanyBadge";
import { Eye } from "lucide-react";

/* -------- shared helpers (copied from DataGrid for visual parity) -------- */

type PageItem = number | "dots";
function buildPaginationItems(current: number, total: number): PageItem[] {
  if (total <= 1) return [1];
  const pages = new Set<number>([1, total, current, Math.max(1, current - 1), Math.min(total, current + 1)]);
  if (current <= 3) [2, 3, 4].forEach((n) => pages.add(n));
  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((n) => pages.add(n));
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

/* -------------------------------- component ------------------------------- */

type Props = Readonly<{
  isLoading: boolean;
  isFetching: boolean;
  hasData: boolean;
  isDefinitelyEmpty: boolean;
  items: DashboardInvitationItem[];
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}>;

export default function InvitationsDataGrid({ isLoading, isFetching, isDefinitelyEmpty, items, page, totalPages, onPageChange }: Props) {
  const pages = useMemo(() => buildPaginationItems(page, totalPages), [page, totalPages]);

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden h-full"
      style={{
        backgroundColor: "var(--color-card)",
        boxShadow: "var(--elevation-1)",
        border: "1px solid var(--card-border-color)",
      }}
    >
      {/* Header with results + pagination (identical styling) */}
      <div
        className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0 flex-shrink-0"
        style={{
          borderBottom: "1px solid var(--color-outline)",
          color: "var(--color-on-surface-variant)",
        }}
      >
        <div className="text-sm font-medium" role="status" aria-live="polite">
          {isLoading ? "Loading…" : isFetching ? "Refreshing…" : `${items.length} result(s)`}
        </div>

        {/* Pagination controls (top-right) */}
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

          {/* Numbers + dots */}
          {pages.map((it, idx) =>
            it === "dots" ? (
              <span key={`dots-${idx}`} className="px-1 text-sm select-none" style={{ color: "var(--color-on-surface-variant)" }}>
                …
              </span>
            ) : (
              <button
                key={it}
                onClick={() => onPageChange(it)}
                aria-current={it === page ? "page" : undefined}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] active:scale-95 ${
                  it === page ? "text-white" : "hover:bg-[var(--color-primary-container)]"
                }`}
                style={it === page ? { backgroundColor: "var(--color-primary)" } : { backgroundColor: "transparent", color: "var(--color-on-surface)" }}
              >
                {it}
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

      {/* Table */}
      <div className="relative flex-1 min-h-[400px] overflow-x-auto overflow-y-auto overscroll-auto no-scrollbar">
        <motion.table
          className="w-full border-separate border-spacing-0 text-sm table-fixed sm:table-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <colgroup>
            <col className="w-[30%] sm:w-[30%]" />
            <col className="w-[35%] sm:w-[35%]" />
            <col className="hidden sm:table-column sm:w-[20%]" />
            <col className="w-[15%] sm:w-[15%]" />
          </colgroup>

          <thead
            className="sticky top-0 z-30"
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-on-surface-variant)",
            }}
          >
            <tr>
              <th className="px-2 py-3 text-left font-medium sm:px-3" style={{ borderBottom: "1px solid var(--color-outline)" }}>
                Driver
              </th>
              <th className="px-2 py-3 text-left font-medium sm:px-3" style={{ borderBottom: "1px solid var(--color-outline)" }}>
                Contact
              </th>
              <th className="hidden px-3 py-3 text-left font-medium sm:table-cell" style={{ borderBottom: "1px solid var(--color-outline)" }}>
                Company
              </th>
              <th className="px-2 py-3 text-center font-medium sm:px-3" style={{ borderBottom: "1px solid var(--color-outline)" }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            <AnimatePresence mode="wait">
              {/* Loading row */}
              {isLoading && (
                <motion.tr key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <td colSpan={4} className="px-3 py-16 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 animate-spin rounded-full border-3 border-transparent" style={{ borderTopColor: "var(--color-primary)", borderWidth: "3px" }} />
                      <span className="text-sm font-medium">Loading records…</span>
                    </div>
                  </td>
                </motion.tr>
              )}

              {/* Empty state */}
              {isDefinitelyEmpty && !isLoading && (
                <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <td colSpan={4} className="px-3 py-10 text-center" style={{ color: "var(--color-on-surface-variant)" }}>
                    No invitations found for this filter.
                  </td>
                </motion.tr>
              )}

              {/* Rows */}
              {!isLoading &&
                items.map((it, index) => (
                  <motion.tr
                    key={it._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.25, delay: index * 0.05, ease: "easeOut" }}
                    className="align-middle transition-colors"
                    style={{ backgroundColor: "var(--color-surface)" }}
                  >
                    {/* Driver */}
                    <td className="px-2 py-4 sm:px-3 align-middle" style={{ borderBottom: "1px solid var(--color-outline)" }}>
                      <div className="truncate text-sm font-medium sm:text-base" style={{ color: "var(--color-on-surface)" }}>
                        {it.itemSummary?.name ?? "—"}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-2 py-4 sm:px-3 align-middle" style={{ borderBottom: "1px solid var(--color-outline)" }}>
                      <div className="mt-1 text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                        {it.itemSummary?.phone ?? "—"}
                      </div>
                      <div className="truncate" style={{ color: "var(--color-on-surface)" }}>
                        {it.itemSummary?.email ?? "—"}
                      </div>
                    </td>

                    {/* Company (desktop) */}
                    <td className="hidden px-3 py-4 sm:table-cell align-middle" style={{ borderBottom: "1px solid var(--color-outline)" }}>
                      <div className="flex items-center gap-5">
                        <CompanyBadge companyId={it.companyId} size="xl" />
                        <CountryFlag companyId={it.companyId} size="md" className="opacity-60" />
                        {!it.companyId && (
                          <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--color-primary-container)", color: "var(--color-on-primary-container)" }}>
                            Unassigned
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-4 text-right sm:px-3 align-middle" style={{ borderBottom: "1px solid var(--color-outline)" }}>
                      <Link
                        href={`/dashboard/invitations/${it._id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 sm:gap-2 sm:px-2.5 sm:py-1.5 text-sm transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                        style={{
                          backgroundColor: "var(--color-card)",
                          color: "var(--color-on-surface)",
                          border: "1px solid var(--color-outline)",
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                        <span className="hidden sm:inline">View Invitation</span>
                      </Link>
                    </td>
                  </motion.tr>
                ))}
            </AnimatePresence>
          </tbody>
        </motion.table>
      </div>
    </div>
  );
}
