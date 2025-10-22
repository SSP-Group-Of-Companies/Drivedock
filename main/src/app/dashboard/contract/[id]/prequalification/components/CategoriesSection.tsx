"use client";

import { Check } from "lucide-react";

interface CategoriesSectionProps {
  data: {
    driverType: string;
    haulPreference: string;
    teamStatus: string;
    flatbedExperience: boolean;
  };
  staged: any;
  onStage: (changes: any) => void;
  isEditMode: boolean;
}

export default function CategoriesSection({ data, staged, onStage, isEditMode }: CategoriesSectionProps) {
  // Helper function to get current value (staged or original)
  const getCurrentValue = (field: string) => {
    return staged[field] !== undefined ? staged[field] : data[field as keyof typeof data];
  };

  // Helper function to update a field
  const updateField = (field: string, value: any) => {
    onStage({ [field]: value });
  };

  const questions = [
    {
      key: "driverType",
      label: "Which Driver are you?",
      type: "choice" as const,
      options: ["Company", "Owner Operator", "Owner Driver"],
      value: getCurrentValue("driverType"),
    },
    {
      key: "haulPreference",
      label: "Which do you prefer?",
      type: "choice" as const,
      options: ["Short Haul", "Long Haul"],
      value: getCurrentValue("haulPreference"),
    },
    {
      key: "teamStatus",
      label: "Are you part of a Team or No?",
      type: "choice" as const,
      options: ["Team", "Single"],
      value: getCurrentValue("teamStatus"),
    },
    {
      key: "flatbedExperience",
      label: "Do you have flatbed Experience?",
      type: "boolean" as const,
      value: getCurrentValue("flatbedExperience"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: "var(--color-outline-variant)" }}>
        <div className="w-2 h-8 rounded-full" style={{ background: "var(--color-success)" }}></div>
        <h3 className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>Categories</h3>
      </div>
      <div className="space-y-3">
        {questions.map((question) => (
          <div
            key={question.key}
            className="p-4 rounded-xl border transition-all duration-200 hover:shadow-sm"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-outline)",
            }}
          >
            <div className="mb-2">
              <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                {question.label}
              </span>
            </div>
            
            {isEditMode ? (
              question.type === "choice" ? (
                <div className="flex flex-wrap gap-3">
                  {question.options.map((option) => (
                    <button
                      key={option}
                      onClick={() => updateField(question.key, option)}
                      className="px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 cursor-pointer"
                      style={{
                        background: question.value === option 
                          ? "var(--color-success)" 
                          : "var(--color-surface-variant)",
                        color: question.value === option 
                          ? "white" 
                          : "var(--color-on-surface-variant)",
                        borderColor: question.value === option 
                          ? "var(--color-success)" 
                          : "var(--color-outline-variant)",
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={question.key}
                      value="true"
                      checked={question.value === true}
                      onChange={() => updateField(question.key, true)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={question.key}
                      value="false"
                      checked={question.value === false}
                      onChange={() => updateField(question.key, false)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              )
            ) : (
              question.type === "choice" ? (
                <div className="flex flex-wrap gap-3">
                  {question.options.map((option) => (
                    <div
                      key={option}
                      className="px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200"
                      style={{
                        background: question.value === option 
                          ? "var(--color-success)" 
                          : "var(--color-surface-variant)",
                        color: question.value === option 
                          ? "white" 
                          : "var(--color-on-surface-variant)",
                        borderColor: question.value === option 
                          ? "var(--color-success)" 
                          : "var(--color-outline-variant)",
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded border-2" style={{
                    borderColor: question.value === true 
                      ? "var(--color-success)" 
                      : "var(--color-error)",
                    background: question.value === true 
                      ? "var(--color-success)" 
                      : "var(--color-error)",
                  }}>
                    {question.value === true && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                    {question.value === false && (
                      <span className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="text-sm font-medium" style={{ color: "var(--color-on-surface)" }}>
                    {question.value === true ? 'Yes' : 'No'}
                  </span>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
