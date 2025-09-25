"use client";

/**
 * VerifyDrugTestDialog
 * --------------------
 * Minimal confirm modal for marking a drug test Pass/Fail with optional notes.
 * Controlled by parent; shows busy state; surfaces inline error text if present.
 */

import { useEffect, useState } from "react";

type Props = Readonly<{
  open: boolean;
  driverName?: string;
  onConfirm: (opts: {
    result: "pass" | "fail";
    notes?: string;
  }) => Promise<void> | void;
  onCancel: () => void;
  isBusy?: boolean;
  errorText?: string | null;
}>;

export default function VerifyDrugTestDialog({
  open,
  driverName,
  onConfirm,
  onCancel,
  isBusy,
  errorText,
}: Props) {
  const [result, setResult] = useState<"pass" | "fail" | "">("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setResult("");
      setNotes("");
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const disabled = isBusy || result === "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-2 text-lg font-semibold">Verify Drug Test</div>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
          Mark the result for {driverName ?? "this driver"}.
        </p>

        <div className="mb-3 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="dt-result"
              value="pass"
              checked={result === "pass"}
              onChange={() => setResult("pass")}
              disabled={isBusy}
            />
            Pass
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="dt-result"
              value="fail"
              checked={result === "fail"}
              onChange={() => setResult("fail")}
              disabled={isBusy}
            />
            Fail
          </label>
        </div>

        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mb-3 w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Add any verification notes…"
          disabled={isBusy}
        />

        {errorText && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {errorText}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            onClick={onCancel}
            disabled={isBusy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            onClick={() =>
              onConfirm({
                result: result as "pass" | "fail",
                notes: notes || undefined,
              })
            }
            disabled={disabled}
          >
            {isBusy ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
