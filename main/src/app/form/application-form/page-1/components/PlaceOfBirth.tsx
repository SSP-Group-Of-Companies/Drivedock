"use client";

import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

export default function PlaceOfBirth() {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { t } = useTranslation("common");

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">
        {t("form.page1.sections.birth")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* City of Birth */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.fields.birthCity")}
          </label>
          <input
            {...register("birthCity")}
            type="text"
            name="birthCity"
            placeholder={t("form.placeholders.birthCity")}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {errors.birthCity && (
            <p className="text-red-500 text-sm mt-1">
              {errors.birthCity.message?.toString()}
            </p>
          )}
        </div>
        {/* State / Province */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.fields.birthStateOrProvince")}
          </label>
          <input
            {...register("birthStateOrProvince")}
            type="text"
            name="birthStateOrProvince"
            placeholder={t("form.placeholders.birthStateOrProvince")}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {errors.birthStateOrProvince && (
            <p className="text-red-500 text-sm mt-1">
              {errors.birthStateOrProvince.message?.toString()}
            </p>
          )}
        </div>
        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.fields.birthCountry")}
          </label>
          <input
            {...register("birthCountry")}
            type="text"
            name="birthCountry"
            placeholder={t("form.placeholders.birthCountry")}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {errors.birthCountry && (
            <p className="text-red-500 text-sm mt-1">
              {errors.birthCountry.message?.toString()}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
