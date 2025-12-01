"use client";

import React from "react";
import { Stethoscope } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IMedicalCertificateDetails } from "@/types/applicationForm.types";
import { useEditMode } from "../../components/EditModeContext";

interface MedicalCertificationSectionProps {
  details?: IMedicalCertificateDetails;
  onStage: (changes: any) => void;
}

function normalizeDateForInput(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  if (typeof value === "string") {
    if (value.length >= 10) return value.slice(0, 10);
    return value;
  }
  return "";
}

export default function MedicalCertificationSection({
  details,
  onStage,
}: MedicalCertificationSectionProps) {
  const { t } = useTranslation("common");
  const { isEditMode } = useEditMode();

  const safeDetails: IMedicalCertificateDetails = {
    documentNumber: details?.documentNumber ?? "",
    issuingAuthority: details?.issuingAuthority ?? "",
    expiryDate: normalizeDateForInput(details?.expiryDate),
  };

  const handleChange = (
    field: keyof IMedicalCertificateDetails,
    value: string
  ) => {
    onStage({
      medicalCertificateDetails: {
        ...safeDetails,
        [field]: field === "expiryDate" ? value || null : value,
      },
    });
  };

  return (
    <div
      className="rounded-xl border p-6 shadow-sm"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-outline)",
      }}
    >
      <div
        className="flex items-center gap-3 pb-2 border-b mb-4"
        style={{ borderColor: "var(--color-outline)" }}
      >
        <div
          className="w-1 h-8 rounded-full"
          style={{ background: "var(--color-secondary-container)" }}
        />
        <div
          className="flex items-center gap-2"
          style={{ color: "var(--color-on-surface)" }}
        >
          <Stethoscope className="h-4 w-4" />
          <h3 className="font-medium">Medical Certificate (US)</h3>
        </div>
      </div>

      <p
        className="text-xs mb-4"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        Medical certificate <strong>photos</strong> (1–2 PDFs) are managed in
        the Document Gallery. Use this section to record the certificate
        details.
      </p>

      <div className="space-y-4">
        {/* Document Number */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {t(
              "form.step2.page4.fields.medicalCert.documentNumber",
              "DOT Medical Certificate Document Number"
            )}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={safeDetails.documentNumber}
            disabled={!isEditMode}
            onChange={(e) => handleChange("documentNumber", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            style={{
              background: isEditMode
                ? "var(--color-surface)"
                : "var(--color-surface-variant)",
              borderColor: "var(--color-outline)",
              color: "var(--color-on-surface)",
            }}
          />
        </div>

        {/* Issuing Authority */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {t(
              "form.step2.page4.fields.medicalCert.issuingAuthority",
              "DOT Medical Certificate Issuing Authority"
            )}{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={safeDetails.issuingAuthority}
            disabled={!isEditMode}
            onChange={(e) => handleChange("issuingAuthority", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            style={{
              background: isEditMode
                ? "var(--color-surface)"
                : "var(--color-surface-variant)",
              borderColor: "var(--color-outline)",
              color: "var(--color-on-surface)",
            }}
          />
        </div>

        {/* Expiry Date (optional) */}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            {t(
              "form.step2.page4.fields.medicalCert.expiryDate",
              "DOT Medical Certificate Expiry Date (optional)"
            )}
          </label>
          <input
            type="date"
            value={safeDetails.expiryDate as string}
            disabled={!isEditMode}
            onChange={(e) => handleChange("expiryDate", e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
            style={{
              background: isEditMode
                ? "var(--color-surface)"
                : "var(--color-surface-variant)",
              borderColor: "var(--color-outline)",
              color: "var(--color-on-surface)",
            }}
          />
        </div>

        {!isEditMode && (
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Turn Edit Mode ON to modify medical certificate details.
          </p>
        )}
      </div>
    </div>
  );
}
