"use client";

import { useTranslation } from "react-i18next";
import { Plus, Trash2, X } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import useMounted from "@/hooks/useMounted";
import { ApplicationFormPage4Schema } from "@/lib/zodSchemas/applicationFormPage4.Schema";

export default function CriminalRecordsSection() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ApplicationFormPage4Schema>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "criminalRecords",
  });

  if (!mounted) return null;

  const hasRows = fields.length > 0;

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-2xl bg-white shadow-sm">
      {/* anchor for scrollToError */}
      <span data-field="criminalRecords" className="sr-only" />

      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">{t("form.step2.page4.sections.criminalRecords.title")}</h2>
        <p className="text-sm text-gray-600">{t("form.step2.page4.sections.criminalRecords.subtitle")}</p>
      </div>

      {/* Guidance block — FULL text preserved */}
      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <p className="text-sm font-medium text-gray-900 text-center">{t("form.step2.page4.sections.criminalRecords.guidance.intro")}</p>
        <div className="mt-3 text-sm text-gray-700">
          <p className="font-medium">{t("form.step2.page4.sections.criminalRecords.guidance.dontDeclareTitle")}</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>{t("form.step2.page4.sections.criminalRecords.guidance.items.item1")}</li>
            <li>{t("form.step2.page4.sections.criminalRecords.guidance.items.item2")}</li>
            <li>{t("form.step2.page4.sections.criminalRecords.guidance.items.item3")}</li>
            <li>{t("form.step2.page4.sections.criminalRecords.guidance.items.item4")}</li>
            <li>{t("form.step2.page4.sections.criminalRecords.guidance.items.item5")}</li>
            <li>{t("form.step2.page4.sections.criminalRecords.guidance.items.item6")}</li>
          </ul>
        </div>
      </div>

      {/* Desktop header — show only when there are rows */}
      {hasRows && (
        <div className="hidden md:grid grid-cols-12 items-center px-2 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
          <div className="col-span-3">{t("form.step2.page4.fields.dateOfSentence")}</div>
          <div className="col-span-5">{t("form.step2.page4.fields.offense")}</div>
          <div className="col-span-3">{t("form.step2.page4.fields.courtLocation")}</div>
          <div className="col-span-1 text-right">
            <span className="sr-only">{t("actions.remove")}</span>
          </div>
        </div>
      )}

      {/* Rows */}
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
                "relative rounded-2xl border border-gray-200 p-4 shadow-sm bg-white",
                // Desktop: flat row with only a subtle bottom shadow
                "md:rounded-none md:border-0 md:bg-transparent md:shadow-[0_1px_0_0_rgba(0,0,0,0.05)] md:px-2 md:grid md:grid-cols-12 md:items-start md:gap-3",
                // Remove the extra gap under the header for first row
                i === 0 ? "md:pt-2 md:-mt-[1px]" : "md:py-2",
              ].join(" ")}
            >
              {/* Mobile remove (X) */}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute -top-2 -right-2 inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 p-1 shadow md:hidden"
                aria-label={t("actions.remove") as string}
                title={t("actions.remove") as string}
              >
                <X className="h-4 w-4" />
              </button>

              {/* Date */}
              <div className="md:col-span-3">
                <label className="md:hidden block text-sm font-medium text-gray-700 mb-1">{t("form.step2.page4.fields.dateOfSentence")}</label>
                <input
                  type="date"
                  {...register(`criminalRecords.${i}.dateOfSentence`)}
                  data-field={`criminalRecords.${i}.dateOfSentence`}
                  className={`w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${dateHasErr ? "border-red-300" : "border-gray-300"}`}
                />
                {dateHasErr && <p className="mt-1 text-xs text-red-600">{rowErr.dateOfSentence.message}</p>}
              </div>

              {/* Offense */}
              <div className="md:col-span-5">
                <label className="md:hidden block text-sm font-medium text-gray-700 mb-1">{t("form.step2.page4.fields.offense")}</label>
                <input
                  {...register(`criminalRecords.${i}.offense`)}
                  data-field={`criminalRecords.${i}.offense`}
                  className={`w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${offenseHasErr ? "border-red-300" : "border-gray-300"}`}
                  placeholder={t("form.placeholders.describe", "Describe...")}
                />
                {offenseHasErr && <p className="mt-1 text-xs text-red-600">{rowErr.offense.message}</p>}
              </div>

              {/* Court Location */}
              <div className="md:col-span-3">
                <label className="md:hidden block text-sm font-medium text-gray-700 mb-1">{t("form.step2.page4.fields.courtLocation")}</label>
                <input
                  {...register(`criminalRecords.${i}.courtLocation`)}
                  data-field={`criminalRecords.${i}.courtLocation`}
                  className={`w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${courtHasErr ? "border-red-300" : "border-gray-300"}`}
                  placeholder={t("form.placeholders.cityProvince", "City, Province/State")}
                />
                {courtHasErr && <p className="mt-1 text-xs text-red-600">{rowErr.courtLocation.message}</p>}
              </div>

              {/* Desktop remove — centered vertically */}
              <div className="hidden md:col-span-1 md:flex md:items-center md:justify-end">
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-2 text-gray-600 hover:bg-gray-50"
                  title={t("actions.remove") as string}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">{t("actions.remove")}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Row */}
      <div className="text-center">
        <button
          type="button"
          onClick={() => append({ offense: "", dateOfSentence: "", courtLocation: "" })}
          className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 font-medium text-blue-600 hover:bg-blue-100"
        >
          <Plus className="h-4 w-4" />
          {t("actions.addRow")}
        </button>
      </div>
    </section>
  );
}
