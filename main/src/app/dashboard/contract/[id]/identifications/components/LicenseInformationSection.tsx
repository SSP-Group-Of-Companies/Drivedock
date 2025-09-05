"use client";

import React from "react";
import { useEditMode } from "../../components/EditModeContext";
import { ILicenseEntry, IFastCard } from "@/types/applicationForm.types";
import { ELicenseType, ECountryCode } from "@/types/shared.types";
import { Calendar, Building2, CreditCard, Plus, X } from "lucide-react";

interface LicenseInformationSectionProps {
  licenses: ILicenseEntry[];
  employeeNumber: string;
  hstNumber: string;
  businessNumber: string;
  fastCard?: IFastCard;
  onStage: (changes: any) => void;
  countryCode: ECountryCode;
}

export default function LicenseInformationSection({
  licenses,
  employeeNumber,
  hstNumber,
  businessNumber,
  fastCard,
  onStage,
  countryCode,
}: LicenseInformationSectionProps) {
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

  const formatInputDate = (date: string | Date) => {
    if (!date) return "";
    if (typeof date === "string") {
      try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return "";
        return dateObj.toISOString().split("T")[0];
      } catch {
        return "";
      }
    }
    return date.toISOString().split("T")[0];
  };

  return (
    <div
      className="rounded-xl border p-6 shadow-sm"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-outline)",
      }}
    >
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - License Details */}
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
                    Province/State
                  </label>
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
                    License Type
                  </label>
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
                    Expiry Date
                  </label>
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
                      className="w-full px-3 py-2 pr-10 border rounded-lg text-sm transition-colors"
                      style={{
                        background: isEditMode
                          ? "var(--color-surface)"
                          : "var(--color-surface-variant)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                    <Calendar
                      className="absolute right-3 top-2.5 h-4 w-4"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    />
                  </div>
                </div>
              </div>

              {/* Photo information - only primary license has photos */}
              {index === 0 ? (
                <div
                  className="text-xs"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Front and back photos are managed in the Image Gallery below
                </div>
              ) : (
                <div
                  className="text-xs"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Additional licenses do not require photos
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right Column - Business Information */}
        <div className="space-y-4">
          {/* Fast Card Information - Only for Canadians */}
          {countryCode === ECountryCode.CA && (
            <div
              className="p-4 rounded-lg border"
              style={{
                background: "var(--color-surface-variant)",
                borderColor: "var(--color-outline)",
              }}
            >
              <h3
                className="font-medium mb-3 flex items-center gap-2"
                style={{ color: "var(--color-on-surface)" }}
              >
                <CreditCard className="h-4 w-4" />
                Fast Card Information
              </h3>

              <div className="space-y-3">
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--color-on-surface-variant)" }}
                  >
                    Fast Card Number
                  </label>
                  <input
                    type="text"
                    value={fastCard?.fastCardNumber || ""}
                    onChange={(e) => {
                      onStage({
                        fastCard: {
                          ...fastCard,
                          fastCardNumber: e.target.value,
                        },
                      });
                    }}
                    disabled={!isEditMode}
                    placeholder="############"
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
                    Expiry Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formatInputDate(fastCard?.fastCardExpiry || "")}
                      onChange={(e) => {
                        onStage({
                          fastCard: {
                            ...fastCard,
                            fastCardExpiry: e.target.value,
                          },
                        });
                      }}
                      disabled={!isEditMode}
                      className="w-full px-3 py-2 pr-10 border rounded-lg text-sm transition-colors"
                      style={{
                        background: isEditMode
                          ? "var(--color-surface)"
                          : "var(--color-surface-variant)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                    <Calendar
                      className="absolute right-3 top-2.5 h-4 w-4"
                      style={{ color: "var(--color-on-surface-variant)" }}
                    />
                  </div>
                </div>

                <div
                  className="text-xs"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Front and back photos are managed in the Image Gallery below
                </div>
              </div>
            </div>
          )}

          {/* Business Information */}
          <div
            className="p-4 rounded-lg border"
            style={{
              background: "var(--color-surface-variant)",
              borderColor: "var(--color-outline)",
            }}
          >
            <h3
              className="font-medium mb-3 flex items-center gap-2"
              style={{ color: "var(--color-on-surface)" }}
            >
              <Building2 className="h-4 w-4" />
              Business Information
            </h3>

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
        </div>
      </div>
    </div>
  );
}
