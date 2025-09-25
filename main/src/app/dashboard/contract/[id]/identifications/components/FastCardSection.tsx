"use client";

import React from "react";
import { useEditMode } from "../../components/EditModeContext";
import { IFastCard } from "@/types/applicationForm.types";
import { ECountryCode } from "@/types/shared.types";
import { CreditCard } from "lucide-react";

interface FastCardSectionProps {
  fastCard?: IFastCard;
  onStage: (changes: any) => void;
  countryCode: ECountryCode;
}

export default function FastCardSection({
  fastCard,
  onStage,
  countryCode,
}: FastCardSectionProps) {
  const { isEditMode } = useEditMode();

  const formatInputDate = (date: string | Date | undefined): string => {
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

  // Only show for Canadian drivers
  if (countryCode !== ECountryCode.CA) {
    return null;
  }

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
          style={{ background: "var(--color-secondary)" }}
        />
        <div
          className="flex items-center gap-2"
          style={{ color: "var(--color-on-surface)" }}
        >
          <CreditCard className="h-4 w-4" />
          <h3 className="font-medium">Fast Card Information</h3>
        </div>
      </div>

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
        </div>
      </div>
    </div>
  );
}
