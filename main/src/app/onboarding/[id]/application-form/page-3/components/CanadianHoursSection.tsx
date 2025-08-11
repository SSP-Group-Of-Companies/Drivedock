"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

import { ApplicationFormPage3Schema } from "@/lib/zodSchemas/applicationFormPage3.schema";
import useMounted from "@/hooks/useMounted";
import FormHelpPopUps from "@/components/shared/FormHelpPopUps";

export default function CanadianHoursSection() {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<ApplicationFormPage3Schema>();
  const { t } = useTranslation("common");
  const mounted = useMounted();

  const { fields } = useFieldArray({
    control,
    name: "canadianHoursOfService.dailyHours",
  });

  const daily = useWatch({
    control,
    name: "canadianHoursOfService.dailyHours",
  });

  // Calculate total hours whenever daily hours change
  useEffect(() => {
    const total = (daily ?? []).reduce(
      (sum, day) => sum + (Number(day.hours) || 0),
      0
    );
    setValue("canadianHoursOfService.totalHours", total, {
      shouldDirty: false,
    });
  }, [daily, setValue]);

  if (!mounted) return null;

  return (
    <section className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm">
      <div className="flex items-center justify-center gap-2 mb-2">
        <h2 className="text-xl font-semibold text-gray-800">
          {t("form.step2.page3.sections.canadianHours")}
        </h2>
        <FormHelpPopUps content={t("form.helpPopups.page3CanadianHours")} />
      </div>
      <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 relative">
        {t("form.step2.page3.instructionsCanadianHours")}
      </p>

      <div className="space-y-6">
        {/* Day One Date */}
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("form.step2.page3.fields.dayOneDate")}
          </label>
          <input
            type="date"
            className="w-full py-2 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            data-field="canadianHoursOfService.dayOneDate"
            {...register("canadianHoursOfService.dayOneDate")}
          />
          {errors.canadianHoursOfService?.dayOneDate && (
            <p className="text-red-500 text-xs mt-1">
              {errors.canadianHoursOfService.dayOneDate.message}
            </p>
          )}
        </div>

        {/* Daily Hours Grid - Responsive Layout */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Daily Hours (0-24 hours per day)
          </label>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-14 gap-3 items-start">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col items-center">
                  <label className="text-xs font-medium text-gray-700 mb-1">
                    {index + 1}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.25}
                    className="w-[56px] sm:w-full min-w-[48px] h-10 py-2 px-2 text-center bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm text-gray-900 placeholder-gray-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                    data-field={`canadianHoursOfService.dailyHours.${index}.hours`}
                    {...register(
                      `canadianHoursOfService.dailyHours.${index}.hours` as const,
                      {
                        valueAsNumber: true,
                      }
                    )}
                  />
                  {errors.canadianHoursOfService?.dailyHours?.[index]
                    ?.hours && (
                    <p className="text-red-500 text-xs mt-1 text-center">
                      {
                        errors.canadianHoursOfService.dailyHours[index]?.hours
                          ?.message
                      }
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Total Hours */}
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("form.step2.page3.fields.totalHours")}
          </label>
          <input
            type="number"
            min={0}
            step={0.25}
            className="w-full py-2 px-3 rounded-md border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
            readOnly
            data-field="canadianHoursOfService.totalHours"
            {...register("canadianHoursOfService.totalHours", {
              valueAsNumber: true,
            })}
          />
          {errors.canadianHoursOfService?.totalHours && (
            <p className="text-red-500 text-xs mt-1">
              {errors.canadianHoursOfService.totalHours.message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
