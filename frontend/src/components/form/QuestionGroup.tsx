"use client";

import { useTranslation } from "react-i18next";

type QuestionGroupProps = {
  question: string;
  value: string;
  onChange: (val: string) => void;
  options?: string[];
};

export default function QuestionGroup({
  question,
  value,
  onChange,
  options = ["Yes", "No"],
}: QuestionGroupProps) {
  const { t } = useTranslation("common");

  return (
    <div className="w-full bg-gray-50 rounded-xl px-4 py-3 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <p className="font-medium text-gray-800 text-sm">{question}</p>

        <div className="inline-flex w-full sm:w-auto rounded-full border border-gray-300 overflow-hidden">
          {options.map((opt, idx) => {
            const isSelected = value === opt;

            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(isSelected && options.length === 1 ? "" : opt)}
                className={`w-full sm:w-auto px-4 py-1.5 text-sm font-medium transition-all
                  ${isSelected
                    ? "bg-[#0071BC] text-white"
                    : "bg-white text-gray-800 hover:bg-red-50"}
                  ${idx > 0 ? "border-l border-gray-300" : ""}
                `}
              >
                {t(opt)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
