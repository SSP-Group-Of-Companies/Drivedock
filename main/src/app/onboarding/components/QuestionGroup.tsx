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
 *
 * DESIGN CHOICES
 *   - Controlled component: parent owns the value and passes an onChange.
 *   - i18n-ready: each option provides an `labelKey` that maps to i18n.
 *   - Accessible: uses `radiogroup` and `radio` roles with aria-checked.
 *   - SSR-safety: defers rendering until mounted to avoid hydration mismatch.
 *   - Sensible defaults: falls back to step-1-scoped Yes/No options.
 *
 * DATA CONTRACT
 *   - `value` is the *stored* value (e.g., "form.yes"), not the translated label.
 *   - `options` is an array of { labelKey, value } where:
 *        - labelKey: i18n key resolved via `t(labelKey)`
 *        - value:    opaque string persisted back up to parent state
 *
 * USAGE
 *   <QuestionGroup
 *     question={t("form.step1.questions.canDriveManual")}
 *     value={formValue}
 *     onChange={(v) => setFormValue(v)}
 *     options={[
 *       { labelKey: "form.step1.questions.yes", value: "form.yes" },
 *       { labelKey: "form.step1.questions.no",  value: "form.no"  },
 *     ]}
 *   />
 *
 * OWNER
 *   SSP Tech Team – DriverDock project
 * ===========================================================================
 */

import { useTranslation } from "react-i18next";
import useMounted from "@/hooks/useMounted";

/**
 * A single selectable option in the group.
 * - labelKey: i18n key used to render the visible text
 * - value:    the actual value emitted when selected (opaque string)
 */
type Option = {
  labelKey: string; // i18n key for label
  value: string; // actual value returned on selection
};

/**
 * Props for QuestionGroup.
 * - question: string or ReactNode shown as the prompt
 * - value:    the currently selected option's `value`
 * - onChange: callback invoked when the selection changes
 * - options:  the available options; defaults to Yes/No in step-1 scope
 */
type QuestionGroupProps = {
  question: string | React.ReactNode;
  value: string;
  onChange: (val: string) => void;
  options?: Option[]; // defaults to Yes/No with step1 scope
};

/**
 * Default to a step-1-scoped Yes/No pair. This is a safe fallback and
 * ensures we always render something meaningful if options are omitted.
 */
const defaultOptions: Option[] = [
  { labelKey: "form.step1.questions.yes", value: "form.yes" },
  { labelKey: "form.step1.questions.no", value: "form.no" },
];

export default function QuestionGroup({
  question,
  value,
  onChange,
  options = defaultOptions,
}: QuestionGroupProps) {
  // Avoid hydration mismatch by rendering only on client mount.
  const mounted = useMounted();

  // i18n translation function; expects `labelKey` entries to exist in locale files.
  const { t } = useTranslation("common");

  // If not mounted, render nothing to keep server/client markup identical.
  if (!mounted) return null;

  return (
    <div className="w-full bg-gray-50 rounded-xl px-4 py-3 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        {/* Question prompt (supports string or custom React node) */}
        <p className="font-medium text-gray-800 text-sm">{question}</p>

        {/* Segmented control container with ARIA radiogroup for accessibility */}
        <div
          role="radiogroup"
          aria-label={typeof question === "string" ? question : undefined}
          className="inline-flex w/full sm:w-auto rounded-full border border-gray-300 overflow-hidden"
        >
          {options.map(({ labelKey, value: optValue }, idx) => {
            // Determine if this option is the current selection
            const isSelected = value === optValue;

            return (
              <button
                key={optValue} // stable key derived from option's value
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  // Prevent deselection to behave like radio buttons
                  if (isSelected) return; // radio behavior
                  onChange(optValue); // bubble new selection up to parent
                }}
                className={`w-full sm:w-auto px-4 py-1.5 text-sm font-medium transition-all ${
                  isSelected
                    ? "bg-[#0071BC] text-white"
                    : "bg-white text-gray-800 hover:bg-red-50"
                } ${idx > 0 ? "border-l border-gray-300" : ""}`}
              >
                {/* Visible text resolved via i18n label key */}
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
