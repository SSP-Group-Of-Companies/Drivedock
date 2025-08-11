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
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white shadow-sm">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">{t("form.step2.page4.sections.criminalRecords.title", "Criminal Records")}</h2>
        <p className="text-sm text-gray-600">{t("form.step2.page4.sections.criminalRecords.subtitle", "List any convictions. Leave blank if none.")}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-sm text-gray-700">{t("form.step2.page4.fields.offense", "Offense")}</th>
              <th className="px-3 py-2 text-left text-sm text-gray-700">{t("form.step2.page4.fields.dateOfSentence", "Date Of Sentence")}</th>
              <th className="px-3 py-2 text-left text-sm text-gray-700">{t("form.step2.page4.fields.courtLocation", "Court Location")}</th>
              <th className="px-3 py-2 text-sm text-gray-700"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((row, i) => {
              const rowErr = (errors.criminalRecords as any)?.[i] || {};
              return (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 align-top">
                    <input {...register(`criminalRecords.${i}.offense`)} className="w-full rounded-md border-gray-300 focus:ring-sky-500" data-field={`criminalRecords.${i}.offense`} />
                    {rowErr?.offense && <p className="text-red-500 text-xs mt-1">{rowErr.offense.message}</p>}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="date"
                      {...register(`criminalRecords.${i}.dateOfSentence`)}
                      className="w-full rounded-md border-gray-300 focus:ring-sky-500"
                      data-field={`criminalRecords.${i}.dateOfSentence`}
                    />
                    {rowErr?.dateOfSentence && <p className="text-red-500 text-xs mt-1">{rowErr.dateOfSentence.message}</p>}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input {...register(`criminalRecords.${i}.courtLocation`)} className="w-full rounded-md border-gray-300 focus:ring-sky-500" data-field={`criminalRecords.${i}.courtLocation`} />
                    {rowErr?.courtLocation && <p className="text-red-500 text-xs mt-1">{rowErr.courtLocation.message}</p>}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <button type="button" onClick={() => remove(i)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm">
                      <Trash2 className="w-4 h-4" />
                      {t("actions.remove", "Remove")}
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={4} className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => append({ offense: "", dateOfSentence: "", courtLocation: "" })}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-md font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {t("actions.addRow", "Add Row")}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
