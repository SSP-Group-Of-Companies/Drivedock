"use client";

import React from "react";
import { useEditMode } from "../../components/EditModeContext";
import { ILicenseEntry } from "@/types/applicationForm.types";
import { ELicenseType } from "@/types/shared.types";
import { Plus, X } from "lucide-react";
import { WithCopy } from "@/components/form/WithCopy";
import { formatInputDate } from "@/lib/utils/dateUtils";

interface DriverLicenseSectionProps {
  licenses: ILicenseEntry[];
  onStage: (changes: any) => void;
}

export default function DriverLicenseSection({
  licenses,
  onStage,
}: DriverLicenseSectionProps) {
  const { isEditMode } = useEditMode();

  const addLicense = () => {
    const newLicense: ILicenseEntry = {
      licenseNumber: "",
      licenseStateOrProvince: "",
      licenseType: ELicenseType.Other,
      licenseExpiry: "",
      licenseFrontPhoto: undefined,
      licenseBackPhoto: undefined,
    };

    const newLicenses = [...licenses, newLicense];
    onStage({ licenses: newLicenses });
  };

  const removeLicense = (index: number) => {
    // Never allow removing the first license (Primary - AZ)
    if (licenses.length > 1 && index > 0) {
      const newLicenses = licenses.filter((_, i) => i !== index);
      onStage({ licenses: newLicenses });
    }
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
        className="flex items-center gap-3 pb-2 border-b mb-6"
        style={{ borderColor: "var(--color-outline)" }}
      >
        <div
          className="w-1 h-8 rounded-full"
          style={{ background: "var(--color-primary)" }}
        />
        <h3 className="text-lg font-semibold" style={{ color: "var(--color-on-surface)" }}>
          Driver License
        </h3>
      </div>
      
      <div className="flex items-center justify-between mb-6">
        {/* Add License Button - Right Aligned */}
        {isEditMode && (
          <button
            type="button"
            onClick={addLicense}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-on-primary)",
            }}
          >
            <Plus className="w-4 h-4" />
            Add License
          </button>
        )}
      </div>

      <div className="space-y-4">
        {licenses.map((license, index) => (
          <div
            key={index}
            className="space-y-3 p-4 rounded-lg border relative"
            style={{
              background: "var(--color-surface-variant)",
              borderColor: "var(--color-outline)",
            }}
          >
            {/* Remove Button - Only show for additional licenses (not the first license at index 0) */}
            {isEditMode && licenses.length > 1 && index > 0 && (
              <button
                type="button"
                onClick={() => removeLicense(index)}
                className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors shadow-md"
                style={{
                  background: "var(--color-error)",
                  color: "white",
                }}
              >
                <X className="w-3 h-3" />
                Remove
              </button>
            )}

            <h3
              className="font-medium"
              style={{ color: "var(--color-on-surface)" }}
            >
              License {index + 1} {index === 0 && "(Primary - AZ)"}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  License Number
                </label>
                <WithCopy value={license.licenseNumber || ""} label="License number">
                  <input
                    type="text"
                    value={license.licenseNumber || ""}
                    onChange={(e) => {
                      const newLicenses = [...licenses];
                      newLicenses[index] = {
                        ...license,
                        licenseNumber: e.target.value,
                      };
                      onStage({ licenses: newLicenses });
                    }}
                    disabled={!isEditMode}
                    className="w-full px-3 py-2 border rounded-lg text-sm transition-colors pr-10"
                    style={{
                      background: isEditMode
                        ? "var(--color-surface)"
                        : "var(--color-surface-variant)",
                      borderColor: "var(--color-outline)",
                      color: "var(--color-on-surface)",
                    }}
                  />
                </WithCopy>
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Province/State
                </label>
                <WithCopy value={license.licenseStateOrProvince || ""} label="Province/State">
                  <input
                    type="text"
                    value={license.licenseStateOrProvince || ""}
                    onChange={(e) => {
                      const newLicenses = [...licenses];
                      newLicenses[index] = {
                        ...license,
                        licenseStateOrProvince: e.target.value,
                      };
                      onStage({ licenses: newLicenses });
                    }}
                    disabled={!isEditMode}
                    className="w-full px-3 py-2 border rounded-lg text-sm transition-colors pr-10"
                    style={{
                      background: isEditMode
                        ? "var(--color-surface)"
                        : "var(--color-surface-variant)",
                      borderColor: "var(--color-outline)",
                      color: "var(--color-on-surface)",
                    }}
                  />
                </WithCopy>
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  License Type
                </label>
                <WithCopy value={license.licenseType || ""} label="License type">
                  <input
                    type="text"
                    value={license.licenseType || ""}
                    onChange={(e) => {
                      const newLicenses = [...licenses];
                      newLicenses[index] = {
                        ...license,
                        licenseType: e.target.value as ELicenseType,
                      };
                      onStage({ licenses: newLicenses });
                    }}
                    disabled={!isEditMode}
                    className="w-full px-3 py-2 border rounded-lg text-sm transition-colors pr-10"
                    style={{
                      background: isEditMode
                        ? "var(--color-surface)"
                        : "var(--color-surface-variant)",
                      borderColor: "var(--color-outline)",
                      color: "var(--color-on-surface)",
                    }}
                  />
                </WithCopy>
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Expiry Date
                </label>
                <WithCopy value={formatInputDate(license.licenseExpiry) || ""} label="Expiry date">
                  <div className="relative">
                    <input
                      type="date"
                      value={formatInputDate(license.licenseExpiry)}
                      onChange={(e) => {
                        const newLicenses = [...licenses];
                        newLicenses[index] = {
                          ...license,
                          licenseExpiry: e.target.value,
                        };
                        onStage({ licenses: newLicenses });
                      }}
                      disabled={!isEditMode}
                      className="w-full px-3 py-2 border rounded-lg text-sm transition-colors pr-10"
                      style={{
                        background: isEditMode
                          ? "var(--color-surface)"
                          : "var(--color-surface-variant)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                  </div>
                </WithCopy>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
