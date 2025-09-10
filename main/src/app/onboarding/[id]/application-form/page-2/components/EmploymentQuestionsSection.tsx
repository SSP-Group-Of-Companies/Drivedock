"use client";

import { useFormContext, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useWatch } from "react-hook-form";

import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";
import QuestionGroup from "@/app/onboarding/components/QuestionGroup";

export default function EmploymentQuestionsSection() {
  const { t } = useTranslation("common");
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ApplicationFormPage2Schema>();

  // Watch for conditional rendering
  const workedWithCompanyBefore = useWatch({ control, name: "workedWithCompanyBefore" });

  return (
    <div className="border border-gray-300 bg-white/90 p-6 rounded-xl shadow space-y-4 relative">
      <div className="absolute -top-3 left-6 bg-white px-3">
        <h3 className="text-sm font-bold text-gray-700">Employment Questions</h3>
      </div>

      <div className="space-y-6">
        {/* Have you ever worked with this company before? */}
        <div data-field="workedWithCompanyBefore">
          <Controller
            name="workedWithCompanyBefore"
            control={control}
            render={({ field }) => (
              <QuestionGroup
                question={t("form.step2.page2.questions.workedWithCompanyBefore")}
                value={field.value === undefined ? "" : field.value === true ? "form.yes" : "form.no"}
                onChange={(value) => field.onChange(value === "form.yes")}
                options={[
                  { labelKey: "form.step1.questions.yes", value: "form.yes" },
                  { labelKey: "form.step1.questions.no", value: "form.no" },
                ]}
              />
            )}
          />
          {errors.workedWithCompanyBefore && (
            <p className="text-red-600 text-sm mt-1">{errors.workedWithCompanyBefore.message}</p>
          )}
        </div>

        {/* Conditional fields when workedWithCompanyBefore is true */}
        {workedWithCompanyBefore === true && (
          <div className="space-y-6 pl-4 border-l-2 border-blue-200">
            {/* Reason for leaving company */}
            <div data-field="reasonForLeavingCompany">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("form.step2.page2.questions.reasonForLeavingCompany")}
              </label>
              <textarea
                {...register("reasonForLeavingCompany")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Please explain your reason for leaving..."
              />
              {errors.reasonForLeavingCompany && (
                <p className="text-red-600 text-sm mt-1">{errors.reasonForLeavingCompany.message}</p>
              )}
            </div>

            {/* Previous work details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Previous Work Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* From Date */}
                <div data-field="previousWorkDetails.from">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("form.step2.page2.fields.previousWorkFrom")}
                  </label>
                  <input
                    type="date"
                    {...register("previousWorkDetails.from")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.previousWorkDetails?.from && (
                    <p className="text-red-600 text-sm mt-1">{errors.previousWorkDetails.from.message}</p>
                  )}
                </div>

                {/* To Date */}
                <div data-field="previousWorkDetails.to">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("form.step2.page2.fields.previousWorkTo")}
                  </label>
                  <input
                    type="date"
                    {...register("previousWorkDetails.to")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.previousWorkDetails?.to && (
                    <p className="text-red-600 text-sm mt-1">{errors.previousWorkDetails.to.message}</p>
                  )}
                </div>

                {/* Rate of Pay */}
                <div data-field="previousWorkDetails.rateOfPay">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("form.step2.page2.fields.previousWorkRateOfPay")}
                  </label>
                  <input
                    type="text"
                    {...register("previousWorkDetails.rateOfPay")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="$0.50/mile or $25/hr"
                  />
                  {errors.previousWorkDetails?.rateOfPay && (
                    <p className="text-red-600 text-sm mt-1">{errors.previousWorkDetails.rateOfPay.message}</p>
                  )}
                </div>

                {/* Position */}
                <div data-field="previousWorkDetails.position">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("form.step2.page2.fields.previousWorkPosition")}
                  </label>
                  <input
                    type="text"
                    {...register("previousWorkDetails.position")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Driver, Dispatcher"
                  />
                  {errors.previousWorkDetails?.position && (
                    <p className="text-red-600 text-sm mt-1">{errors.previousWorkDetails.position.message}</p>
                  )}
                </div>
              </div>

              {/* Previous work details validation errors */}
              {errors.previousWorkDetails && typeof errors.previousWorkDetails === 'object' && 'message' in errors.previousWorkDetails && (
                <p className="text-red-600 text-sm mt-1">{errors.previousWorkDetails.message as string}</p>
              )}
            </div>
          </div>
        )}

        {/* Are you currently employed? */}
        <div data-field="currentlyEmployed">
          <Controller
            name="currentlyEmployed"
            control={control}
            render={({ field }) => (
              <QuestionGroup
                question={t("form.step2.page2.questions.currentlyEmployed")}
                value={field.value === undefined ? "" : field.value === true ? "form.yes" : "form.no"}
                onChange={(value) => field.onChange(value === "form.yes")}
                options={[
                  { labelKey: "form.step1.questions.yes", value: "form.yes" },
                  { labelKey: "form.step1.questions.no", value: "form.no" },
                ]}
              />
            )}
          />
          {errors.currentlyEmployed && (
            <p className="text-red-600 text-sm mt-1">{errors.currentlyEmployed.message}</p>
          )}
        </div>

        {/* Who referred you to us? */}
        <div data-field="referredBy">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("form.step2.page2.questions.referredBy")}
          </label>
          <input
            type="text"
            {...register("referredBy")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Employee name, friend, advertisement"
          />
          {errors.referredBy && (
            <p className="text-red-600 text-sm mt-1">{errors.referredBy.message}</p>
          )}
        </div>

        {/* Expected rate of pay */}
        <div data-field="expectedRateOfPay">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("form.step2.page2.questions.expectedRateOfPay")}
          </label>
          <input
            type="text"
            {...register("expectedRateOfPay")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="$0.50/mile or $25/hr"
          />
          {errors.expectedRateOfPay && (
            <p className="text-red-600 text-sm mt-1">{errors.expectedRateOfPay.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
