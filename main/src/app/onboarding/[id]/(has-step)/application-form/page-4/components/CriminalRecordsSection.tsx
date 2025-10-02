"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import useMounted from "@/hooks/useMounted";
import { ApplicationFormPage4Schema } from "@/lib/zodSchemas/applicationFormPage4.Schema";

export default function CriminalRecordsSection() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  const {
    control,
    register,
    setValue,
    clearErrors,
    formState: { errors },
  } = useFormContext<ApplicationFormPage4Schema>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "criminalRecords",
  });

  const hasCriminalRecords = useWatch({ control, name: "hasCriminalRecords" });

  if (!mounted) return null;

  const hasRows = fields.length > 0;

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-2xl bg-white shadow-sm">
      {/* anchor for scrollToError */}
      <span data-field="criminalRecords" className="sr-only" />

      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">
          {t("form.step2.page4.sections.criminalRecords.title")}
        </h2>
        <p className="text-sm text-gray-600">
          {t("form.step2.page4.sections.criminalRecords.subtitle")}
        </p>
      </div>

      {/* Guidance block — FULL text preserved */}
      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <p className="text-sm font-medium text-gray-900 text-center">
          {t("form.step2.page4.sections.criminalRecords.guidance.intro")}
        </p>
        <div className="mt-3 text-sm text-gray-700">
          <p className="font-medium">
            {t(
              "form.step2.page4.sections.criminalRecords.guidance.dontDeclareTitle"
            )}
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>
              {t(
                "form.step2.page4.sections.criminalRecords.guidance.items.item1"
              )}
            </li>
            <li>
              {t(
                "form.step2.page4.sections.criminalRecords.guidance.items.item2"
              )}
            </li>
            <li>
              {t(
                "form.step2.page4.sections.criminalRecords.guidance.items.item3"
              )}
            </li>
            <li>
              {t(
                "form.step2.page4.sections.criminalRecords.guidance.items.item4"
              )}
            </li>
            <li>
              {t(
                "form.step2.page4.sections.criminalRecords.guidance.items.item5"
              )}
            </li>
            <li>
              {t(
                "form.step2.page4.sections.criminalRecords.guidance.items.item6"
              )}
            </li>
          </ul>
        </div>
      </div>

      {/* Yes/No gate */}
      <div className="flex items-center justify-center gap-3 flex-wrap" data-field="hasCriminalRecords">
        <span className="text-sm font-medium text-gray-800 text-center">{t("form.step2.page4.questions.hasCriminalRecords", "Have you ever been convicted of a criminal offense?")}</span>
        <div className="inline-flex rounded-full border border-gray-200 overflow-hidden">
          <button
            type="button"
            className={`px-4 py-1 text-sm ${hasCriminalRecords === true ? "bg-sky-600 text-white" : "bg-white text-gray-700"}`}
            onClick={() => {
              setValue("hasCriminalRecords", true, { shouldDirty: true, shouldValidate: true });
              clearErrors(["hasCriminalRecords", "criminalRecords"]);
            }}
          >
            {t("form.step1.questions.yes", "Yes")}
          </button>
          <button
            type="button"
            className={`px-4 py-1 text-sm border-l border-gray-300 ${hasCriminalRecords === false ? "bg-sky-600 text-white" : "bg-white text-gray-700"}`}
            onClick={() => {
              setValue("hasCriminalRecords", false, { shouldDirty: true, shouldValidate: true });
              clearErrors(["hasCriminalRecords", "criminalRecords"]);
            }}
          >
            {t("form.step1.questions.no", "No")}
          </button>
        </div>
      </div>

      {/* Root error */}
      {((errors as any)?.hasCriminalRecords?.message || (errors as any)?.criminalRecords?.message) && (
        <div className="mb-2 text-center text-sm text-red-600">
          {(errors as any)?.hasCriminalRecords?.message || (errors as any)?.criminalRecords?.message}
        </div>
      )}

      {/* Desktop header — show only when there are rows */}
      {hasCriminalRecords === true && hasRows && (
        <div className="hidden md:grid grid-cols-12 items-center px-2 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
          <div className="col-span-3">
            {t("form.step2.page4.fields.dateOfSentence")}
          </div>
          <div className="col-span-5">
            {t("form.step2.page4.fields.offense")}
          </div>
          <div className="col-span-3">
            {t("form.step2.page4.fields.courtLocation")}
          </div>
          <div className="col-span-1 text-right">
            <span className="sr-only">{t("actions.remove")}</span>
          </div>
        </div>
      )}

      {/* Rows */}
      {hasCriminalRecords === true && (
      <div className="space-y-4 md:space-y-0">
        {fields.map((row, i) => {
          const rowErr = (errors.criminalRecords as any)?.[i] || {};
          const dateHasErr = !!rowErr?.dateOfSentence;
          const offenseHasErr = !!rowErr?.offense;
          const courtHasErr = !!rowErr?.courtLocation;

          return (
            <div
              key={row.id}
              className={[
                // Mobile: card style with spacing
                "relative rounded-2xl border border-gray-200 p-4 shadow-sm bg-white space-y-4 md:space-y-0",
                // Desktop: flat row with only a subtle bottom shadow
                "md:rounded-none md:border-0 md:bg-transparent md:shadow-[0_1px_0_0_rgba(0,0,0,0.05)] md:px-2 md:grid md:grid-cols-12 md:items-center md:gap-3",
                // Remove the extra gap under the header for first row
                i === 0 ? "md:pt-2 md:-mt-[1px]" : "md:py-2",
              ].join(" ")}
            >
              {/* Mobile remove (X) - Only show if more than one row */}
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute -top-2 -right-2 inline-flex items-center justify-center rounded-full bg-white text-red-600 hover:text-red-700 p-1 shadow md:hidden"
                  aria-label={t("actions.remove") as string}
                  title={t("actions.remove") as string}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              {/* Date */}
              <div className="md:col-span-3">
                <label className="md:hidden block text-sm font-medium text-gray-700 mb-1">
                  {t("form.step2.page4.fields.dateOfSentence")}
                </label>
                <input
                  type="date"
                  {...register(`criminalRecords.${i}.dateOfSentence`)}
                  data-field={`criminalRecords.${i}.dateOfSentence`}
                  className={`w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    dateHasErr ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {/* border-only; no inline error */}
              </div>

              {/* Offense */}
              <div className="md:col-span-5">
                <label className="md:hidden block text-sm font-medium text-gray-700 mb-1">
                  {t("form.step2.page4.fields.offense")}
                </label>
                <input
                  {...register(`criminalRecords.${i}.offense`)}
                  data-field={`criminalRecords.${i}.offense`}
                  className={`w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    offenseHasErr ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder={t("form.placeholders.describe", "Describe...")}
                />
                {/* border-only; no inline error */}
              </div>

              {/* Court Location */}
              <div className="md:col-span-3">
                <label className="md:hidden block text-sm font-medium text-gray-700 mb-1">
                  {t("form.step2.page4.fields.courtLocation")}
                </label>
                <input
                  {...register(`criminalRecords.${i}.courtLocation`)}
                  data-field={`criminalRecords.${i}.courtLocation`}
                  className={`w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                    courtHasErr ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder={t(
                    "form.placeholders.cityProvince",
                    "City, Province/State"
                  )}
                />
                {/* border-only; no inline error */}
              </div>

              {/* Desktop remove — centered vertically - Only show if more than one row */}
              {fields.length > 1 && (
                <div className="hidden md:col-span-1 md:flex md:items-center md:justify-end">
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-2 text-red-600 hover:text-red-700"
                    title={t("actions.remove") as string}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">{t("actions.remove")}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Add Row */}
      {hasCriminalRecords === true && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => append({ offense: "", dateOfSentence: "", courtLocation: "" })}
            disabled={fields.length >= 7}
            className={`mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm shadow ${
              fields.length >= 7 ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-sky-600 text-white hover:opacity-90"
            }`}
          >
            {t("form.addMore", "Add another")}
          </button>
        </div>
      )}
    </section>
  );
}
