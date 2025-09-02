"use client";

import { Check } from "lucide-react";

interface OptionalsSectionProps {
  data: {
    canDriveManual: boolean;
    faultAccidentIn3Years: boolean;
    zeroPointsOnAbstract: boolean;
    noUnpardonedCriminalRecord: boolean;
    canCrossBorderUSA?: boolean;
    hasFASTCard?: boolean;
  };
}

export default function OptionalsSection({ data }: OptionalsSectionProps) {
  const questions = [
    {
      key: "canDriveManual",
      label: "Can you Drive Manual Transmission?",
      value: data.canDriveManual,
    },
    {
      key: "faultAccidentIn3Years",
      label: "Do you have any at fault accident in the past 3 years?",
      value: data.faultAccidentIn3Years,
    },
    {
      key: "zeroPointsOnAbstract",
      label: "Do you have more than 0 points on your driver's abstract?",
      value: data.zeroPointsOnAbstract,
    },
    {
      key: "noUnpardonedCriminalRecord",
      label:
        "Do you have any criminal record for which pardon has not been granted?",
      value: data.noUnpardonedCriminalRecord,
    },
    {
      key: "canCrossBorderUSA",
      label: "Can you cross borders into USA?",
      value: data.canCrossBorderUSA,
    },
    {
      key: "hasFASTCard",
      label: "Do you have FAST card?",
      value: data.hasFASTCard,
    },
  ];

  return (
    <div className="space-y-4">
      <div
        className="flex items-center gap-3 pb-2 border-b"
        style={{ borderColor: "var(--color-outline-variant)" }}
      >
        <div
          className="w-2 h-8 rounded-full"
          style={{ background: "var(--color-primary)" }}
        ></div>
        <h3
          className="text-xl font-bold"
          style={{ color: "var(--color-on-surface)" }}
        >
          Optionals
        </h3>
      </div>
      <div className="space-y-3">
        {questions.map((question) => (
          <div
            key={question.key}
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
              <div
                className="flex items-center justify-center w-6 h-6 rounded border-2"
                style={{
                  borderColor:
                    question.value === true
                      ? "var(--color-success)"
                      : question.value === false
                      ? "var(--color-error)"
                      : "var(--color-outline-variant)",
                  background:
                    question.value === true
                      ? "var(--color-success)"
                      : question.value === false
                      ? "var(--color-error)"
                      : "var(--color-surface-variant)",
                }}
              >
                {question.value === true && (
                  <Check className="w-4 h-4 text-white" />
                )}
                {question.value === false && (
                  <span className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <span
                className="text-sm font-medium min-w-[40px]"
                style={{ color: "var(--color-on-surface)" }}
              >
                {question.value === true
                  ? "Yes"
                  : question.value === false
                  ? "No"
                  : "N/A"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
