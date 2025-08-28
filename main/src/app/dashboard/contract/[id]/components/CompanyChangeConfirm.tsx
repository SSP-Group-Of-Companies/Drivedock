"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  currentName: string;
  targetName: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  isBusy?: boolean;
};

export default function CompanyChangeConfirm({
  open,
  currentName,
  targetName,
  onConfirm,
  onCancel,
  isBusy,
}: Props) {
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    cancelBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-change-title"
      onPointerDown={(e) => {
        // backdrop click closes
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-4 shadow-xl"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-outline)",
        }}
        role="document"
      >
        <div id="company-change-title" className="mb-2 text-lg font-semibold">
          Change company?
        </div>
        <p
          className="mb-4 text-sm"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          You’re about to move this driver from <strong>{currentName}</strong>{" "}
          to <strong>{targetName}</strong>.
        </p>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelBtnRef}
            className="rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--color-outline)" }}
            onClick={onCancel}
            disabled={isBusy}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            onClick={() => onConfirm()}
            disabled={isBusy}
          >
            {isBusy ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
