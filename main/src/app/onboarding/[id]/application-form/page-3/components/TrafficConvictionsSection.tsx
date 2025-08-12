"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ApplicationFormPage3Schema } from "@/lib/zodSchemas/applicationFormPage3.schema";
import useMounted from "@/hooks/useMounted";

export default function TrafficConvictionsSection() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ApplicationFormPage3Schema>();
  const { t } = useTranslation("common");
  const mounted = useMounted();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "trafficConvictions",
  });

  const initialMobileVisible = useMemo(() => {
    const anyData = (idx: number) => {
      const fh: any = (control as any)?._formValues?.trafficConvictions?.[idx];
      return !!fh?.date || !!fh?.location || !!fh?.charge || !!fh?.penalty;
    };
    const count = fields.reduce((acc, _f, i) => (anyData(i) ? i + 1 : acc), 0);
    return Math.min(4, Math.max(1, count));
  }, [fields, control]);

  const [mobileVisibleCount, setMobileVisibleCount] =
    useState<number>(initialMobileVisible);

  if (!mounted) return null;

  return (
    <section className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">
        {t("form.step2.page3.sections.trafficConvictions")}
      </h2>
      <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 relative">
        {t("form.step2.page3.instructionsTrafficConvictions")}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse hidden sm:table">
          <thead>
            <tr className="bg-gray-50 rounded-md shadow-sm">
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-xs">
                {t("form.step2.page3.fields.date")}
              </th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-xs">
                {t("form.step2.page3.fields.location")}
              </th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-xs">
                {t("form.step2.page3.fields.charge")}
              </th>
              <th className="py-3 px-4 text-left font-semibold text-gray-700 text-xs">
                {t("form.step2.page3.fields.penalty")}
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
                      className="h-10 w-32 px-2 mt-1 text-center block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                      placeholder="YYYY-MM-DD"
                      data-field={`trafficConvictions.${index}.date`}
                      {...register(`trafficConvictions.${index}.date` as const)}
                    />
                  ) : (
                    <input
                      type="date"
                      className="h-10 w-32 px-2 mt-1 text-center block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                      data-field={`trafficConvictions.${index}.date`}
                      {...register(`trafficConvictions.${index}.date` as const)}
                    />
                  )}
                  {errors.trafficConvictions?.[index]?.date && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.trafficConvictions[index]?.date?.message}
                    </p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    className="w-full py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                    placeholder={index === 0 ? "Toronto, ON" : ""}
                    data-field={`trafficConvictions.${index}.location`}
                    {...register(
                      `trafficConvictions.${index}.location` as const
                    )}
                  />
                  {errors.trafficConvictions?.[index]?.location && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.trafficConvictions[index]?.location?.message}
                    </p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    className="w-full py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                    placeholder={index === 0 ? "Speeding" : ""}
                    data-field={`trafficConvictions.${index}.charge`}
                    {...register(`trafficConvictions.${index}.charge` as const)}
                  />
                  {errors.trafficConvictions?.[index]?.charge && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.trafficConvictions[index]?.charge?.message}
                    </p>
                  )}
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    className="w-full py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                    placeholder={index === 0 ? "Fine $150" : ""}
                    data-field={`trafficConvictions.${index}.penalty`}
                    {...register(
                      `trafficConvictions.${index}.penalty` as const
                    )}
                  />
                  {errors.trafficConvictions?.[index]?.penalty && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.trafficConvictions[index]?.penalty?.message}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile stacked view */}
        <div className="sm:hidden space-y-4">
          {fields.slice(0, mobileVisibleCount).map((field, index) => (
            <div
              key={field.id}
              className="relative grid grid-cols-1 gap-3 border border-gray-200 rounded-xl p-4 bg-white shadow-sm"
            >
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
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                  data-field={`trafficConvictions.${index}.date`}
                  {...register(`trafficConvictions.${index}.date` as const)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("form.step2.page3.fields.location")}
                </label>
                <input
                  type="text"
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                  data-field={`trafficConvictions.${index}.location`}
                  {...register(`trafficConvictions.${index}.location` as const)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("form.step2.page3.fields.charge")}
                </label>
                <input
                  type="text"
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                  data-field={`trafficConvictions.${index}.charge`}
                  {...register(`trafficConvictions.${index}.charge` as const)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {t("form.step2.page3.fields.penalty")}
                </label>
                <input
                  type="text"
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                  data-field={`trafficConvictions.${index}.penalty`}
                  {...register(`trafficConvictions.${index}.penalty` as const)}
                />
              </div>
            </div>
          ))}

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
                  append({ date: "", location: "", charge: "", penalty: "" });
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
