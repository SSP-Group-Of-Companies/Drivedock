"use client";

import React from "react";
import { Check } from "lucide-react";

interface AdditionalInfoData {
  deniedLicenseOrPermit: boolean;
  suspendedOrRevoked: boolean;
  suspensionNotes?: string;
  testedPositiveOrRefused: boolean;
  completedDOTRequirements: boolean;
  hasAccidentalInsurance: boolean;
}

interface AdditionalInfoSectionProps {
  data: AdditionalInfoData;
  isEditMode: boolean;
  staged: any;
  onStage: (changes: Record<string, any>) => void;
}

export default function AdditionalInfoSection({
  data,
  isEditMode,
  staged,
  onStage,
}: AdditionalInfoSectionProps) {
  // Merge staged changes with original data for display (same pattern as other pages)
  const formData = { ...data, ...staged };

  const handleBooleanChange = (
    field: keyof AdditionalInfoData,
    value: boolean
  ) => {
    onStage({ [field]: value });
  };

  const handleTextChange = (field: keyof AdditionalInfoData, value: string) => {
    onStage({ [field]: value });
  };

  const booleanQuestions = [
    {
      key: "deniedLicenseOrPermit" as keyof AdditionalInfoData,
      label: "Have you ever been denied a license or permit?",
    },
    {
      key: "suspendedOrRevoked" as keyof AdditionalInfoData,
      label: "Have you ever had your license suspended or revoked?",
    },
    {
      key: "testedPositiveOrRefused" as keyof AdditionalInfoData,
      label: "Have you ever tested positive or refused a drug/alcohol test?",
    },
    {
      key: "completedDOTRequirements" as keyof AdditionalInfoData,
      label: "Have you completed all DOT requirements?",
    },
    {
      key: "hasAccidentalInsurance" as keyof AdditionalInfoData,
      label: "Do you have accidental insurance?",
    },
  ];

  return (
    <section
      className="space-y-6 border p-6 rounded-2xl shadow-sm"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-outline)",
      }}
    >
      <div
        className="flex items-center gap-3 pb-2 border-b"
        style={{ borderColor: "var(--color-outline)" }}
      >
        <div
          className="w-1 h-8 rounded-full"
          style={{ background: "var(--color-success)" }}
        />
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--color-on-surface)" }}
        >
          Additional Information
        </h2>
      </div>

      {/* Boolean Questions */}
      <div className="space-y-3">
        {booleanQuestions.map((question) => (
          <div key={question.key}>
            <div
              className="flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:shadow-sm"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
              }}
            >
              <span
                className="text-sm flex-1 pr-4"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                {question.label}
              </span>
              <div className="flex items-center gap-2">
                {isEditMode ? (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`${question.key}`}
                        value="true"
                        checked={formData[question.key] === true}
                        onChange={() => handleBooleanChange(question.key, true)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`${question.key}`}
                        value="false"
                        checked={formData[question.key] === false}
                        onChange={() => handleBooleanChange(question.key, false)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                ) : (
                  <>
                    <div
                      className="flex items-center justify-center w-6 h-6 rounded border-2"
                      style={{
                        borderColor:
                          formData[question.key] === true
                            ? "var(--color-success)"
                            : formData[question.key] === false
                            ? "var(--color-error)"
                            : "var(--color-outline-variant)",
                        background:
                          formData[question.key] === true
                            ? "var(--color-success)"
                            : formData[question.key] === false
                            ? "var(--color-error)"
                            : "var(--color-surface-variant)",
                      }}
                    >
                      {formData[question.key] === true && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                      {formData[question.key] === false && (
                        <span className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <span
                      className="text-sm font-medium min-w-[40px]"
                      style={{ color: "var(--color-on-surface)" }}
                    >
                      {formData[question.key] === true
                        ? "Yes"
                        : formData[question.key] === false
                        ? "No"
                        : "Not specified"}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Suspension Notes - Show directly after suspendedOrRevoked question */}
            {question.key === "suspendedOrRevoked" &&
              formData.suspendedOrRevoked === true && (
                <div
                  className="mt-3 ml-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-sm"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h4
                      className="text-sm font-medium"
                      style={{ color: "var(--color-on-surface)" }}
                    >
                      Suspension Notes
                    </h4>
                  </div>

                  {isEditMode ? (
                    <textarea
                      value={formData.suspensionNotes ?? ""}
                      onChange={(e) =>
                        handleTextChange("suspensionNotes", e.target.value)
                      }
                      placeholder="Please provide details about the suspension or revocation..."
                      rows={3}
                      className="w-full py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors resize-none"
                      style={{
                        background: "var(--color-surface)",
                        borderColor: "var(--color-outline)",
                        color: "var(--color-on-surface)",
                      }}
                    />
                  ) : (
                    <div
                      className="py-2 px-3 min-h-[60px]"
                      style={{ color: "var(--color-on-surface)" }}
                    >
                      {formData.suspensionNotes ?? "No notes provided"}
                    </div>
                  )}
                </div>
              )}
          </div>
        ))}
      </div>
    </section>
  );
}