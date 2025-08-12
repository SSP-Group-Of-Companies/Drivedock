"use client";

import { useTranslation } from "react-i18next";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
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

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-2xl bg-white shadow-sm">
      {/* anchor for scrollToError */}
      <span data-field="criminalRecords" className="sr-only" />

      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">{t("form.step2.page4.sections.criminalRecords.title")}</h2>
        <p className="text-sm text-gray-600">{t("form.step2.page4.sections.criminalRecords.subtitle")}</p>
      </div>

      {/* Guidance block */}
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

      {/* Records list */}
      <div className="space-y-4">
        {fields.map((row, i) => {
          const rowErr = (errors.criminalRecords as any)?.[i] || {};
          return (
            <div key={row.id} className="relative rounded-xl ring-1 ring-gray-100 p-4 bg-white">
              <button type="button" onClick={() => remove(i)} className="absolute top-3 right-3 inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm" title="Remove this record">
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.dateOfSentence")}</label>
                  <input
                    type="date"
                    {...register(`criminalRecords.${i}.dateOfSentence`)}
                    className="mt-1 w-full rounded-md border-gray-300 focus:ring-gray-500 focus:outline-none focus:shadow-md py-2 px-3"
                    data-field={`criminalRecords.${i}.dateOfSentence`}
                  />
                  {rowErr?.dateOfSentence && <p className="text-red-500 text-xs mt-1">{rowErr.dateOfSentence.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.offense")}</label>
                  <input
                    {...register(`criminalRecords.${i}.offense`)}
                    className="mt-1 w-full rounded-md border-gray-300 focus:ring-gray-500 focus:outline-none focus:shadow-md py-2 px-3"
                    data-field={`criminalRecords.${i}.offense`}
                  />
                  {rowErr?.offense && <p className="text-red-500 text-xs mt-1">{rowErr.offense.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.courtLocation")}</label>
                  <input
                    {...register(`criminalRecords.${i}.courtLocation`)}
                    className="mt-1 w-full rounded-md border-gray-300 focus:ring-gray-500 focus:outline-none focus:shadow-md py-2 px-3"
                    data-field={`criminalRecords.${i}.courtLocation`}
                  />
                  {rowErr?.courtLocation && <p className="text-red-500 text-xs mt-1">{rowErr.courtLocation.message}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => append({ offense: "", dateOfSentence: "", courtLocation: "" })}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-md font-medium"
        >
          <Plus className="w-4 h-4" />
          {t("actions.addRow")}
        </button>
      </div>
    </section>
  );
}
