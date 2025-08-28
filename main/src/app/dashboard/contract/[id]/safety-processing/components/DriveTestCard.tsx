"use client";

import { formatInputDate } from "@/lib/utils/dateUtils";
import { IDriveTest } from "@/types/driveTest.types";
import { useId } from "react";

type Props = {
  trackerId: string;
  driveTest: IDriveTest; // server shape varies; read defensively
  canEdit: boolean; // enable interactivity only when step is reached
};

function isCompleted(block: any): boolean {
  const v = block?.overallAssessment;
  return v === "pass" || v === "fail" || v === "conditional_pass";
}

export default function DriveTestCard({ trackerId, driveTest, canEdit }: Props) {
  const titleId = useId();
  const descId = useId();

  const pre = driveTest?.preTrip;
  const onRoad = driveTest?.onRoad;
  const preDone = isCompleted(pre);
  const roadDone = isCompleted(onRoad);

  const preDate = pre?.assessedAt ? formatInputDate(pre.assessedAt) : "N/A";
  const roadDate = onRoad?.assessedAt ? formatInputDate(onRoad.assessedAt) : "N/A";

  const locked = !canEdit;

  const tileBase = "block w-full text-center rounded-xl px-4 py-4 sm:py-5 text-sm font-medium shadow-sm";
  const tileStyle: React.CSSProperties = {
    background: "var(--color-primary-container)",
    color: "var(--color-primary-on-container)",
    border: "1px solid var(--color-outline-variant)",
  };
  const spanTileClass = `${tileBase} cursor-not-allowed opacity-90`;

  return (
    <section
      className="relative rounded-xl border p-3 sm:p-4 lg:max-h-[20rem] lg:overflow-y-auto"
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-outline)",
      }}
      aria-labelledby={titleId}
      aria-describedby={locked ? descId : undefined}
    >
      {locked && (
        <p id={descId} className="sr-only">
          Locked until step is reached.
        </p>
      )}

      {/* Overlay when locked — centered text */}
      {locked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/10 backdrop-blur-[1px]" aria-hidden>
          <div
            className="rounded-lg px-3 py-1.5 text-xs font-medium"
            style={{
              background: "var(--color-surface)",
              color: "var(--color-on-surface)",
              border: "1px solid var(--color-outline)",
              boxShadow: "var(--elevation-1)",
            }}
          >
            Locked until step is reached
          </div>
        </div>
      )}

      <header className="mb-3 flex items-center justify-between">
        <h2 id={titleId} className="text-base font-semibold">
          Drive Test
        </h2>
        {driveTest?.completed === true && (
          <span
            className="rounded-full px-2 py-0.5 text-xs"
            style={{
              background: "var(--color-success-container)",
              color: "var(--color-success-on-container)",
            }}
          >
            Drive Test Complete
          </span>
        )}
      </header>

      {/* Two-column layout: left = tiles, right = summary */}
      <div className={`grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 ${locked ? "pointer-events-none" : ""}`}>
        {/* Left: big action tiles */}
        <div className="grid grid-rows-2 gap-3 sm:gap-4">
          {locked ? (
            <>
              <span role="link" aria-disabled="true" className={spanTileClass} style={tileStyle}>
                Pre-Trip Assessment
              </span>
              <span role="link" aria-disabled="true" className={spanTileClass} style={tileStyle}>
                On-Road Evaluation
              </span>
            </>
          ) : (
            <>
              <a className={tileBase} style={tileStyle} href={`/appraisal/${trackerId}/drive-test/pre-trip-assessment`} target="_blank">
                Pre-Trip Assessment
              </a>
              <a className={tileBase} style={tileStyle} href={`/appraisal/${trackerId}/drive-test/on-road-assessment`} target="_blank">
                On-Road Evaluation
              </a>
            </>
          )}
        </div>

        {/* Right: details with separators like your screenshot */}
        <div className="grid grid-rows-2 rounded-xl border" style={{ borderColor: "var(--color-outline-variant)" }}>
          <div className="grid grid-cols-2 gap-1 rounded-t-xl p-3" style={{ borderBottom: "1px solid var(--color-outline-variant)" }}>
            <div className="text-sm">
              <div className="text-xs opacity-70">Completed Pre-Trip</div>
              <div>{preDone ? "Yes" : "No"}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs opacity-70">Complete Date</div>
              <div>{preDate}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-b-xl p-3">
            <div className="text-sm">
              <div className="text-xs opacity-70">Completed Drive Test</div>
              <div>{roadDone ? "Yes" : "No"}</div>
            </div>
            <div className="text-sm">
              <div className="text-xs opacity-70">Complete Date</div>
              <div>{roadDate}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
