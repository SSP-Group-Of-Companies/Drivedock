"use client";

import React, { useState, useEffect } from "react";
import { useEditMode } from "../../components/EditModeContext";
import { type ITruckDetails } from "@/types/applicationForm.types";
import { Truck } from "lucide-react";

interface TruckDetailsSectionProps {
  truckDetails?: ITruckDetails;
  onStage: (changes: Record<string, any>) => void;
  highlight?: boolean;
}

export default function TruckDetailsSection({
  truckDetails,
  onStage,
  highlight = false,
}: TruckDetailsSectionProps) {
  const { isEditMode } = useEditMode();
  const [showHighlight, setShowHighlight] = useState(highlight);

  // auto-hide highlight after a short moment
  useEffect(() => {
    if (!highlight) return;
    setShowHighlight(true);
    const t = setTimeout(() => setShowHighlight(false), 3000);
    return () => clearTimeout(t);
  }, [highlight]);

  const handleFieldChange = (field: keyof ITruckDetails, value: string) => {
    const newData = { ...truckDetails, [field]: value };
    onStage({ truckDetails: newData });
  };

  if (!isEditMode) {
    // View mode - show data if any exists
    const hasAnyData = truckDetails
      ? Object.values(truckDetails).some(
          (value) => value && value.trim() !== ""
        )
      : false;

    if (!hasAnyData) {
      return (
        <div
          className={
            showHighlight
              ? "ssp-ring-wrapper rounded-xl p-[6px] ssp-animated-ring"
              : ""
          }
        >
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
                style={{ background: "var(--color-primary-container)" }}
              />
              <div
                className="flex items-center gap-2"
                style={{ color: "var(--color-on-surface)" }}
              >
                <Truck className="h-4 w-4" />
                <h3 className="text-lg font-semibold">Truck Details</h3>
              </div>
            </div>
            <p
              className="italic"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              No truck details have been provided
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        className={
          showHighlight
            ? "ssp-ring-wrapper rounded-xl p-[6px] ssp-animated-ring"
            : ""
        }
      >
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
              style={{ background: "var(--color-primary-container)" }}
            />
            <h3
              className="text-lg font-semibold"
              style={{ color: "var(--color-on-surface)" }}
            >
              Truck Details
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {truckDetails?.vin && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  VIN
                </label>
                <p style={{ color: "var(--color-on-surface)" }}>
                  {truckDetails.vin}
                </p>
              </div>
            )}
            {truckDetails?.make && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Make
                </label>
                <p style={{ color: "var(--color-on-surface)" }}>
                  {truckDetails.make}
                </p>
              </div>
            )}
            {truckDetails?.model && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Model
                </label>
                <p style={{ color: "var(--color-on-surface)" }}>
                  {truckDetails.model}
                </p>
              </div>
            )}
            {truckDetails?.year && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Year
                </label>
                <p style={{ color: "var(--color-on-surface)" }}>
                  {truckDetails.year}
                </p>
              </div>
            )}
            {truckDetails?.province && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Province
                </label>
                <p style={{ color: "var(--color-on-surface)" }}>
                  {truckDetails.province}
                </p>
              </div>
            )}
            {truckDetails?.truckUnitNumber && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Truck/Unit No
                </label>
                <p style={{ color: "var(--color-on-surface)" }}>
                  {truckDetails.truckUnitNumber}
                </p>
              </div>
            )}
            {truckDetails?.plateNumber && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Plate No
                </label>
                <p style={{ color: "var(--color-on-surface)" }}>
                  {truckDetails.plateNumber}
                </p>
              </div>
            )}
            {truckDetails?.employeeNumber && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  Employee Number
                </label>
                <p style={{ color: "var(--color-on-surface)" }}>
                  {truckDetails.employeeNumber}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div
      className={
        showHighlight
          ? "ssp-ring-wrapper rounded-xl p-[6px] ssp-animated-ring"
          : ""
      }
    >
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
            style={{ background: "var(--color-primary-container)" }}
          />
          <div
            className="flex items-center gap-2"
            style={{ color: "var(--color-on-surface)" }}
          >
            <Truck className="h-4 w-4" />
            <h3 className="text-lg font-semibold">Truck Details</h3>
          </div>
        </div>
        <p
          className="text-sm mb-4"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          All truck details are optional and can be filled by the safety admin
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              VIN
            </label>
            <input
              type="text"
              value={truckDetails?.vin || ""}
              onChange={(e) => handleFieldChange("vin", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm transition-colors"
              style={{
                borderColor: "var(--color-outline)",
                background: "var(--color-surface)",
                color: "var(--color-on-surface)",
              }}
              placeholder="Enter VIN"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Make
            </label>
            <input
              type="text"
              value={truckDetails?.make}
              onChange={(e) => handleFieldChange("make", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm transition-colors"
              style={{
                borderColor: "var(--color-outline)",
                background: "var(--color-surface)",
                color: "var(--color-on-surface)",
              }}
              placeholder="Enter Make"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Model
            </label>
            <input
              type="text"
              value={truckDetails?.model}
              onChange={(e) => handleFieldChange("model", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm transition-colors"
              style={{
                borderColor: "var(--color-outline)",
                background: "var(--color-surface)",
                color: "var(--color-on-surface)",
              }}
              placeholder="Enter Model"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Year
            </label>
            <input
              type="text"
              value={truckDetails?.year}
              onChange={(e) => handleFieldChange("year", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm transition-colors"
              style={{
                borderColor: "var(--color-outline)",
                background: "var(--color-surface)",
                color: "var(--color-on-surface)",
              }}
              placeholder="Enter Year"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Province
            </label>
            <input
              type="text"
              value={truckDetails?.province}
              onChange={(e) => handleFieldChange("province", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm transition-colors"
              style={{
                borderColor: "var(--color-outline)",
                background: "var(--color-surface)",
                color: "var(--color-on-surface)",
              }}
              placeholder="Enter Province"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Truck/Unit No
            </label>
            <input
              type="text"
              value={truckDetails?.truckUnitNumber}
              onChange={(e) =>
                handleFieldChange("truckUnitNumber", e.target.value)
              }
              className="w-full px-3 py-2 border rounded-lg text-sm transition-colors"
              style={{
                borderColor: "var(--color-outline)",
                background: "var(--color-surface)",
                color: "var(--color-on-surface)",
              }}
              placeholder="Enter Truck/Unit No"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Plate No
            </label>
            <input
              type="text"
              value={truckDetails?.plateNumber}
              onChange={(e) => handleFieldChange("plateNumber", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm transition-colors"
              style={{
                borderColor: "var(--color-outline)",
                background: "var(--color-surface)",
                color: "var(--color-on-surface)",
              }}
              placeholder="Enter Plate No"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Employee Number
            </label>
            <input
              type="text"
              value={truckDetails?.employeeNumber}
              onChange={(e) => handleFieldChange("employeeNumber", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm transition-colors"
              style={{
                borderColor: "var(--color-outline)",
                background: "var(--color-surface)",
                color: "var(--color-on-surface)",
              }}
              placeholder="Enter Employee Number"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
