"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

import useMounted from "@/hooks/useMounted";
import EmploymentCard from "./EmploymentCard";
import GapBlock from "./GapBlock";
import EmploymentQuestionsSection from "./EmploymentQuestionsSection";
import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";
import { calculateTimelineFromCurrent, getEmploymentGaps } from "@/lib/frontendConfigs/applicationFormConfigs/validateEmploymentHistory";

type EmploymentEntry = ApplicationFormPage2Schema["employments"][number];
const MAX_ENTRIES = 5;

export default function EmploymentSection() {
  const { control, watch } = useFormContext<ApplicationFormPage2Schema>();

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

  // NEW: if server returned previous entries, show them immediately
  useEffect(() => {
    if (fields.length > 1) setShowPrevious(true);
  }, [fields.length]);

  const { timeline, totalDays, totalMonths } = calculateTimelineFromCurrent(employments);
  const needsMoreThan2yrsButLessThan10 = totalDays > 760 && totalDays < 3650;
  const lessThan2Years = totalDays < 730;

  const gaps = getEmploymentGaps(timeline);

  const canAddMore = fields.length < MAX_ENTRIES;
  const previousCount = Math.max(fields.length - 1, 0);

  if (!mounted) return null;
  return (
    <section className="space-y-6">
      {/* Employment Questions Section - NEW */}
      <EmploymentQuestionsSection />

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3">
          <h2 className="text-sm font-bold text-gray-700">{t("form.step2.page2.sections.employment")}</h2>
        </div>
        <p className="text-sm text-gray-600">{t("form.step2.page2.requirements")}</p>
        {/* Anchor for scrollToError: matches Zod error path */}
        <div data-field="employments.totals.root" />

        {/* Top banner message */}
        {lessThan2Years && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            Employment history of 2 or more years is needed. Current duration: ~{totalMonths} months ({totalDays} days). Please add previous employment.
          </p>
        )}

        {needsMoreThan2yrsButLessThan10 && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            You have ~{Math.floor(totalMonths / 12)} years ({totalMonths} months,
            {` ${totalDays} days`}). Please add previous employment until you reach 10 years.
          </p>
        )}
      </div>

      {fields.map((field, index) => {
        const isCurrent = index === 0;
        const isPrevious = index > 0;
        if (isPrevious && !showPrevious) return null;

        const blocks: React.ReactNode[] = [];

        blocks.push(
          <div key={field.id} className="border border-gray-300 bg-white/90 p-6 rounded-xl shadow space-y-4 relative">
            <div className="absolute -top-3 left-6 bg-white px-3">
              <h3 className="text-sm font-bold text-gray-700">{isCurrent ? t("form.step2.page2.labels.currentEmployer") : `${t("form.step2.page2.labels.previousEmployer")} ${index}`}</h3>
            </div>

            {isPrevious && (
              <button
                type="button"
                onClick={() => {
                  remove(index);
                  if (fields.length - 1 <= 1) setShowPrevious(false);
                }}
                className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-sm font-medium"
              >
                {t("form.step2.page2.actions.removePrevious")}
              </button>
            )}

            <EmploymentCard index={index} />

            {/* Add button also on the current card */}
            {isCurrent && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPrevious(true);
                    if (canAddMore) append(createEmptyEmployment());
                  }}
                  disabled={!canAddMore}
                  className={`mt-2 mx-auto flex items-center gap-2 px-4 py-2 border rounded-md transition-colors duration-200 font-medium ${
                    canAddMore ? "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200" : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  }`}
                >
                  {t("form.step2.page2.actions.addPrevious")} ({previousCount}/{MAX_ENTRIES - 1})
                </button>
              </div>
            )}
          </div>
        );

        const gapAfter = gaps.find((gap) => gap.index === index);
        if (gapAfter) {
          blocks.push(<GapBlock key={`gap-after-${index}`} index={index} days={gapAfter.days} />);
        }

        return <div key={`block-${field.id}`}>{blocks}</div>;
      })}

      {showPrevious && totalMonths > 24 && (
        <button
          type="button"
          onClick={() => {
            if (canAddMore) append(createEmptyEmployment());
          }}
          disabled={!canAddMore}
          className={`mt-6 mx-auto flex items-center gap-2 px-4 py-2 border rounded-md transition-colors duration-200 font-medium ${
            canAddMore ? "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200" : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
          }`}
        >
          {t("form.step2.page2.actions.addPrevious")} ({previousCount}/{MAX_ENTRIES - 1})
        </button>
      )}
    </section>
  );
}
