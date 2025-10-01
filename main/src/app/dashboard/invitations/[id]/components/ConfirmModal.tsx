// src/app/dashboard/invitations/[id]/components/ConfirmModal.tsx
"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ConfirmModal({
  open,
  title,
  description,
  confirmText,
  tone = "neutral",
  busy = false,
  includeReason = false,
  reasonLabel = "Reason",
  reasonPlaceholder = "",
  maxReasonLength = 500,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  tone?: "neutral" | "danger" | "success";
  busy?: boolean;
  includeReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  maxReasonLength?: number;
  onClose: () => void;
  onConfirm: (reason?: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState<string>("");
  const confirmBg = tone === "danger" ? "var(--color-error)" : tone === "success" ? "var(--color-success)" : "var(--color-primary)";
  const remaining = useMemo(() => maxReasonLength - reason.length, [reason.length, maxReasonLength]);

  // Reset reason when modal is closed
  const handleClose = () => {
    if (!busy) {
      setReason("");
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (busy) return;
    await onConfirm(includeReason ? reason.trim() || undefined : undefined);
    setReason("");
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {/* Backdrop */}
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} onClick={handleClose} />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6"
            style={{ background: "var(--color-card)", borderColor: "var(--color-outline)", boxShadow: "var(--elevation-3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-on-surface)" }}>
              {title}
            </h3>
            <p className="text-sm mb-5" style={{ color: "var(--color-on-surface-variant)" }}>
              {description}
            </p>

            {includeReason && (
              <div className="mb-5">
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-on-surface)" }}>
                  {reasonLabel}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next.length <= maxReasonLength) setReason(next);
                  }}
                  placeholder={reasonPlaceholder}
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                  style={{ borderColor: "var(--color-outline)", background: "var(--color-surface)", color: "var(--color-on-surface)" }}
                  rows={4}
                  disabled={busy}
                />
                <div className="mt-1 text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                  {remaining} characters remaining
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm"
                style={{ border: "1px solid var(--color-outline)", color: "var(--color-on-surface)" }}
                onClick={handleClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button type="button" className="rounded-lg px-3 py-2 text-sm text-white disabled:opacity-60" style={{ background: confirmBg }} onClick={handleConfirm} disabled={busy}>
                {busy ? "Processing…" : confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
