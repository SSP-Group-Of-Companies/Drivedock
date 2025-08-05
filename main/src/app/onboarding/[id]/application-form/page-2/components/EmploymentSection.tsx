"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef } from "react";

import EmploymentCard from "./EmploymentCard";
import GapBlock from "./GapBlock";
import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";
import {
  calculateTimelineFromCurrent,
  getEmploymentGaps,
} from "@/lib/frontendConfigs/applicationFormConfigs/validateEmploymentHistory";

// 👇 Type alias for a single employment entry
type EmploymentEntry = ApplicationFormPage2Schema["employments"][number];

export default function EmploymentSection() {
  const { control, watch } = useFormContext<ApplicationFormPage2Schema>();
  const { t } = useTranslation("common");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "employments",
  });

  const employments = watch("employments");
  const currentFrom = watch("employments.0.from");
  const currentTo = watch("employments.0.to");
  const [showPrevious, setShowPrevious] = useState(false);
  const hasAutoAddedRef = useRef(false);

  // ✅ Strictly typed employment factory
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
    if (fields.length === 0) {
      append(createEmptyEmployment());
    }
  }, [append, fields]);

  useEffect(() => {
    const current = employments[0];
    if (!current?.from || !current?.to) return;

    // Use timeline calculation instead of individual employment duration
    const { totalMonths } = calculateTimelineFromCurrent(employments);

    // Auto-display previous employment forms if total timeline > 24 months and we haven't auto-added yet
    if (totalMonths > 24 && !hasAutoAddedRef.current) {
      // Auto-add previous employment forms immediately
      setShowPrevious(true);
      hasAutoAddedRef.current = true;

      // Add only 1 additional employment entry (auto-added)
      append(createEmptyEmployment());
    }
  }, [employments, currentFrom, currentTo, fields.length, append]);

  // Update add button logic to use timeline calculation
  const { timeline, totalMonths } = calculateTimelineFromCurrent(employments);

  // Check for gaps between employment entries
  const gaps = getEmploymentGaps(timeline);

  return (
    <section className="space-y-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 relative">
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-3">
          <h2 className="text-sm font-bold text-gray-700">
            {t("form.page2.sections.employment")}
          </h2>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          The Federal Motor Carrier Safety Regulations (49CFR391.21) require
          that all applicants wishing to drive a commercial vehicle list all
          employment for the last two (2) years. In addition, if you have driven
          a commercial vehicle previously, you must provide employment history
          for an additional eight (8) years for a total of ten (10) years. Any 1
          month or more gaps in employment must be explained.
        </p>
      </div>

      {fields.map((field, index) => {
        const isCurrent = index === 0;
        const isPrevious = index > 0;

        if (isPrevious && !showPrevious) return null;

        const blocks = [];

        // Add the employment form first
        blocks.push(
          <div
            key={field.id}
            className="border border-gray-300 bg-white/90 p-6 rounded-xl shadow space-y-4 relative"
          >
            <div className="absolute -top-3 left-6 bg-white px-3">
              <h3 className="text-sm font-bold text-gray-700">
                {isCurrent
                  ? t("form.page2.labels.currentEmployer")
                  : `${t("form.page2.labels.previousEmployer")} ${index}`}
              </h3>
            </div>

            {isPrevious && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="absolute top-2 right-2 text-red-600 hover:text-red-800 text-sm font-medium"
                title="Remove this employer"
              >
                {t("form.page2.actions.removePrevious")}
              </button>
            )}

            <EmploymentCard index={index} />
          </div>
        );

        // Add gap block AFTER this employment if there's a gap before the next employment
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

      {showPrevious && totalMonths > 24 && (
        <button
          type="button"
          onClick={() => {
            if (fields.length < 5) {
              append(createEmptyEmployment());
            }
          }}
          className="mt-6 mx-auto flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors duration-200 font-medium"
        >
          {t("form.page2.actions.addPrevious")} ({fields.length - 1}/4)
        </button>
      )}
    </section>
  );
}
