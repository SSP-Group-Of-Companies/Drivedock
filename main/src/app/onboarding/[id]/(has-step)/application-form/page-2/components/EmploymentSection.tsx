"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import useMounted from "@/hooks/useMounted";
import EmploymentCard from "./EmploymentCard";
import GapBlock from "./GapBlock";
import EmploymentQuestionsSection from "./EmploymentQuestionsSection";
import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";
import {
  calculateTimelineFromCurrent,
  getEmploymentGaps,
} from "@/lib/frontendConfigs/applicationFormConfigs/validateEmploymentHistory";
import { validateEmploymentHistory } from "@/lib/utils/validationUtils";

type EmploymentEntry = ApplicationFormPage2Schema["employments"][number];
const MAX_ENTRIES = 8;

// Utility: decide if a message is about gaps (not duration)
function isGapMessage(msg?: string | null): boolean {
  if (!msg) return false;
  // Keep this broad enough to match server/i18n text variants
  return /(gap|gaps|explain|explanation)/i.test(msg);
}

export default function EmploymentSection() {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<ApplicationFormPage2Schema>();

  const mounted = useMounted();
  const { t } = useTranslation("common");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "employments",
  });

  const employments = watch("employments");
  const [showPrevious, setShowPrevious] = useState(false);

  const createEmptyEmployment = (): EmploymentEntry => ({
    employerName: "",
    supervisorName: "",
    address: "",
    postalCode: "",
    city: "",
    stateOrProvince: "",
    phone1: "",
    phone2: "",
    email: "",
    positionHeld: "",
    from: "",
    to: "",
    salary: "",
    reasonForLeaving: "",
    subjectToFMCSR: undefined,
    safetySensitiveFunction: undefined,
    gapExplanationBefore: "",
  });

  useEffect(() => {
    if (fields.length === 0) append(createEmptyEmployment());
  }, [append, fields.length]);

  // If server returned previous entries, show them immediately
  useEffect(() => {
    if (fields.length > 1) setShowPrevious(true);
  }, [fields.length]);

  const { timeline, totalDays, totalMonths } =
    calculateTimelineFromCurrent(employments);
  const lessThan10Years = totalDays < 3650;

  const gaps = getEmploymentGaps(timeline);

  const canAddMore = fields.length < MAX_ENTRIES;
  const previousCount = Math.max(fields.length - 1, 0);

  // Root-level errors (server/Zod). We only want to surface GAP-related ones here.
  const employmentErrors = errors?.employments as any;
  const rawRootMessage: string | undefined =
    employmentErrors?.totals?.root?.message;
  const rootGapMessage = isGapMessage(rawRootMessage)
    ? rawRootMessage
    : undefined;

  // Real-time validation for gaps only (suppress duration duplicates)
  const normalizedEmployments =
    employments?.map((emp) => ({
      ...emp,
      subjectToFMCSR: emp.subjectToFMCSR ?? false,
      safetySensitiveFunction: emp.safetySensitiveFunction ?? false,
    })) || [];

  const realTimeValidationError = validateEmploymentHistory(
    normalizedEmployments
  );
  const hasGapError = isGapMessage(realTimeValidationError);

  // Show real-time gap message only if there isn't already a root gap error
  const shouldShowGapError = hasGapError && !rootGapMessage;

  if (!mounted) return null;

  return (
    <section className="space-y-6">
      {/* Employment Questions */}
      <EmploymentQuestionsSection />

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 pt-6 mb-6 relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3">
          <h2 className="text-sm font-bold text-gray-700">
            {t("form.step2.page2.sections.employment")}
          </h2>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {t("form.step2.page2.requirements")}
        </p>

        {/* Anchor for scrollToError: matches Zod error path */}
        <div data-field="employments.totals.root" />

        {/* Banner: duration (<10y) notice (client-side only) */}
        {lessThan10Years && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            Employment history of 10 years is required. Current duration: ~
            {Math.floor(totalMonths / 12)} years {totalMonths % 12} months (
            {totalDays} days). Please add previous employment until you reach 10
            years.
          </p>
        )}

        {/* Root error: show ONLY gap-related messages; suppress duration duplicates */}
        {rootGapMessage && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mt-2">
            {rootGapMessage}
          </p>
        )}

        {/* Real-time gap error (only if no root gap error is present) */}
        {shouldShowGapError && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mt-2">
            Please explain the gap(s) in your employment history. Look for the
            red gap explanation fields below.
          </p>
        )}
      </div>

      {fields.map((field, index) => {
        const isCurrent = index === 0;
        const isPrevious = index > 0;
        const isLastEntry = index === fields.length - 1;
        if (isPrevious && !showPrevious) return null;

        const blocks: React.ReactNode[] = [];

        blocks.push(
          <div
            key={field.id}
            className="border border-gray-300 bg-white/90 p-6 rounded-xl shadow space-y-4 relative"
          >
            <div className="absolute -top-3 left-6 bg-white px-3">
              <h3 className="text-sm font-bold text-gray-700">
                {isCurrent
                  ? t("form.step2.page2.labels.currentEmployer")
                  : `${t("form.step2.page2.labels.previousEmployer")} ${index}`}
              </h3>
            </div>

            {isPrevious && (
              <button
                type="button"
                aria-label={t("form.remove", "Remove")}
                onClick={() => {
                  remove(index);
                  if (fields.length - 1 <= 1) setShowPrevious(false);
                }}
                className="absolute top-2 right-2 text-red-600 hover:text-red-700"
              >
                <Trash2 size={16} />
              </button>
            )}

            <EmploymentCard index={index} />

            {/* Add button now on the last entry instead of current */}
            {isLastEntry && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPrevious(true);
                    if (canAddMore) append(createEmptyEmployment());
                  }}
                  disabled={!canAddMore}
                  className={`mt-2 mx-auto flex items-center gap-2 px-4 py-2 border rounded-md transition-colors duration-200 font-medium ${
                    canAddMore
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                      : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  }`}
                >
                  {t("form.step2.page2.actions.addPrevious")} ({previousCount}/
                  {MAX_ENTRIES - 1})
                </button>
              </div>
            )}
          </div>
        );

        const gapAfter = gaps.find((gap) => gap.index === index);
        if (gapAfter) {
          blocks.push(
            <GapBlock
              key={`gap-after-${index}`}
              index={index}
              days={gapAfter.days}
            />
          );
        }

        return <div key={`block-${field.id}`}>{blocks}</div>;
      })}
    </section>
  );
}
