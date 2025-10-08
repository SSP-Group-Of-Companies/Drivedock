/**
 * DriveDock — Shared Sorting Utilities
 * ------------------------------------
 * Reusable sort helpers for common domain entities.
 */

import type { IEmploymentEntry } from "@/types/applicationForm.types";

/**
 * Sort employments from most recent → oldest.
 *  - Primary key: `from` date (desc)
 *  - Secondary key: `to` date (desc)
 * Returns a *new array*; does not mutate input.
 */
export function sortEmploymentsDesc(employments: IEmploymentEntry[]): IEmploymentEntry[] {
  return [...(employments ?? [])].sort((a, b) => {
    const aFrom = new Date(a.from).getTime();
    const bFrom = new Date(b.from).getTime();
    if (bFrom !== aFrom) return bFrom - aFrom;

    const aTo = new Date(a.to).getTime();
    const bTo = new Date(b.to).getTime();
    return bTo - aTo;
  });
}
