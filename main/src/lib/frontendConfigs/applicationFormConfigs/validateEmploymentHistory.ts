import { differenceInDays } from "date-fns";

// Frontend validation for real-time UI feedback
export function validateEmploymentHistory(employments: any[]): string | null {
  if (!Array.isArray(employments) || employments.length === 0) {
    return "At least one employment entry is required.";
  }

  if (employments.length > 5) {
    return "A maximum of 5 employment entries is allowed.";
  }

  // Sort by `from` date descending (most recent first)
  const sorted = [...employments].sort(
    (a, b) => new Date(b.from).getTime() - new Date(a.from).getTime()
  );

  let totalDays = 0;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const from = new Date(current.from);
    const to = new Date(current.to);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return `Invalid date format in employment entry for ${current.supervisorName}`;
    }

    if (to < from) {
      return `End date cannot be before start date in job at ${current.supervisorName}`;
    }

    totalDays += differenceInDays(to, from);

    const next = sorted[i + 1];
    if (next) {
      const nextTo = new Date(next.to);

      // ❌ Overlap check: current.from must be >= next.to
      if (from < nextTo) {
        return `Job at ${current.supervisorName} overlaps with job at ${next.supervisorName}`;
      }

      // Gap check
      const gapDays = differenceInDays(from, nextTo);
      if (
        gapDays >= 30 &&
        (!current.gapExplanationBefore ||
          current.gapExplanationBefore.trim() === "")
      ) {
        return `Missing gap explanation before employment at ${current.supervisorName}`;
      }
    }
  }

  const totalMonths = Math.floor(totalDays / 30.44); // Average days per month
  const twoYearsInDays = 730; // 2 years = 730 days
  const tenYearsInDays = 3650; // 10 years = 3650 days

  if (totalDays === twoYearsInDays) {
    return null; // ✅ Exactly 2 years
  }

  if (totalDays < twoYearsInDays) {
    return "Driving experience must be at least 2 years.";
  }

  if (totalDays > twoYearsInDays && totalDays < tenYearsInDays) {
    return "If experience is over 2 years, a full 10 years of history must be entered.";
  }

  return null; // ✅ 10+ years
}

// Timeline calculation for real-time UI messages
export function calculateTimelineFromCurrent(employments: any[]) {
  const current = employments[0];
  if (!current?.to) {
    return {
      totalDays: 0,
      totalMonths: 0,
      needsMore: false,
      monthsNeeded: 0,
      timeline: [],
    };
  }

  // The current employment's "to" date is our "wall" - everything is calculated backwards from here
  const currentToDate = new Date(current.to);
  let totalDays = 0;
  let timeline = [];

  // Calculate current employment duration (this is the "wall")
  if (current.from && current.to) {
    const currentFrom = new Date(current.from);
    const currentDurationDays = differenceInDays(currentToDate, currentFrom);
    totalDays += currentDurationDays;
    timeline.push({
      from: currentFrom,
      to: currentToDate,
      durationDays: currentDurationDays,
      durationMonths: Math.floor(currentDurationDays / 30.44),
      type: "current",
    });
  }

  // Calculate previous employments as one continuous timeline from current "to" backwards
  for (let i = 1; i < employments.length; i++) {
    const emp = employments[i];
    if (emp.from && emp.to) {
      const from = new Date(emp.from);
      const to = new Date(emp.to);

      // Calculate duration from this employment's "to" date backwards
      const durationDays = differenceInDays(to, from);

      totalDays += durationDays;
      timeline.push({
        from,
        to,
        durationDays,
        durationMonths: Math.floor(durationDays / 30.44),
        type: "previous",
        index: i,
      });
    }
  }

  // Keep timeline in employment form order (current first, then previous employments)
  // No sorting needed - timeline is already in correct order

  const totalMonths = Math.floor(totalDays / 30.44);
  const tenYearsInDays = 3650; // 10 years = 3650 days
  const daysNeeded = Math.max(0, tenYearsInDays - totalDays);
  const monthsNeeded = Math.floor(daysNeeded / 30.44);
  const needsMore = totalDays > 730 && totalDays < tenYearsInDays; // 730 days = 2 years

  return {
    totalDays,
    totalMonths,
    needsMore,
    monthsNeeded,
    timeline,
  };
}

// Get gaps between employment entries for UI display
export function getEmploymentGaps(timeline: any[]) {
  const gaps: Array<{
    index: number;
    days: number;
    beforeEmployment: string;
    afterEmployment: string;
  }> = [];

  if (!timeline || timeline.length < 2) return gaps;

  // Check gaps between consecutive employment entries
  // Timeline is in order: current (index 0), previous1 (index 1), previous2 (index 2), etc.
  for (let i = 0; i < timeline.length - 1; i++) {
    const current = timeline[i];
    const next = timeline[i + 1];

    // Gap = current.from - next.to (using differenceInDays for accuracy)
    const gapDays = differenceInDays(current.from, next.to);

    if (gapDays >= 30) {
      gaps.push({
        index: i, // Use the index of the current employment in the timeline
        days: gapDays,
        beforeEmployment:
          current.type === "current" ? "Current" : `Previous ${current.index}`,
        afterEmployment:
          next.type === "current" ? "Current" : `Previous ${next.index}`,
      });
    }
  }

  return gaps;
}
