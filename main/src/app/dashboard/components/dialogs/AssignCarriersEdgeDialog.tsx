"use client";

import { useEffect } from "react";

type Props = Readonly<{
  open: boolean;
  driverName?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  isBusy?: boolean;
  errorText?: string | null;
}>;

export default function AssignCarriersEdgeDialog({
  open,
  driverName,
  onConfirm,
  onCancel,
  isBusy,
  errorText,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onCancel();
    }
    const handler = onKey;
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-2 text-lg font-semibold">
          Assign Carrier’s Edge Test?
        </div>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
          This will send or mark the Carrier’s Edge training email as sent for{" "}
          {driverName ?? "this driver"}.
        </p>

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
            onClick={() => onConfirm()}
            disabled={isBusy}
          >
            {isBusy ? "Assigning…" : "Assign test"}
          </button>
        </div>
      </div>
    </div>
  );
}
