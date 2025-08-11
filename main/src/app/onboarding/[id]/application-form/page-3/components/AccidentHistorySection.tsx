"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ApplicationFormPage3Schema } from "@/lib/zodSchemas/applicationFormPage3.schema";
import useMounted from "@/hooks/useMounted";

export default function AccidentHistorySection() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ApplicationFormPage3Schema>();
  const { t } = useTranslation("common");
  const mounted = useMounted();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "accidentHistory",
  });

  // Determine how many rows to show on small screens
  const initialMobileVisible = useMemo(() => {
    // Show as many rows as already filled, otherwise 1
    const anyData = (idx: number) => {
      const fh: any = (control as any)?._formValues?.accidentHistory?.[idx];
      return (
        !!fh?.date ||
        !!fh?.natureOfAccident ||
        Number(fh?.fatalities) > 0 ||
        Number(fh?.injuries) > 0
      );
    };
    const count = fields.reduce((acc, _f, i) => (anyData(i) ? i + 1 : acc), 0);
    return Math.min(4, Math.max(1, count));
  }, [fields, control]);

  const [mobileVisibleCount, setMobileVisibleCount] = useState<number>(
    initialMobileVisible
  );

  if (!mounted) return null;

  return (
    <section className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">
        {t("form.step2.page3.sections.accidentHistory")}
      </h2>
      <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 relative">
        {t("form.step2.page3.instructionsAccidentHistory")}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse hidden sm:table">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-xs">
                {t("form.step2.page3.fields.date")}
              </th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-xs">
                {t("form.step2.page3.fields.natureOfAccident")}
              </th>
              <th className="py-3 px-4 text-center font-semibold text-gray-700 text-xs">
                {t("form.step2.page3.fields.fatalities")}
              </th>
              <th className="py-3 px-4 text-center font-semibold text-gray-700 text-xs">
                {t("form.step2.page3.fields.injuries")}
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.slice(0, 4).map((field, index) => (
              <tr
                key={field.id}
                className={`border-b border-gray-100 ${
                  index > 0 ? "bg-gray-25" : ""
                }`}
              >
                <td className="py-3 px-4">
                  {index === 0 ? (
                    <input
                      type="date"
                      className="w-full py-2 px-3 rounded-md shadow-inner bg-gray-50 border-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm"
                      placeholder="YYYY-MM-DD"
                      data-field={`accidentHistory.${index}.date`}
                      {...register(`accidentHistory.${index}.date` as const)}
                    />
                  ) : (
                    <div className="relative">
                      <input
                        type="date"
                        className="w-full py-2 px-3 rounded-md shadow-inner bg-gray-50 border-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm"
                        data-field={`accidentHistory.${index}.date`}
                        {...register(`accidentHistory.${index}.date` as const)}
                      />
                      <svg
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  {errors.accidentHistory?.[index]?.date && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.accidentHistory[index]?.date?.message}
                    </p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    className="w-full py-2 px-3 rounded-md shadow-inner bg-gray-50 border-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm"
                    placeholder={
                      index === 0 ? "e.g., Rear-end collision on highway" : ""
                    }
                    data-field={`accidentHistory.${index}.natureOfAccident`}
                    {...register(
                      `accidentHistory.${index}.natureOfAccident` as const
                    )}
                  />
                  {errors.accidentHistory?.[index]?.natureOfAccident && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.accidentHistory[index]?.natureOfAccident?.message}
                    </p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    min={0}
                    className="w-16 py-2 px-2 text-center rounded-md shadow-inner bg-gray-50 border-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm"
                    placeholder={index === 0 ? "0" : ""}
                    data-field={`accidentHistory.${index}.fatalities`}
                    {...register(
                      `accidentHistory.${index}.fatalities` as const,
                      {
                        valueAsNumber: true,
                      }
                    )}
                  />
                  {errors.accidentHistory?.[index]?.fatalities && (
                    <p className="text-red-500 text-xs mt-1 text-center">
                      {errors.accidentHistory[index]?.fatalities?.message}
                    </p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <input
                    type="number"
                    min={0}
                    className="w-16 py-2 px-2 text-center rounded-md shadow-inner bg-gray-50 border-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm"
                    placeholder={index === 0 ? "0" : ""}
                    data-field={`accidentHistory.${index}.injuries`}
                    {...register(`accidentHistory.${index}.injuries` as const, {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.accidentHistory?.[index]?.injuries && (
                    <p className="text-red-500 text-xs mt-1 text-center">
                      {errors.accidentHistory[index]?.injuries?.message}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile stacked view: show first row and an Add Another button */}
        <div className="sm:hidden space-y-4">
          {fields.slice(0, mobileVisibleCount).map((field, index) => (
            <div key={field.id} className="relative grid grid-cols-1 gap-3 border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
              {index > 0 && (
                <button
                  type="button"
                  aria-label={t("form.remove", "Remove")}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
                  onClick={() => {
                    remove(index);
                    setMobileVisibleCount((c) => Math.max(1, c - 1));
                  }}
                >
                  <X size={16} />
                </button>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("form.step2.page3.fields.date")}
                </label>
                <input
                  type="date"
                  className="w-full py-2 px-3 rounded-md shadow-inner bg-gray-50 border-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm"
                  data-field={`accidentHistory.${index}.date`}
                  {...register(`accidentHistory.${index}.date` as const)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("form.step2.page3.fields.natureOfAccident")}
                </label>
                <input
                  type="text"
                  className="w-full py-2 px-3 rounded-md shadow-inner bg-gray-50 border-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm"
                  data-field={`accidentHistory.${index}.natureOfAccident`}
                  {...register(`accidentHistory.${index}.natureOfAccident` as const)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t("form.step2.page3.fields.fatalities")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full py-2 px-2 text-center rounded-md shadow-inner bg-gray-50 border-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm"
                    data-field={`accidentHistory.${index}.fatalities`}
                    {...register(`accidentHistory.${index}.fatalities` as const, { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t("form.step2.page3.fields.injuries")}
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="w-full py-2 px-2 text-center rounded-md shadow-inner bg-gray-50 border-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm"
                    data-field={`accidentHistory.${index}.injuries`}
                    {...register(`accidentHistory.${index}.injuries` as const, { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Note: No plus/minus logic required for desktop; server normalizes to 4 rows. 
              On mobile we only show the first row but allow user to add more rows for input; 
              extra rows will still be filtered on submit if empty. */}
          <div className="flex justify-center">
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-600 text-white text-sm shadow hover:opacity-90"
              disabled={mobileVisibleCount >= 4}
              onClick={() => {
                const maxRows = 4;
                const cappedExisting = Math.min(fields.length, maxRows);
                if (mobileVisibleCount < cappedExisting) {
                  setMobileVisibleCount((c) => Math.min(maxRows, c + 1));
                  return;
                }
                if (fields.length < maxRows) {
                  append({ date: "", natureOfAccident: "", fatalities: 0, injuries: 0 });
                  setMobileVisibleCount((c) => Math.min(maxRows, c + 1));
                }
              }}
            >
              {t("form.addMore", "Add another")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
