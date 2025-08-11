// main/src/lib/frontendConfigs/applicationFormConfigs/validateEmploymentHistory.ts

import { differenceInDays } from "date-fns";
import type { IEmploymentEntry } from "@/types/applicationForm.types";

export type TimelineItem =
  | {
      type: "current";
      from: Date;
      to: Date;
      durationDays: number;
      durationMonths: number;
    }
  | {
      type: "previous";
      index: number; // 1-based previous index in UI
      from: Date;
      to: Date;
      durationDays: number;
      durationMonths: number;
    };

// ---------- Core validator used by Zod superRefine ----------
export function validateEmploymentHistory(
  employments: IEmploymentEntry[]
): string | null {
  if (!Array.isArray(employments) || employments.length === 0) {
    return "At least one employment entry is required.";
  }
  if (employments.length > 5) {
    return "A maximum of 5 employment entries is allowed.";
  }

  // sort newest first by 'from'
  const sorted = [...employments].sort(
    (a, b) => new Date(b.from).getTime() - new Date(a.from).getTime()
  );

  let totalDays = 0;

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const from = new Date(cur.from);
    const to = new Date(cur.to);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return `Invalid date format in employment entry for ${cur.supervisorName}`;
    }
    if (to < from) {
      return `End date cannot be before start date in job at ${cur.supervisorName}`;
    }

    // include both endpoints
    const daysInThisJob = differenceInDays(to, from) + 1;
    totalDays += daysInThisJob;

    const next = sorted[i + 1];
    if (next) {
      const nextTo = new Date(next.to);

      // overlap: current.from must be >= next.to
      if (from < nextTo) {
        return `Job at ${cur.supervisorName} overlaps with job at ${next.supervisorName}`;
      }

      // gap ≥ 30 days requires explanation on *current* row
      const gapDays = differenceInDays(from, nextTo);
      if (
        gapDays >= 30 &&
        (!cur.gapExplanationBefore || cur.gapExplanationBefore.trim() === "")
      ) {
        return `Missing gap explanation before employment at ${cur.supervisorName}`;
      }
    }
  }

  const months = Math.round(totalDays / 30.44);
  const twoYears = 730; // days
  const twoYearsPlus30 = 760; // days
  const tenYears = 3650; // days

  // < 2 years → fail with explicit total
  if (totalDays < twoYears) {
    return `Employment history of 2 or more years is required. Total provided: ${months} months (${totalDays} days).`;
  }

  // ≥ 2y and ≤ 2y + 30d → pass
  if (totalDays >= twoYears && totalDays <= twoYearsPlus30) {
    return null;
  }

  // > 2y + 30d but < 10y → fail with explicit total
  if (totalDays > twoYearsPlus30 && totalDays < tenYears) {
    const yearsRough = Math.floor(totalDays / 365);
    return `Extended Employment History Required. Total provided: ~${yearsRough} years (${months} months, ${totalDays} days). You must provide 10 years of employment history. Add previous employment entries.`;
  }

  // ≥ 10y → pass
  return null;
}

// ---------- UI helpers for live banners/gaps ----------

export function calculateTimelineFromCurrent(employments: any[]) {
  const current = employments?.[0];
  if (!current?.to || !current?.from) {
    return {
      totalDays: 0,
      totalMonths: 0,
      needsMore: false,
      monthsNeeded: 0,
      timeline: [] as TimelineItem[],
    };
  }

  const timeline: TimelineItem[] = [];
  let totalDays = 0;

  // current
  {
    const from = new Date(current.from);
    const to = new Date(current.to);
    if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && to >= from) {
      const d = differenceInDays(to, from) + 1;
      totalDays += d;
      timeline.push({
        type: "current",
        from,
        to,
        durationDays: d,
        durationMonths: Math.floor(d / 30.44),
      });
    }
  }

  // previous in the order they appear in the UI (1..n)
  for (let i = 1; i < (employments?.length ?? 0); i++) {
    const emp = employments[i];
    if (!emp?.from || !emp?.to) continue;
    const from = new Date(emp.from);
    const to = new Date(emp.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to < from) continue;

    const d = differenceInDays(to, from) + 1;
    totalDays += d;
    timeline.push({
      type: "previous",
      index: i,
      from,
      to,
      durationDays: d,
      durationMonths: Math.floor(d / 30.44),
    });
  }

  const totalMonths = Math.floor(totalDays / 30.44);
  const twoYearsPlus30 = 760;
  const tenYears = 3650;
  const daysNeeded = Math.max(0, tenYears - totalDays);
  const monthsNeeded = Math.floor(daysNeeded / 30.44);

  // “needsMore” means we’re past 2y+30d but shy of 10y → we must prompt for more rows
  const needsMore = totalDays > twoYearsPlus30 && totalDays < tenYears;

  return { totalDays, totalMonths, needsMore, monthsNeeded, timeline };
}

export function getEmploymentGaps(timeline: TimelineItem[]) {
  const gaps: Array<{ index: number; days: number }> = [];
  if (!timeline || timeline.length < 2) return gaps;

  for (let i = 0; i < timeline.length - 1; i++) {
    const cur = timeline[i];
    const next = timeline[i + 1];
    const gapDays = differenceInDays(cur.from, next.to);
    if (gapDays >= 30) {
      // index of the employment that must explain the gap (the more recent one)
      gaps.push({
        index: cur.type === "current" ? 0 : cur.index,
        days: gapDays,
      });
    }
  }
  return gaps;
}
