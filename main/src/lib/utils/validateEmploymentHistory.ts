import { IEmploymentEntry } from "@/types/applicationForm.types";
import { differenceInDays } from "date-fns";

export function validateEmploymentHistory(employments: IEmploymentEntry[]): string | null {
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
        return `Invalid date format in employment entry for ${current.employerName}`;
      }
  
      if (to < from) {
        return `End date cannot be before start date in job at ${current.employerName}`;
      }
  
      totalDays += differenceInDays(to, from);
  
      const next = sorted[i + 1];
      if (next) {
        const nextTo = new Date(next.to);
  
        // ❌ Overlap check: current.from must be >= next.to
        if (from < nextTo) {
          return `Job at ${current.employerName} overlaps with job at ${next.employerName}`;
        }
  
        // Gap check
        const gapDays = differenceInDays(from, nextTo);
        if (
          gapDays >= 30 &&
          (!current.gapExplanationBefore || current.gapExplanationBefore.trim() === "")
        ) {
          return `Missing gap explanation before employment at ${current.employerName}`;
        }
      }
    }
  
    const totalMonths = Math.floor(totalDays / 30);
  
    if (totalMonths === 24) {
      return null; // ✅ Exactly 2 years
    }
  
    if (totalMonths < 24) {
      return "Driving experience must be at least 2 years.";
    }
  
    if (totalMonths > 24 && totalMonths < 120) {
      return "If experience is over 2 years, a full 10 years of history must be entered.";
    }
  
    return null; // ✅ 10+ years
  }
  