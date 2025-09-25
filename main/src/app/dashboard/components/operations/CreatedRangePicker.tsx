"use client";

/**
 * CreatedRangePicker
 * ------------------
 * Lightweight date range using native inputs.
 * Emits ISO YYYY-MM-DD strings. Theme-aware. Mobile-first.
 */

type Props = Readonly<{
  from?: string; // 'YYYY-MM-DD'
  to?: string; // 'YYYY-MM-DD'
  onChange: (from?: string, to?: string) => void;
}>;

export default function CreatedRangePicker({ from, to, onChange }: Props) {
  const onFrom = (v: string) => {
    // Keep lexicographic compare (ISO dates) & auto-correct ordering
    if (to && v && v > to) onChange(to, v);
    else onChange(v || undefined, to);
  };

  const onTo = (v: string) => {
    if (from && v && v < from) onChange(v, from);
    else onChange(from, v || undefined);
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--color-surface)",
    color: "var(--color-on-surface)",
    border: "1px solid var(--color-outline)",
  };

  return (
    <div className="min-w-0 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* From */}
        <div className="space-y-1">
          <label
            htmlFor="created-from"
            className="text-xs"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            From
          </label>
          <input
            id="created-from"
            type="date"
            value={from ?? ""}
            onChange={(e) => onFrom(e.target.value)}
            // Prevent picking a date after "to"
            max={to || undefined}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            style={inputStyle}
          />
        </div>

        {/* To */}
        <div className="space-y-1">
          <label
            htmlFor="created-to"
            className="text-xs"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            To
          </label>
          <input
            id="created-to"
            type="date"
            value={to ?? ""}
            onChange={(e) => onTo(e.target.value)}
            // Prevent picking a date before "from"
            min={from || undefined}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            style={inputStyle}
          />
        </div>
      </div>

      {(from || to) && (
        <button
          type="button"
          onClick={() => onChange(undefined, undefined)}
          className="w-full sm:w-auto rounded-lg px-3 py-1.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          style={{
            backgroundColor: "var(--color-card)",
            color: "var(--color-on-surface-variant)",
            border: "1px solid var(--color-outline)",
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
