// src/app/dashboard/invitations/[id]/components/ApproveRejectBar.tsx
"use client";

import { useState } from "react";
import ConfirmModal from "./ConfirmModal";

export default function ApproveRejectBar({
  busy,
  onApprove,
  onReject,
}: {
  busy: "approve" | "reject" | null;
  onApprove: () => Promise<void> | void;
  onReject: (reason?: string) => Promise<void> | void;
}) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  return (
    <>
      <div
        className="rounded-xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-outline)",
          boxShadow: "var(--elevation-1)",
        }}
      >
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-on-surface)" }}>
            Invitation Review
          </h2>
          <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Approve to add this driver to onboarding, or reject to permanently delete the application and files.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRejectOpen(true)}
            disabled={busy === "reject" || busy === "approve"}
            className="rounded-lg px-3 py-2 text-sm text-white disabled:opacity-60"
            style={{ background: "var(--color-error)" }}
          >
            {busy === "reject" ? "Rejecting…" : "Reject"}
          </button>
          <button
            type="button"
            onClick={() => setApproveOpen(true)}
            disabled={busy === "reject" || busy === "approve"}
            className="rounded-lg px-3 py-2 text-sm text-white disabled:opacity-60"
            style={{ background: "var(--color-success)" }}
          >
            {busy === "approve" ? "Approving…" : "Approve"}
          </button>
        </div>
      </div>

      {/* Approve modal */}
      <ConfirmModal
        open={approveOpen}
        title="Approve Invitation"
        description="This will approve the invitation and add this driver to the onboarding process."
        confirmText="Approve"
        tone="success"
        busy={busy === "approve"}
        onClose={() => setApproveOpen(false)}
        onConfirm={async () => {
          await onApprove();
          setApproveOpen(false);
        }}
      />

      {/* Reject modal with optional reason */}
      <ConfirmModal
        open={rejectOpen}
        title="Reject Invitation"
        description="This will reject the invitation and delete ALL related documents and photos from the system (MongoDB and S3). This action cannot be undone."
        confirmText="Reject"
        tone="danger"
        includeReason
        reasonLabel="Rejection reason (optional)"
        reasonPlaceholder="e.g., Incomplete information, not eligible, duplicate submission, etc."
        busy={busy === "reject"}
        onClose={() => setRejectOpen(false)}
        onConfirm={async (reason?: string) => {
          await onReject(reason);
          setRejectOpen(false);
        }}
      />
    </>
  );
}
