"use client";

import React from "react";
import { IEducation } from "@/types/applicationForm.types";

interface EducationSectionProps {
  data: IEducation;
  isEditMode: boolean;
  staged: any;
  onStage: (changes: Record<string, any>) => void;
}

export default function EducationSection({
  data,
  isEditMode,
  staged,
  onStage,
}: EducationSectionProps) {
  // Merge staged changes with original data for display (same pattern as other pages)
  const formData = { ...data, ...staged };

  const handleChange = (field: keyof IEducation, value: number) => {
    onStage({ [field]: value });
  };

  const educationFields = [
    {
      key: "gradeSchool" as keyof IEducation,
      label: "Grade School",
      value: formData.gradeSchool,
    },
    {
      key: "college" as keyof IEducation,
      label: "College",
      value: formData.college,
    },
    {
      key: "postGraduate" as keyof IEducation,
      label: "Post Graduate",
      value: formData.postGraduate,
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
          style={{ background: "var(--color-primary)" }}
        />
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--color-on-surface)" }}
        >
          Education
        </h2>
        <span
          className="text-sm"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          (Years Completed)
        </span>
      </div>

      <div className="space-y-4">
        {educationFields.map((field) => (
          <div
            key={field.key}
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
              {field.label}
            </span>
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={field.value || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || value === "0") {
                      // Clear the field if empty or 0
                      handleChange(field.key, 0);
                    } else {
                      const parsedValue = parseInt(value);
                      if (
                        !isNaN(parsedValue) &&
                        parsedValue >= 0 &&
                        parsedValue <= 20
                      ) {
                        handleChange(field.key, parsedValue);
                      }
                    }
                  }}
                  className="w-20 py-2 px-3 rounded-md border focus:ring-2 focus:outline-none transition-colors text-center"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                />
              ) : (
                <div
                  className="w-20 py-2 px-3 rounded-md text-center font-medium"
                  style={{
                    background: "var(--color-surface-variant)",
                    color: "var(--color-on-surface)",
                  }}
                >
                  {field.value || 0}
                </div>
              )}
              <span
                className="text-sm font-medium"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                years
              </span>
            </div>
          </div>
        ))}
      </div>

      {!isEditMode && (
        <div className="text-center py-4">
          <p
            className="text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Total Education:{" "}
            {formData.gradeSchool + formData.college + formData.postGraduate}{" "}
            years
          </p>
        </div>
      )}
    </section>
  );
}
