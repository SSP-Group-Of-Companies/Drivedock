"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ContractContext } from "@/lib/dashboard/api/contracts";
import { EStepPath } from "@/types/onboardingTracker.types";
import { EDrugTestStatus } from "@/types/drugTest.types";

function daysUntil(dateIso?: string): number | null {
  if (!dateIso) return null;
  const now = new Date();
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function computeNotifications(ctx: ContractContext | null) {
  const notes: { id: string; text: string }[] = [];
  if (!ctx) return notes;

  // License expiring in <= 60 days
  const days = daysUntil(ctx.forms?.identifications?.driverLicenseExpiration);
  if (days !== null && days <= 60) {
    notes.push({
      id: "license",
      text: `Driver's license will expire in ${days} day(s)`,
    });
  }

  const step = ctx.status?.currentStep;

  // Drive Test: if current step is DRIVE_TEST and NOT completed (undefined counts as false)
  if (step === EStepPath.DRIVE_TEST) {
    const completed = ctx.forms?.driveTest?.completed === true;
    if (!completed) {
      notes.push({ id: "dt", text: "Driver is waiting for drive test" });
    }
  }

  // Carrier's Edge: if current step is CARRIERS_EDGE_TRAINING and email NOT sent (undefined counts as false)
  if (step === EStepPath.CARRIERS_EDGE_TRAINING) {
    const emailSent = ctx.forms?.carriersEdgeTraining?.emailSent === true;
    if (!emailSent) {
      notes.push({
        id: "ce",
        text: "Driver is waiting for Carrier’s Edge test credentials",
      });
    }
  }

  // Drug Test: only when AWAITING_REVIEW (we don't notify just for 'no docs')
  if (
    step === EStepPath.DRUG_TEST &&
    ctx.forms?.drugTest?.status === EDrugTestStatus.AWAITING_REVIEW
  ) {
    notes.push({
      id: "drug",
      text: "Driver is awaiting drug test result verification",
    });
  }

  return notes;
}

export default function NotificationsMenu({
  onClose,
  context,
}: {
  onClose: () => void;
  context: ContractContext | null;
}) {
  const items = useMemo(() => computeNotifications(context), [context]);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close on click outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="absolute right-0 z-40 mt-2 w-[22rem] rounded-xl border p-2 shadow-lg"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-outline)",
      }}
    >
      <div
        className="flex items-center justify-between px-2 pb-2 text-xs"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        <span>Safety notifications</span>
        <span
          className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{
            background: "var(--color-error-container)",
            color: "var(--color-error-on-container)",
          }}
        >
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div
          className="px-2 py-3 text-sm"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          No pending notifications.
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((n) => (
            <li
              key={n.id}
              className="rounded-lg px-2 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: "var(--color-on-surface)" }}
            >
              {n.text}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors active:scale-95"
          style={{
            borderColor: "var(--color-outline)",
            color: "var(--color-on-surface)",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Export for reuse (ContractSummaryBar badge)
export { computeNotifications };
