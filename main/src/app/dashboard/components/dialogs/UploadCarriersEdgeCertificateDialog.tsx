"use client";

import { useEffect, useState } from "react";

type Props = Readonly<{
  open: boolean;
  driverName?: string;
  onConfirm: (payload: {
    certificateId: string;
    completedAt?: string;
  }) => Promise<void> | void;
  onCancel: () => void;
  isBusy?: boolean;
  errorText?: string | null;
}>;

export default function UploadCarriersEdgeCertificateDialog({
  open,
  driverName,
  onConfirm,
  onCancel,
  isBusy,
  errorText,
}: Props) {
  const [certificateId, setCertificateId] = useState("");
  const [completedAt, setCompletedAt] = useState("");

  useEffect(() => {
    if (!open) return;
    setCertificateId("");
    setCompletedAt("");
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

  const disabled = isBusy || certificateId.trim().length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-2 text-lg font-semibold">Upload CE Certificate</div>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
          Provide details for {driverName ?? "this driver"}. Uploading will
          complete Carrier’s Edge and advance the application.
        </p>

        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Certificate ID *
        </label>
        <input
          value={certificateId}
          onChange={(e) => setCertificateId(e.target.value)}
          className="mb-3 w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="e.g. CE-123456"
          disabled={isBusy}
        />

        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Completed date (optional)
        </label>
        <input
          type="date"
          value={completedAt}
          onChange={(e) => setCompletedAt(e.target.value)}
          className="mb-3 w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
                certificateId: certificateId.trim(),
                completedAt: completedAt || undefined,
              })
            }
            disabled={disabled}
          >
            {isBusy ? "Saving…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
