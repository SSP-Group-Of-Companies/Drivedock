"use client";

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

  // Drive Test pending
  if (
    ctx.status?.currentStep === EStepPath.DRIVE_TEST &&
    ctx.forms?.driveTest?.completed === false
  ) {
    notes.push({ id: "dt", text: "Driver is waiting for drive test" });
  }

  // Carrier's Edge credentials not sent
  if (
    ctx.status?.currentStep === EStepPath.CARRIERS_EDGE_TRAINING &&
    ctx.forms?.carriersEdgeTraining?.emailSent === false
  ) {
    notes.push({
      id: "ce",
      text: "Driver is waiting for Carrier’s Edge test credentials",
    });
  }

  // Drug Test awaiting review
  if (
    ctx.status?.currentStep === EStepPath.DRUG_TEST &&
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
  const items = computeNotifications(context);

  return (
    <div
      role="menu"
      className="absolute right-0 z-40 mt-2 w-[22rem] rounded-xl border p-2 shadow-lg"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-outline)",
      }}
    >
      <div
        className="px-2 pb-2 text-xs"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        Safety notifications ({items.length})
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
          className="rounded-lg border px-3 py-1.5 text-sm transition-colors cursor-pointer active:scale-95"
          style={{ 
            borderColor: "var(--color-outline)",
            color: "var(--color-on-surface)"
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
