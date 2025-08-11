"use client";

import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { ApplicationFormPage3Schema } from "@/lib/zodSchemas/applicationFormPage3.schema";
import useMounted from "@/hooks/useMounted";

export default function EducationSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ApplicationFormPage3Schema>();
  const { t } = useTranslation("common");
  const mounted = useMounted();

  if (!mounted) return null;

  return (
    <section className="rounded-2xl border border-gray-200 p-6 bg-white shadow-sm">
      <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">
        {t("form.step2.page3.sections.education")}
      </h2>
      <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 relative">
        {t("form.step2.page3.instructionsEducation")}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Grade School */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("form.step2.page3.fields.gradeSchool")} (Years)
          </label>
          <select
            className="w-full py-2 px-3 rounded-md shadow-inner bg-gray-50 border-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm"
            data-field="education.gradeSchool"
            {...register("education.gradeSchool", {
              valueAsNumber: true,
            })}
          >
            {Array.from({ length: 13 }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          {errors.education?.gradeSchool && (
            <p className="text-red-500 text-xs mt-1">
              {errors.education.gradeSchool.message}
            </p>
          )}
        </div>

        {/* College */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("form.step2.page3.fields.college")} (Years)
          </label>
          <select
            className="w-full py-2 px-3 rounded-md shadow-inner bg-gray-50 border-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm"
            data-field="education.college"
            {...register("education.college", {
              valueAsNumber: true,
            })}
          >
            {Array.from({ length: 5 }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          {errors.education?.college && (
            <p className="text-red-500 text-xs mt-1">
              {errors.education.college.message}
            </p>
          )}
        </div>

        {/* Post Graduate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("form.step2.page3.fields.postGraduate")} (Years)
          </label>
          <select
            className="w-full py-2 px-3 rounded-md shadow-inner bg-gray-50 border-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none text-sm"
            data-field="education.postGraduate"
            {...register("education.postGraduate", {
              valueAsNumber: true,
            })}
          >
            {Array.from({ length: 5 }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          {errors.education?.postGraduate && (
            <p className="text-red-500 text-xs mt-1">
              {errors.education.postGraduate.message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
