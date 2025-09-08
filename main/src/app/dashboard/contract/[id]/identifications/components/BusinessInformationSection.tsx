"use client";

import React from "react";
import { useEditMode } from "../../components/EditModeContext";
import { Building2 } from "lucide-react";

interface BusinessInformationSectionProps {
  employeeNumber: string;
  hstNumber: string;
  businessName: string;
  businessNumber: string;
  onStage: (changes: any) => void;
}

export default function BusinessInformationSection({
  employeeNumber,
  hstNumber,
  businessName,
  businessNumber,
  onStage,
}: BusinessInformationSectionProps) {
  const { isEditMode } = useEditMode();

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
          <Building2 className="h-4 w-4" />
          <h3 className="font-medium">Business Information</h3>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Employee Number
          </label>
          <input
            type="text"
            value={employeeNumber || ""}
            onChange={(e) => onStage({ employeeNumber: e.target.value })}
            disabled={!isEditMode}
            className="w-full px-3 py-2 border rounded-lg text-sm transition-colors"
            style={{
              background: isEditMode
                ? "var(--color-surface)"
                : "var(--color-surface-variant)",
              borderColor: "var(--color-outline)",
              color: "var(--color-on-surface)",
            }}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            HST Number
          </label>
          <input
            type="text"
            value={hstNumber || ""}
            onChange={(e) => onStage({ hstNumber: e.target.value })}
            disabled={!isEditMode}
            className="w-full px-3 py-2 border rounded-lg text-sm transition-colors"
            style={{
              background: isEditMode
                ? "var(--color-surface)"
                : "var(--color-surface-variant)",
              borderColor: "var(--color-outline)",
              color: "var(--color-on-surface)",
            }}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Business Name
          </label>
          <input
            type="text"
            value={businessName || ""}
            onChange={(e) => onStage({ businessName: e.target.value })}
            disabled={!isEditMode}
            className="w-full px-3 py-2 border rounded-lg text-sm transition-colors"
            style={{
              background: isEditMode
                ? "var(--color-surface)"
                : "var(--color-surface-variant)",
              borderColor: "var(--color-outline)",
              color: "var(--color-on-surface)",
            }}
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium mb-1"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Business Number
          </label>
          <input
            type="text"
            value={businessNumber || ""}
            onChange={(e) => onStage({ businessNumber: e.target.value })}
            disabled={!isEditMode}
            className="w-full px-3 py-2 border rounded-lg text-sm transition-colors"
            style={{
              background: isEditMode
                ? "var(--color-surface)"
                : "var(--color-surface-variant)",
              borderColor: "var(--color-outline)",
              color: "var(--color-on-surface)",
            }}
          />
        </div>

        <div
          className="text-xs"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          Business documents are managed in the Image Gallery below
        </div>
      </div>
    </div>
  );
}
