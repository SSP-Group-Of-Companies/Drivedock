/**
 * Checks if address history covers at least `minimumYears` in total duration
 * and the most recent `to` date is within the last `minimumYears`.
 */
export function hasRecentAddressCoverage(
    addresses: { from: string; to: string }[],
    minimumYears = 5
  ): boolean {
    if (!Array.isArray(addresses)) return false;
  
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setFullYear(now.getFullYear() - minimumYears);
  
    const intervals: [Date, Date][] = [];
  
    for (const { from, to } of addresses) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (
        isNaN(fromDate.getTime()) ||
        isNaN(toDate.getTime()) ||
        fromDate >= toDate
      ) {
        return false;
      }
      intervals.push([fromDate, toDate]);
    }
  
    // Sort by start date
    intervals.sort((a, b) => a[0].getTime() - b[0].getTime());
  
    // Merge overlapping intervals
    const merged: [Date, Date][] = [];
    for (const [start, end] of intervals) {
      if (
        merged.length > 0 &&
        merged[merged.length - 1][1] >= start // overlap
      ) {
        merged[merged.length - 1][1] = new Date(
          Math.max(merged[merged.length - 1][1].getTime(), end.getTime())
        );
      } else {
        merged.push([start, end]);
      }
    }
  
    // Total unique days
    let totalDays = 0;
    let latestTo: Date | null = null;
  
    for (const [start, end] of merged) {
      totalDays += (end.getTime() - start.getTime()) / MS_PER_DAY;
      if (!latestTo || end > latestTo) {
        latestTo = end;
      }
    }
  
    return (
      totalDays >= minimumYears * 365 &&
      latestTo !== null &&
      latestTo >= cutoffDate
    );
  }
  