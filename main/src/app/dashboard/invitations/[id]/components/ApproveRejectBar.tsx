// src/app/dashboard/invitations/[id]/components/ApproveRejectBar.tsx
"use client";

import { useMemo, useState } from "react";
import ConfirmModal from "./ConfirmModal";
import {
  COMPANIES,
  getCompanyById,
  ECompanyApplicationType,
  type Company,
} from "@/constants/companies";
import { ECountryCode } from "@/types/shared.types";

function CompanySelect({
  value,
  onChange,
  countryCode,
}: {
  value?: string;
  onChange: (v: string) => void;
  countryCode?: ECountryCode | null;
}) {
  const options = useMemo(() => {
    const list = countryCode
      ? COMPANIES.filter((c) => c.countryCode === countryCode)
      : COMPANIES;
    return list.map((c) => ({ id: c.id, name: c.name }));
  }, [countryCode]);

  return (
    <select
      className="rounded-md border px-2 py-1 text-sm w-full"
      style={{
        borderColor: "var(--color-outline)",
        background: "var(--color-surface)",
        color: "var(--color-on-surface)",
      }}
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

function ApplicationTypeSelect({
  value,
  onChange,
  company,
}: {
  value?: string;
  onChange: (v: string) => void;
  company?: Company | null;
}) {
  // Only show if the company exists and has dry-van operations.
  // Backend requires applicationType whenever hasDryVan === true.
  if (!company || !company.hasDryVan) return null;

  // Build options from company capabilities:
  const options: { value: ECompanyApplicationType; label: string }[] = [];

  if (company.hasFlatbed) {
    options.push({
      value: ECompanyApplicationType.FLATBED,
      label: "Flatbed",
    });
  }

  if (company.hasDryVan) {
    options.push({
      value: ECompanyApplicationType.DRY_VAN,
      label: "Dry Van",
    });
  }

  return (
    <select
      className="rounded-md border px-2 py-1 text-sm w-full"
      style={{
        borderColor: "var(--color-outline)",
        background: "var(--color-surface)",
        color: "var(--color-on-surface)",
      }}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        Select application type
      </option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
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
  onApprove: (opts: {
    companyId: string;
    applicationType?: string;
  }) => Promise<void> | void;
  onReject: (reason?: string) => Promise<void> | void;
  countryCode?: ECountryCode | null;
}) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [companyId, setCompanyId] = useState<string>("");
  const [applicationType, setApplicationType] = useState<string>("");

  const selectedCompany = useMemo(
    () => (companyId ? getCompanyById(companyId) : undefined),
    [companyId]
  );

  // Companies with dry-van operations require applicationType (SSP_CA, SSP_US, etc.)
  const requiresApplicationType = !!selectedCompany?.hasDryVan;

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
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--color-on-surface)" }}
          >
            Invitation Review
          </h2>
          <p
            className="text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Approve to add this driver to onboarding, or reject to permanently
            delete the application and files.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="w-64">
            <CompanySelect
              value={companyId}
              onChange={(id) => {
                setCompanyId(id);
                // If we change company, and the new company does not support current type,
                // we keep it simple and let the user re-select if needed.
                setApplicationType("");
              }}
              countryCode={countryCode}
            />
          </div>

          <div className="w-56">
            <ApplicationTypeSelect
              company={selectedCompany || null}
              value={applicationType}
              onChange={setApplicationType}
            />
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
            disabled={
              busy === "reject" ||
              busy === "approve" ||
              !companyId ||
              (requiresApplicationType && !applicationType)
            }
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
          await onApprove({
            companyId,
            applicationType:
              requiresApplicationType && applicationType
                ? applicationType
                : undefined,
          });
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
