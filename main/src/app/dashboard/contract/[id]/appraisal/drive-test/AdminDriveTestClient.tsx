// src/app/dashboard/contract/appraisal/[id]/drive-test/AdminDriveTestClient.tsx
"use client";

import Link from "next/link";
import { useId, useMemo } from "react";
import { useParams } from "next/navigation";

import type { IDriveTest, IOnRoadAssessment, IPreTripAssessment } from "@/types/driveTest.types";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

/* ------------------------------- Utilities ------------------------------- */

function isCompleted(block: { overallAssessment?: string | null } | undefined | null): boolean {
  const v = block?.overallAssessment;
  return v === "pass" || v === "fail" || v === "conditional_pass";
}

function fmtDate(d?: string | Date | null): string {
  if (!d) return "N/A";
  try {
    const date = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString();
  } catch {
    return "N/A";
  }
}

function overallBadge(overall?: string | null) {
  if (!overall) return null;
  let bg = "var(--color-warning-container)";
  let fg = "var(--color-warning-on-container)";

  if (overall === "pass") {
    bg = "var(--color-success-container)";
    fg = "var(--color-success-on-container)";
  } else if (overall === "fail") {
    bg = "var(--color-error)";
    fg = "white";
  }
  return (
    <span className="rounded-full px-2 py-0.5 text-xs capitalize" style={{ background: bg, color: fg }}>
      {overall.replace("_", " ")}
    </span>
  );
}

function countCheckedFromPreTrip(pre?: IPreTripAssessment | null): number {
  if (!pre) return 0;
  const s = pre.sections;
  const lists = [s?.underHood?.items, s?.outside?.items, s?.uncoupling?.items, s?.coupling?.items, s?.airSystem?.items, s?.inCab?.items, s?.backingUp?.items].filter(Boolean) as Array<
    { checked?: boolean }[]
  >;
  return lists.flat().reduce((acc, it) => acc + (it?.checked ? 1 : 0), 0);
}

function countCheckedFromOnRoad(or?: IOnRoadAssessment | null): number {
  if (!or) return 0;
  const s = or.sections;
  const lists = [s?.placingVehicleInMotion?.items, s?.highwayDriving?.items, s?.rightLeftTurns?.items, s?.defensiveDriving?.items, s?.gps?.items, s?.operatingInTraffic?.items].filter(
    Boolean
  ) as Array<{ checked?: boolean }[]>;
  return lists.flat().reduce((acc, it) => acc + (it?.checked ? 1 : 0), 0);
}

/* -------------------------------- Component ------------------------------- */

export default function AdminDriveTestClient({
  driveTest,
  driverName,
  driverLicense,
}: {
  onboardingContext: IOnboardingTrackerContext;
  driveTest?: IDriveTest | null;
  driverName: string;
  driverLicense: string;
}) {
  const { id: trackerId } = useParams<{ id: string }>();
  const titleId = useId();

  const pre = driveTest?.preTrip ?? null;
  const road = driveTest?.onRoad ?? null;

  const preDone = isCompleted(pre);
  const roadDone = isCompleted(road);

  const preChecked = useMemo(() => countCheckedFromPreTrip(pre), [pre]);
  const roadChecked = useMemo(() => countCheckedFromOnRoad(road), [road]);

  const tileBase = "block w-full text-center rounded-xl px-4 py-4 sm:py-5 text-sm font-medium shadow-sm";
  const tileStyle: React.CSSProperties = {
    background: "var(--color-primary-container)",
    color: "var(--color-primary-on-container)",
    border: "1px solid var(--color-outline-variant)",
  };

  const preTripApiUrl = `/api/v1/admin/onboarding/${trackerId}/appraisal/drive-test/pre-trip-assessment/filled-pdf`;
  const onRoadApiUrl = `/api/v1/admin/onboarding/${trackerId}/appraisal/drive-test/on-road-assessment/filled-pdf`;

  return (
    <div className="space-y-4">
      {/* Page header (overview with badge in top right) */}
      <header className="rounded-xl border p-4 flex items-center justify-between" style={{ background: "var(--color-card)", borderColor: "var(--color-outline)" }}>
        <div>
          <h1 id={titleId} className="text-lg font-semibold">
            Drive Test — Overview
          </h1>
          <div className="mt-1 text-sm opacity-80">
            {driverName} • License: {driverLicense || "N/A"}
          </div>
        </div>
        {driveTest?.completed && (
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: "var(--color-success-container)",
              color: "var(--color-success-on-container)",
            }}
          >
            Drive Test Complete
          </span>
        )}
      </header>

      {/* Two columns */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* --------------------------- Pre-Trip Card --------------------------- */}
        <article className="rounded-xl border p-4 flex flex-col gap-3" style={{ background: "var(--color-card)", borderColor: "var(--color-outline)" }}>
          <header className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Pre-Trip Assessment</h2>
            {overallBadge(pre?.overallAssessment)}
          </header>

          <div className="rounded-xl border p-3 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ borderColor: "var(--color-outline-variant)" }}>
            <div className="text-sm">
              <div className="text-xs opacity-70">Completed</div>
              <div>{preDone ? "Yes" : "No"}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs opacity-70">Date Of Completion</div>
              <div>{fmtDate(pre?.assessedAt)}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs opacity-70">Checked</div>
              <div>{preChecked}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs opacity-70">Standard</div>
              <div>{pre?.expectedStandard || "N/A"}</div>
            </div>
            <div className="text-sm sm:col-span-2">
              <div className="text-xs opacity-70">Supervisor Name</div>
              <div>{pre?.supervisorName || "N/A"}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link className={tileBase} style={tileStyle} href={`/appraisal/${trackerId}/drive-test/pre-trip-assessment`} target="_blank">
              Pre-Trip Assessment
            </Link>
            <button type="button" className={tileBase} style={tileStyle} onClick={() => window.open(preTripApiUrl, "_blank", "noopener,noreferrer")}>
              Print
            </button>
          </div>

          <div className="mt-1">
            <div className="text-xs opacity-70 mb-1">Comments…</div>
            <div
              className="min-h-28 rounded-xl border p-3 text-sm"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline-variant)",
                color: "var(--color-on-surface)",
              }}
            >
              {pre?.comments?.trim() ? pre.comments : <span className="opacity-60">—</span>}
            </div>
          </div>
        </article>

        {/* --------------------------- On-Road Card ---------------------------- */}
        <article className="rounded-xl border p-4 flex flex-col gap-3" style={{ background: "var(--color-card)", borderColor: "var(--color-outline)" }}>
          <header className="flex items-center justify-between">
            <h2 className="text-base font-semibold">On-Road Assessment</h2>
            {overallBadge(road?.overallAssessment)}
          </header>

          <div className="rounded-xl border p-3 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ borderColor: "var(--color-outline-variant)" }}>
            <div className="text-sm">
              <div className="text-xs opacity-70">Completed</div>
              <div>{roadDone ? "Yes" : "No"}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs opacity-70">Date Of Completion</div>
              <div>{fmtDate(road?.assessedAt)}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs opacity-70">Checked</div>
              <div>{roadChecked}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs opacity-70">Standard</div>
              <div>{road?.expectedStandard || "N/A"}</div>
            </div>
            <div className="text-sm sm:col-span-2">
              <div className="text-xs opacity-70">Supervisor Name</div>
              <div>{road?.supervisorName || "N/A"}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link className={tileBase} style={tileStyle} href={`/appraisal/${trackerId}/drive-test/on-road-assessment`} target="_blank">
              On-Road Assessment
            </Link>
            <button type="button" className={tileBase} style={tileStyle} onClick={() => window.open(onRoadApiUrl, "_blank", "noopener,noreferrer")}>
              Print
            </button>
          </div>

          <div className="mt-1">
            <div className="text-xs opacity-70 mb-1">Comments…</div>
            <div
              className="min-h-28 rounded-xl border p-3 text-sm"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline-variant)",
                color: "var(--color-on-surface)",
              }}
            >
              {road?.comments?.trim() ? road.comments : <span className="opacity-60">—</span>}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
