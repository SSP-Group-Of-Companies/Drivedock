"use client";

/**
 * ConfirmTerminateDialog
 * ----------------------
 * Minimal, accessible confirm dialog.
 * - Controlled by parent via `open`
 * - Shows driver name for clarity
 * - Can be reused for "restore" by changing the `mode`
 */

import { useEffect } from "react";

type Props = Readonly<{
  open: boolean;
  mode: "terminate" | "restore";
  driverName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isBusy?: boolean;
}>;

export default function ConfirmTerminateDialog({
  open,
  mode,
  driverName,
  onConfirm,
  onCancel,
  isBusy,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const title =
    mode === "terminate" ? "Terminate application?" : "Restore application?";
  const desc =
    mode === "terminate"
      ? `This will mark ${
          driverName ?? "the driver"
        } as terminated and remove the application from active views.`
      : `This will move ${driverName ?? "the driver"} back to active views.`;

  const confirmLabel = mode === "terminate" ? "Terminate" : "Restore";

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--color-shadow-elevated)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-4 shadow-xl"
        style={{
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-outline)",
          color: "var(--color-on-surface)",
        }}
      >
        <div className="mb-2 text-lg font-semibold" style={{ color: "var(--color-on-surface)" }}>
          {title}
        </div>
        <p className="mb-4 text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
          {desc}
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-sm transition-colors cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            style={{
              backgroundColor: "transparent",
              color: "var(--color-on-surface)",
              border: "1px solid var(--color-outline)",
            }}
            onClick={onCancel}
            disabled={isBusy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-sm text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] active:scale-95"
            style={{
              backgroundColor:
                mode === "terminate"
                  ? "var(--color-error)"
                  : "var(--color-success)",
            }}
            onClick={onConfirm}
            disabled={isBusy}
          >
            {isBusy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
