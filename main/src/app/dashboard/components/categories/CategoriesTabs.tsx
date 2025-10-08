"use client";

/**
 * CategoriesTabs
 * --------------
 * Apple-like segmented control with a left label cell.
 * Mobile: 4 columns in a single row.
 * sm+   : single-row flex with equal fill.
 */

import type { OnboardingListCounts } from "@/lib/dashboard/api/adminOnboarding";
import type { CategoryTab } from "@/hooks/dashboard/useAdminOnboardingQueryState";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Props = Readonly<{
  currentTab: CategoryTab;
  counts?: OnboardingListCounts;
  onChangeTab: (tab: CategoryTab) => void;
}>;

export default function CategoriesTabs({
  currentTab,
  counts,
  onChangeTab,
}: Props) {
  const tabs: Array<{ key: CategoryTab; label: string; count?: number }> = [
    { key: "all", label: "All", count: counts?.all },
    { key: "drive-test", label: "Drive Test", count: counts?.driveTest },
    {
      key: "carriers-edge-training",
      label: "Carrier's Edge",
      count: counts?.carriersEdgeTraining,
    },
    { key: "drug-test", label: "Drug Test", count: counts?.drugTest },
  ];

  return (
    <div
      role="tablist"
      aria-label="Categories"
      className="rounded-2xl overflow-visible min-w-0"
      style={{
        backgroundColor: "var(--color-surface)",
        boxShadow: "var(--elevation-1)",
        border: "1px solid var(--card-border-color)",
        transition: "box-shadow .2s ease, border-color .2s ease",
      }}
    >
      <div className="flex w-full items-stretch min-w-0">
        {/* Label cell (hidden on mobile) */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 sm:px-4 text-sm font-medium select-none shrink-0"
          style={{
            color: "var(--color-on-lightgray-test)",
            borderRight: "1px solid var(--color-outline)",
          }}
        >
          <span className="font-bold">Categories</span>
        </div>

        {/* Segments: 4 equal columns on mobile, flex equal fill on sm+ */}
        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-4 sm:flex">
            {tabs.map((t, index) => {
              const active = currentTab === t.key;
              const labelText =
                typeof t.count === "number"
                  ? `${t.label} (${t.count})`
                  : t.label;

              return (
              <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onChangeTab(t.key)}
                  title={labelText}
                  className={cx(
                    // Ensure consistent height and vertical centering; allow height to grow on zoom
                    "w-full px-2 sm:px-4 py-2.5 flex items-center justify-center rounded-none first:rounded-l-2xl last:rounded-r-2xl",
                    "text-xs sm:text-sm",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                    // Equal fill on desktop
                    "sm:flex-1 sm:basis-0",
                    active && "font-semibold",
                    // Dividers between items
                    index > 0 && "border-l"
                  )}
                  style={{
                    color: active
                      ? "var(--color-white)"
                      : "var(--color-on-surface-variant)",
                    backgroundColor: active
                      ? "var(--color-primary)"
                      : "transparent",
                    borderColor: "var(--color-outline)",
                  }}
                >
                  <span className="block truncate leading-[1.1]">{labelText}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
