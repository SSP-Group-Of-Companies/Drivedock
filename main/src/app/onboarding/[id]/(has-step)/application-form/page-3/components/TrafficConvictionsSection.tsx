"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState } from "react";

import { ApplicationFormPage3Schema } from "@/lib/zodSchemas/applicationFormPage3.schema";
import useMounted from "@/hooks/useMounted";
import { Trash2 } from "lucide-react";
import useIsDesktop from "@/hooks/useIsDesktop";

export default function TrafficConvictionsSection() {
  const {
    control,
    register,
    setValue,
    clearErrors,
    formState: { errors },
  } = useFormContext<ApplicationFormPage3Schema>();
  const { t } = useTranslation("common");
  const mounted = useMounted();
  const isDesktop = useIsDesktop();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "trafficConvictions",
    keyName: "key",
  });

  const hasTrafficConvictions = useWatch({ control, name: "hasTrafficConvictions" });

  const initialMobileVisible = useMemo(() => {
    const anyData = (idx: number) => {
      const fh: any = (control as any)?._formValues?.trafficConvictions?.[idx];
      return !!fh?.date || !!fh?.location || !!fh?.charge || !!fh?.penalty;
    };
    const count = fields.reduce((acc, _f, i) => (anyData(i) ? i + 1 : acc), 0);
    return Math.min(4, Math.max(1, count));
  }, [fields, control]);

  const [mobileVisibleCount, setMobileVisibleCount] = useState<number>(initialMobileVisible);

  const trafficConvictions = useWatch({ control, name: "trafficConvictions" });
  const clearedRowsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!trafficConvictions) return;
    trafficConvictions.forEach((conviction, index) => {
      const allEmpty = !conviction?.date?.trim() && !conviction?.location?.trim() && !conviction?.charge?.trim() && !conviction?.penalty?.trim();

      if (allEmpty && !clearedRowsRef.current.has(index)) {
        clearErrors([`trafficConvictions.${index}.date`, `trafficConvictions.${index}.location`, `trafficConvictions.${index}.charge`, `trafficConvictions.${index}.penalty`]);
        clearedRowsRef.current.add(index);
      } else if (!allEmpty) {
        clearedRowsRef.current.delete(index);
      }
    });
  }, [trafficConvictions, clearErrors]);

  if (!mounted) return null;

  return (
    <section className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">{t("form.step2.page3.sections.trafficConvictions")}</h2>
      <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">{t("form.step2.page3.instructionsTrafficConvictions")}</p>

      {/* Boolean gate */}
      <div className="mb-4" data-field="hasTrafficConvictions">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-gray-800 text-center">{t("form.step2.page3.questions.hasTrafficConvictions", "Have you ever been convicted of a traffic offense?")}</span>
          <div className="inline-flex rounded-full border border-gray-200 overflow-hidden">
            <button
              type="button"
              className={`px-4 py-1 text-sm ${hasTrafficConvictions === true ? "bg-sky-600 text-white" : "bg-white text-gray-700"}`}
              onClick={() => {
                setValue("hasTrafficConvictions", true, { shouldDirty: true, shouldValidate: true });
                clearErrors(["hasTrafficConvictions", "trafficConvictions"]);
              }}
            >
              {t("form.step1.questions.yes", "Yes")}
            </button>
            <button
              type="button"
              className={`px-4 py-1 text-sm border-l border-gray-300 ${hasTrafficConvictions === false ? "bg-sky-600 text-white" : "bg-white text-gray-700"}`}
              onClick={() => {
                setValue("hasTrafficConvictions", false, { shouldDirty: true, shouldValidate: true });
                clearErrors(["hasTrafficConvictions", "trafficConvictions"]);
              }}
            >
              {t("form.step1.questions.no", "No")}
            </button>
          </div>
        </div>
      </div>

      {/* Root error */}
      {((errors as any)?.hasTrafficConvictions?.message || (errors as any)?.trafficConvictions?.message) && (
        <div className="mb-4 text-center text-sm text-red-600">
          {(errors as any)?.hasTrafficConvictions?.message || (errors as any)?.trafficConvictions?.message}
        </div>
      )}

      {hasTrafficConvictions === true && (
      <div className="overflow-x-auto" data-field="trafficConvictions">
        {isDesktop ? (
          <table className="w-full text-sm border-collapse table">
            <thead>
              <tr className="bg-gray-50 rounded-md shadow-sm">
                <th className="py-3 px-4 text-left font-semibold text-gray-700 text-xs">{t("form.step2.page3.fields.date")}</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700 text-xs">{t("form.step2.page3.fields.location")}</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700 text-xs">{t("form.step2.page3.fields.charge")}</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700 text-xs">{t("form.step2.page3.fields.penalty")}</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {fields.slice(0, 4).map((field, index) => (
                <tr key={field.key} className={`border-b border-gray-100 ${index > 0 ? "bg-gray-25" : ""}`}>
                  <td className="py-3 px-4">
                    <input
                      type="date"
                      className={`h-10 px-2 mt-1 text-center block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md border ${
                        (errors.trafficConvictions as any)?.[index]?.date ? "border-red-500" : "border-gray-200"
                      }`}
                      placeholder="YYYY-MM-DD"
                      data-field={`trafficConvictions.${index}.date`}
                      {...register(`trafficConvictions.${index}.date` as const)}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      className={` py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md border ${
                        (errors.trafficConvictions as any)?.[index]?.location ? "border-red-500" : "border-gray-200"
                      }`}
                      placeholder={index === 0 ? "Toronto, ON" : ""}
                      data-field={`trafficConvictions.${index}.location`}
                      {...register(`trafficConvictions.${index}.location` as const)}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      className={`py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md border ${
                        (errors.trafficConvictions as any)?.[index]?.charge ? "border-red-500" : "border-gray-200"
                      }`}
                      placeholder={index === 0 ? "Speeding" : ""}
                      data-field={`trafficConvictions.${index}.charge`}
                      {...register(`trafficConvictions.${index}.charge` as const)}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      className={`py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md border ${
                        (errors.trafficConvictions as any)?.[index]?.penalty ? "border-red-500" : "border-gray-200"
                      }`}
                      placeholder={index === 0 ? "Fine $150" : ""}
                      data-field={`trafficConvictions.${index}.penalty`}
                      {...register(`trafficConvictions.${index}.penalty` as const)}
                    />
                  </td>
                  {index > 0 && (
                    <td className="py-3 px-2 text-right">
                      <button type="button" className="inline-flex items-center text-red-600 hover:text-red-700" onClick={() => remove(index)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="space-y-4">
            {fields.slice(0, mobileVisibleCount).map((field, index) => (
              <div key={field.key} className="relative grid grid-cols-1 gap-3 border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                {index > 0 && (
                  <button type="button" aria-label={t("form.remove", "Remove")} className="absolute top-2 right-2 text-red-600 hover:text-red-700" onClick={() => { remove(index); setMobileVisibleCount((c) => Math.max(1, c - 1)); }}>
                    <Trash2 size={16} />
                  </button>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t("form.step2.page3.fields.date")}</label>
                  <input
                    type="date"
                    className={`py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md border ${
                      (errors.trafficConvictions as any)?.[index]?.date ? "border-red-500" : "border-gray-200"
                    }`}
                    data-field={`trafficConvictions.${index}.date`}
                    {...register(`trafficConvictions.${index}.date` as const)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t("form.step2.page3.fields.location")}</label>
                  <input
                    type="text"
                    className={`py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md border ${
                      (errors.trafficConvictions as any)?.[index]?.location ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder={index === 0 ? "Toronto, ON" : ""}
                    data-field={`trafficConvictions.${index}.location`}
                    {...register(`trafficConvictions.${index}.location` as const)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t("form.step2.page3.fields.charge")}</label>
                  <input
                    type="text"
                    className={`py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md border ${
                      (errors.trafficConvictions as any)?.[index]?.charge ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder={index === 0 ? "Speeding" : ""}
                    data-field={`trafficConvictions.${index}.charge`}
                    {...register(`trafficConvictions.${index}.charge` as const)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t("form.step2.page3.fields.penalty")}</label>
                  <input
                    type="text"
                    className={`py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md border ${
                      (errors.trafficConvictions as any)?.[index]?.penalty ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder={index === 0 ? "Fine $150" : ""}
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
        )}

        {/* Desktop Add another */}
        {isDesktop && (
          <div className="flex justify-center mt-3">
            <button
              type="button"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm shadow ${
                fields.length >= 4 ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-sky-600 text-white hover:opacity-90"
              }`}
              disabled={fields.length >= 4}
              onClick={() => {
                const maxRows = 4;
                if (fields.length < maxRows) {
                  append({ date: "", location: "", charge: "", penalty: "" });
                  setMobileVisibleCount((c) => Math.min(maxRows, c + 1));
                }
              }}
            >
              {t("form.addMore", "Add another")}
            </button>
          </div>
        )}
      </div>
      )}
    </section>
  );
}
