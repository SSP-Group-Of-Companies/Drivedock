"use client";

import { IApplicationFormPage1 } from "@/types/applicationForm.types";

interface PlaceOfBirthSectionProps {
  data: IApplicationFormPage1;
  isEditMode: boolean;
  staged: any;
  onStage: (changes: any) => void;
}

export default function PlaceOfBirthSection({
  data,
  isEditMode,
  staged,
  onStage,
}: PlaceOfBirthSectionProps) {
  // Merge staged changes with original data for display
  const formData = { ...data, ...staged };

  const updateField = (field: keyof typeof formData, value: string) => {
    onStage({ [field]: value });
  };

  return (
    <div className="space-y-4">
      <div
        className="flex items-center gap-3 pb-2 border-b"
        style={{ borderColor: "var(--color-outline-variant)" }}
      >
        <div
          className="w-2 h-8 rounded-full"
          style={{ background: "var(--color-secondary)" }}
        ></div>
        <h3
          className="text-xl font-bold"
          style={{ color: "var(--color-on-surface)" }}
        >
          Place of Birth
        </h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            City of Birth
          </label>
          {isEditMode ? (
            <input
              type="text"
              value={formData.birthCity || ""}
              onChange={(e) => updateField("birthCity", e.target.value)}
              className="w-full p-3 rounded-lg border text-sm transition-colors"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
                color: "var(--color-on-surface)",
              }}
              placeholder="Enter city of birth"
            />
          ) : (
            <div
              className="p-3 rounded-lg border"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
              }}
            >
              <span
                className="text-sm"
                style={{ color: "var(--color-on-surface)" }}
              >
                {formData.birthCity || "Not provided"}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            State or Province
          </label>
          {isEditMode ? (
            <input
              type="text"
              value={formData.birthStateOrProvince || ""}
              onChange={(e) =>
                updateField("birthStateOrProvince", e.target.value)
              }
              className="w-full p-3 rounded-lg border text-sm transition-colors"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
                color: "var(--color-on-surface)",
              }}
              placeholder="Enter province or state of birth"
            />
          ) : (
            <div
              className="p-3 rounded-lg border"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
              }}
            >
              <span
                className="text-sm"
                style={{ color: "var(--color-on-surface)" }}
              >
                {formData.birthStateOrProvince || "Not provided"}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Country of Birth
          </label>
          {isEditMode ? (
            <input
              type="text"
              value={formData.birthCountry || ""}
              onChange={(e) => updateField("birthCountry", e.target.value)}
              className="w-full p-3 rounded-lg border text-sm transition-colors"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
                color: "var(--color-on-surface)",
              }}
              placeholder="Enter country of birth"
            />
          ) : (
            <div
              className="p-3 rounded-lg border"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
              }}
            >
              <span
                className="text-sm"
                style={{ color: "var(--color-on-surface)" }}
              >
                {formData.birthCountry || "Not provided"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
