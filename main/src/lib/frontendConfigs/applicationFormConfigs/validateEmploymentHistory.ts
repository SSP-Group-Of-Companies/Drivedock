// main/src/lib/frontendConfigs/applicationFormConfigs/validateEmploymentHistory.ts

import { differenceInDays } from "date-fns";

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

/**
 * UI helpers for live banners & gap detection.
 * The canonical validator lives in lib/utils/validationUtils.ts
 */

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
