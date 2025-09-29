"use client";

import { Check } from "lucide-react";
import { Company } from "@/constants/companies";

interface MandatorySectionProps {
  data: {
    over23Local: boolean;
    over25CrossBorder: boolean;
    experienceDrivingTractorTrailer: boolean;
    legalRightToWorkCanada: boolean;
  };
  company?: Company | null;
}

export default function MandatorySection({ data, company }: MandatorySectionProps) {
  const questions = [
    {
      key: "over23Local",
      label: "Are you over the age of 23 (for Local)?",
      value: data.over23Local,
    },
    {
      key: "over25CrossBorder",
      label: "Are you over the age of 25 (for Cross Border)?",
      value: data.over25CrossBorder,
    },
    {
      key: "experienceDrivingTractorTrailer",
      label: "Do you have at least 2 year of verifiable Experience driving Tractor/Trailer?",
      value: data.experienceDrivingTractorTrailer,
    },
    {
      key: "legalRightToWorkCanada",
      label: company?.countryCode === "US" 
        ? "Do you have legal right to work in the US?" 
        : "Do you have legal right to work in Canada?",
      value: data.legalRightToWorkCanada,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: "var(--color-outline-variant)" }}>
        <div className="w-2 h-8 rounded-full" style={{ background: "var(--color-error)" }}></div>
        <h3 className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>Mandatory</h3>
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
            <span className="text-sm flex-1 pr-4" style={{ color: "var(--color-on-surface-variant)" }}>
              {question.label}
            </span>
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
              <span className="text-sm font-medium min-w-[40px]" style={{ color: "var(--color-on-surface)" }}>
                {question.value === true ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
