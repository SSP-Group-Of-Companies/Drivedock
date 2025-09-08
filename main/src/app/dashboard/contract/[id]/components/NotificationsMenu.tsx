"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ContractContext } from "@/lib/dashboard/api/contracts";
import { EStepPath } from "@/types/onboardingTracker.types";
import { EDrugTestStatus } from "@/types/drugTest.types";

function daysUntil(dateIso?: string): number | null {
  if (!dateIso) return null;
  const now = new Date();
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function hasTruckDetails(truckDetails?: any): boolean {
  if (!truckDetails) return false;
  
  // Check if any truck detail field has meaningful data
  const fields = ['vin', 'make', 'model', 'year', 'province', 'truckUnitNumber', 'plateNumber'];
  return fields.some(field => {
    const value = truckDetails[field];
    return value && typeof value === 'string' && value.trim().length > 0;
  });
}

function computeNotifications(ctx: ContractContext | null) {
  const notes: { id: string; text: string }[] = [];
  if (!ctx) return notes;

  const days = daysUntil(ctx.forms?.identifications?.driverLicenseExpiration);
  if (days !== null && days <= 60) {
    notes.push({
      id: "license",
      text: `Driver's license will expire in ${days} day(s)`,
    });
  }

  const step = ctx.status?.currentStep;

  if (
    step === EStepPath.DRIVE_TEST &&
    ctx.forms?.driveTest?.completed !== true
  ) {
    notes.push({ id: "dt", text: "Driver is waiting for drive test" });
  }
  if (
    step === EStepPath.CARRIERS_EDGE_TRAINING &&
    ctx.forms?.carriersEdgeTraining?.emailSent !== true
  ) {
    notes.push({
      id: "ce",
      text: "Driver is waiting for Carrier’s Edge test credentials",
    });
  }
  if (
    step === EStepPath.DRUG_TEST &&
    ctx.forms?.drugTest?.status === EDrugTestStatus.AWAITING_REVIEW
  ) {
    notes.push({
      id: "drug",
      text: "Driver is awaiting drug test result verification",
    });
  }

  // Truck details notification - show when driver has completed page 4 or beyond and truck details are missing
  if (
    (step === EStepPath.APPLICATION_PAGE_4 ||
     step === EStepPath.APPLICATION_PAGE_5 ||
     step === EStepPath.POLICIES_CONSENTS ||
     step === EStepPath.DRIVE_TEST ||
     step === EStepPath.CARRIERS_EDGE_TRAINING ||
     step === EStepPath.DRUG_TEST ||
     step === EStepPath.FLATBED_TRAINING) &&
    (!ctx.forms?.identifications?.truckDetails || !hasTruckDetails(ctx.forms.identifications.truckDetails))
  ) {
    notes.push({
      id: "truck-details",
      text: "Truck details hasn't been submitted",
    });
  }

  return notes;
}

export default function NotificationsMenu({
  onClose,
  context,
  trackerId,
  id,
}: {
  onClose: () => void;
  context: ContractContext | null;
  trackerId: string;
  id?: string;
}) {
  const router = useRouter();
  const items = useMemo(() => computeNotifications(context), [context]);

  const handleNotificationClick = (notificationId: string) => {
    if (!trackerId) {
      console.error("No trackerId available for navigation");
      return;
    }

    let targetUrl: string;
    
    switch (notificationId) {
      case "truck-details":
        targetUrl = `/dashboard/contract/${trackerId}/identifications?highlight=truck-details`;
        break;
      case "license":
        targetUrl = `/dashboard/contract/${trackerId}/identifications`;
        break;
      case "dt":
        targetUrl = `/dashboard/contract/${trackerId}/appraisal/drive-test`;
        break;
      case "ce":
        targetUrl = `/dashboard/contract/${trackerId}/safety-processing`;
        break;
      case "drug":
        targetUrl = `/dashboard/contract/${trackerId}/safety-processing`;
        break;
      default:
        console.warn("Unknown notification ID:", notificationId);
        return;
    }
    
    console.log("Navigating to:", targetUrl);
    router.push(targetUrl);
    onClose();
  };

  return (
    <div
      id={id}
      role="menu"
      aria-label="Safety notifications"
      className="absolute right-0 z-40 mt-2 w-[22rem] rounded-xl border p-2 shadow-lg"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-outline)",
      }}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
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
          {items.map((n) => {
            const isClickable = ["truck-details", "license", "dt", "ce", "drug"].includes(n.id);
            return (
              <li
                key={n.id}
                className={`rounded-lg px-2 py-2 text-sm transition-colors ${
                  isClickable 
                    ? "cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 active:scale-95" 
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                style={{ color: "var(--color-on-surface)" }}
                role="menuitem"
                onClick={isClickable ? () => handleNotificationClick(n.id) : undefined}
                onKeyDown={isClickable ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleNotificationClick(n.id);
                  }
                } : undefined}
                tabIndex={isClickable ? 0 : -1}
                aria-label={isClickable ? `${n.text} - Click to navigate` : n.text}
              >
                <div className="flex items-center justify-between">
                  <span>{n.text}</span>
                  {isClickable && (
                    <span className="text-xs opacity-60" style={{ color: "var(--color-on-surface-variant)" }}>
                      →
                    </span>
                  )}
                </div>
              </li>
            );
          })}
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

export { computeNotifications };
