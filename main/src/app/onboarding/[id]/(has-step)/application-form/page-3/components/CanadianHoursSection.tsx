"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

import { ApplicationFormPage3Schema } from "@/lib/zodSchemas/applicationFormPage3.schema";
import useMounted from "@/hooks/useMounted";
import FormHelpPopUps from "@/components/shared/FormHelpPopUps";
import useIsDesktop from "@/hooks/useIsDesktop";

export default function CanadianHoursSection() {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<ApplicationFormPage3Schema>();
  const { t } = useTranslation("common");
  const mounted = useMounted();
  const isDesktop = useIsDesktop();

  const { fields } = useFieldArray({
    control,
    name: "canadianHoursOfService.dailyHours",
    keyName: "key",
  });

  const daily = useWatch({
    control,
    name: "canadianHoursOfService.dailyHours",
  });

  useEffect(() => {
    const total = (daily ?? []).reduce((sum, day) => sum + (Number(day?.hours) || 0), 0);
    setValue("canadianHoursOfService.totalHours", total, { shouldDirty: false });
  }, [daily, setValue]);

  if (!mounted) return null;

  return (
    <section className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm">
      <div className="flex items-center justify-center gap-2 mb-2">
        <h2 className="text-xl font-semibold text-gray-800">{t("form.step2.page3.sections.canadianHours")}</h2>
        <FormHelpPopUps content={t("form.helpPopUps.page3CanadianHours")} />
      </div>
      <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">{t("form.step2.page3.instructionsCanadianHours")}</p>

      <div className="space-y-6">
        {/* Day One Date */}
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("form.step2.page3.fields.dayOneDate")}</label>
          <input
            type="date"
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            data-field="canadianHoursOfService.dayOneDate"
            {...register("canadianHoursOfService.dayOneDate")}
          />
          {errors.canadianHoursOfService?.dayOneDate && <p className="text-red-500 text-xs mt-1">{errors.canadianHoursOfService.dayOneDate.message}</p>}
        </div>

        {/* Daily Hours */}
        <div>
          {(() => {
            const hoursErrors = (errors as any)?.canadianHoursOfService?.dailyHours as Array<any> | undefined;
            const hasHoursError = Array.isArray(hoursErrors) && hoursErrors.some((e) => !!e?.hours);
            return hasHoursError ? (
              <div className="mb-3 text-center text-sm text-red-600" data-field="canadianHoursOfService.dailyHours.root">
                {t("form.step2.page3.errors.canadianHoursRoot", "One or more hour entries are invalid. Please enter a value between 0 and 24.")}
              </div>
            ) : null;
          })()}
          {isDesktop ? (
            /* ---------- DESKTOP TABLE ---------- */
            <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-x-auto">
              <table className="w-full table-fixed text-center">
                <thead>
                  <tr>
                    <th className="w-20 py-2 text-sm font-semibold text-gray-700 border-b border-gray-200">{t("form.step2.page3.fields.dayHeader", "Day")}</th>
                    {Array.from({ length: 14 }).map((_, i) => (
                      <th key={`day-h-${i}`} className="py-2 text-sm font-semibold text-gray-700 border-b border-gray-200">
                        {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 text-left pl-4 text-sm font-semibold text-gray-800 border-t">{t("form.step2.page3.fields.hoursHeader", "Hours")}</td>
                    {fields.map((field, index) => (
                      <td key={field.key} className="py-3 border-t">
                        <label className="sr-only">Day {index + 1} hours</label>
                        <input
                          type="number"
                          min={0}
                          max={24}
                          step={0.25}
                          className={`h-10 w-10 mx-auto text-center bg-white border rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            (errors.canadianHoursOfService?.dailyHours as any)?.[index]?.hours ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="0"
                          data-field={`canadianHoursOfService.dailyHours.${index}.hours`}
                          {...register(`canadianHoursOfService.dailyHours.${index}.hours` as const, {
                            setValueAs: (v) => (v === "" || v == null ? 0 : Number(v)),
                          })}
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            /* ---------- MOBILE STACK ---------- */
            <div className="w-full">
              <div className="border border-gray-200 rounded-lg bg-white overflow-hidden w-full">
                <div className="grid grid-cols-[72px_1fr] w-full">
                  <div className="px-3 py-2 text-sm text-center font-semibold text-gray-700 border-b border-black-700">{t("form.step2.page3.fields.dayHeader", "Day")}</div>
                  <div className="px-3 py-2 text-sm text-center font-semibold text-gray-700 border-b border-black-700 border-l border-black-700">
                    {t("form.step2.page3.fields.hoursHeader", "Hours")}
                  </div>
                  {fields.map((field, index) => (
                    <div key={field.key} className="contents">
                      <div className="px-3 py-2 text-sm text-gray-800 border-b border-gray-500 text-center items-center justify-center flex">{index + 1}</div>
                      <div className="px-3 py-2 border-l border-black-700 border-b border-gray-500">
                        <label className="sr-only">Day {index + 1} hours</label>
                        <input
                          type="number"
                          min={0}
                          max={24}
                          step={0.25}
                          className={`w-full text-center bg-white border rounded-md focus:ring-sky-500 focus:outline-none focus:shadow-md text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                            (errors.canadianHoursOfService?.dailyHours as any)?.[index]?.hours ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="0"
                          data-field={`canadianHoursOfService.dailyHours.${index}.hours`}
                          {...register(`canadianHoursOfService.dailyHours.${index}.hours` as const, {
                            setValueAs: (v) => (v === "" || v == null ? 0 : Number(v)),
                          })}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Total Hours */}
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("form.step2.page3.fields.totalHours")}</label>
          <input
            type="number"
            min={0}
            step={0.25}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            readOnly
            data-field="canadianHoursOfService.totalHours"
            {...register("canadianHoursOfService.totalHours", { valueAsNumber: true })}
          />
          {errors.canadianHoursOfService?.totalHours && <p className="text-red-500 text-xs mt-1">{errors.canadianHoursOfService.totalHours.message}</p>}
        </div>
      </div>
    </section>
  );
}
