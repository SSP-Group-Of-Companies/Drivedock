// src/app/dashboard/invitations/[id]/components/ApproveRejectBar.tsx
"use client";

import { useMemo, useState } from "react";
import ConfirmModal from "./ConfirmModal";
import { COMPANIES, ECompanyId } from "@/constants/companies";
import { ECountryCode } from "@/types/shared.types";

function CompanySelect({ value, onChange, countryCode }: { value?: string; onChange: (v: string) => void; countryCode?: ECountryCode | null }) {
  const options = useMemo(() => {
    const list = countryCode ? COMPANIES.filter((c) => c.countryCode === countryCode) : COMPANIES;
    return list.map((c) => ({ id: c.id, name: c.name }));
  }, [countryCode]);
  return (
    <select
      className="rounded-md border px-2 py-1 text-sm w-full"
      style={{ borderColor: "var(--color-outline)", background: "var(--color-surface)", color: "var(--color-on-surface)" }}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        Select company
      </option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

function ApplicationTypeSelect({ value, onChange, visible }: { value?: string; onChange: (v: string) => void; visible: boolean }) {
  if (!visible) return null;
  return (
    <select
      className="rounded-md border px-2 py-1 text-sm w-full"
      style={{ borderColor: "var(--color-outline)", background: "var(--color-surface)", color: "var(--color-on-surface)" }}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        Select application type
      </option>
      <option value="FLAT_BED">Flatbed</option>
      <option value="DRY_VAN">Dry Van</option>
    </select>
  );
}

export default function ApproveRejectBar({
  busy,
  onApprove,
  onReject,
  countryCode,
}: {
  busy: "approve" | "reject" | null;
  onApprove: (opts: { companyId: string; applicationType?: string }) => Promise<void> | void;
  onReject: (reason?: string) => Promise<void> | void;
  countryCode?: ECountryCode | null;
}) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string>("");
  const [applicationType, setApplicationType] = useState<string>("");
  const showAppType = companyId === ECompanyId.SSP_CA;

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

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="w-64">
            <CompanySelect value={companyId} onChange={setCompanyId} countryCode={countryCode} />
          </div>
          <div className="w-56">
            <ApplicationTypeSelect visible={showAppType} value={applicationType} onChange={setApplicationType} />
          </div>
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
            disabled={busy === "reject" || busy === "approve" || !companyId || (showAppType && !applicationType)}
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
          await onApprove({ companyId, applicationType: showAppType ? applicationType || undefined : undefined });
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
