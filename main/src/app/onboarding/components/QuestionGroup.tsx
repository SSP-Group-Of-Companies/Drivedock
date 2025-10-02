"use client";

/**
 * ===========================================================================
 * QuestionGroup.tsx
 * ---------------------------------------------------------------------------
 * PURPOSE
 *   A small, reusable, controlled UI component for rendering a single-choice
 *   group (e.g., Yes/No or multi-option) as segmented buttons. It is designed
 *   to be generic so it can be reused across the onboarding flow (including
 *   Pre-Qualifications and other steps) wherever the question layout matches.
 * ===========================================================================
 */

import { useTranslation } from "react-i18next";
import useMounted from "@/hooks/useMounted";
import FormHelpPopUps from "@/components/shared/FormHelpPopUps";

/** Option item */
type Option = {
  labelKey: string; // i18n key for label
  value: string; // actual value returned on selection
};

/** Props */
type QuestionGroupProps = {
  question: string | React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  options?: Option[];
  helpContent?: string;
  disabled?: boolean;
};

/** Default Yes/No options */
const defaultOptions: Option[] = [
  { labelKey: "form.step1.questions.yes", value: "form.yes" },
  { labelKey: "form.step1.questions.no", value: "form.no" },
];

export default function QuestionGroup({
  question,
  value,
  onChange,
  options = defaultOptions,
  helpContent,
  disabled = false,
}: QuestionGroupProps) {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  if (!mounted) return null;

  return (
    <div className="w-full bg-gray-50 rounded-xl px-4 py-3 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        {/* Question prompt + optional help */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <p
            className={`font-medium text-sm break-words ${
              disabled ? "text-gray-400" : "text-gray-800"
            }`}
          >
            {question}
          </p>
          {helpContent && <FormHelpPopUps content={helpContent} />}
        </div>

        {/* Segmented control */}
        <div
          role="radiogroup"
          aria-label={typeof question === "string" ? question : undefined}
          aria-disabled={disabled || undefined}
          className={`inline-flex w-full sm:w-auto sm:flex-shrink-0 rounded-full border overflow-hidden ${
            disabled ? "border-gray-200 opacity-70" : "border-gray-300"
          }`}
        >
          {options.map(({ labelKey, value: optValue }, idx) => {
            const isSelected = value === optValue;

            // Shared classes with disabled styling
            const baseBtn =
              "w-full sm:w-auto px-4 py-1.5 text-sm font-medium transition-all focus:outline-none";
            const stateClasses = disabled
              ? isSelected
                ? "bg-[#e6eef6] text-gray-500 cursor-not-allowed"
                : "bg-white text-gray-400 cursor-not-allowed"
              : isSelected
              ? "bg-[#0071BC] text-white"
              : "bg-white text-gray-800 hover:bg-red-50";
            const divider =
              idx > 0
                ? disabled
                  ? "border-l border-gray-200"
                  : "border-l border-gray-300"
                : "";

            return (
              <button
                key={optValue}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-disabled={disabled || undefined}
                disabled={disabled}
                onClick={() => {
                  if (disabled || isSelected) return; // no-op in disabled mode; radio behavior prevents deselect
                  onChange(optValue);
                }}
                className={`${baseBtn} ${stateClasses} ${divider}`}
                tabIndex={disabled ? -1 : 0}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
