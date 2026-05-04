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
  mode: "terminate" | "restore" | "permanentDelete";
  driverName?: string;
  onConfirm: (action?: "terminated" | "resigned") => void;
  onCancel: () => void;
  isBusy?: boolean;
  /** Shown above actions when a request fails (replaces alert()). */
  errorText?: string | null;
}>;

function DialogErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border p-2.5 text-sm leading-snug"
      style={{
        borderColor: "var(--color-error)",
        backgroundColor: "var(--color-error-container)",
        color: "var(--color-error-on-container)",
      }}
    >
      {message}
    </div>
  );
}

export default function ConfirmTerminateDialog({
  open,
  mode,
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  if (mode === "permanentDelete") {
    const title = "Permanently delete this onboarding?";
    const desc = `This will permanently remove ${driverName ?? "this driver"} and all related records and files. This cannot be undone.`;

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
          <div
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-on-surface)" }}
          >
            {title}
          </div>
          <p
            className="mb-4 text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {desc}
          </p>

          {errorText ? <DialogErrorBanner message={errorText} /> : null}

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
                backgroundColor: "var(--color-error)",
              }}
              onClick={() => onConfirm()}
              disabled={isBusy}
            >
              {isBusy ? "Please wait…" : "Delete permanently"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // For restore mode, show simple confirm/cancel
  if (mode === "restore") {
    const title = "Restore application?";
    const desc = `This will move ${driverName ?? "the driver"} back to active views.`;

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
          <div
            className="mb-2 text-lg font-semibold"
            style={{ color: "var(--color-on-surface)" }}
          >
            {title}
          </div>
          <p
            className="mb-4 text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {desc}
          </p>

          {errorText ? <DialogErrorBanner message={errorText} /> : null}

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
                backgroundColor: "var(--color-success)",
              }}
              onClick={() => onConfirm()}
              disabled={isBusy}
            >
              {isBusy ? "Please wait…" : "Restore"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // For terminate mode, show three options: Terminate, Resign, Cancel
  const title = "Terminate application?";
  const desc = `This will mark ${driverName ?? "the driver"} as terminated and remove the application from active views.`;

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
        <div
          className="mb-2 text-lg font-semibold"
          style={{ color: "var(--color-on-surface)" }}
        >
          {title}
        </div>
        <p
          className="mb-4 text-sm"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {desc}
        </p>

        {errorText ? <DialogErrorBanner message={errorText} /> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-sm text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] active:scale-95"
            style={{
              backgroundColor: "var(--color-error)",
            }}
            onClick={() => onConfirm("terminated")}
            disabled={isBusy}
          >
            {isBusy ? "Please wait…" : "Terminate"}
          </button>
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-sm text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] active:scale-95"
            style={{
              backgroundColor: "var(--color-warning)",
            }}
            onClick={() => onConfirm("resigned")}
            disabled={isBusy}
          >
            {isBusy ? "Please wait…" : "Resign"}
          </button>
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
        </div>
      </div>
    </div>
  );
}
