// EMPLOYMENT CARD — Refactored like LicenseSection
"use client";

import { useFormContext, FieldErrors, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";
import QuestionGroup from "@/app/onboarding/components/QuestionGroup";

import { calculateTimelineFromCurrent } from "@/lib/frontendConfigs/applicationFormConfigs/validateEmploymentHistory";

interface Props {
  index: number;
}

export default function EmploymentCard({ index }: Props) {
  const {
    register,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useFormContext<ApplicationFormPage2Schema>();

  // Phone formatting functions (copied from page 1)
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6)
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(
      6,
      10
    )}`;
  };

  const handlePhoneChange = (fieldName: `employments.${number}.phone1` | `employments.${number}.phone2`, value: string) => {
    const raw = value.replace(/\D/g, "").slice(0, 10);
    setValue(fieldName, raw, { shouldValidate: true });
  };

  const getDisplayPhone = (value: string) => {
    if (!value) return "";
    return formatPhoneNumber(value);
  };

  const { t } = useTranslation("common");

  const employmentErrors =
    errors?.employments as FieldErrors<ApplicationFormPage2Schema>["employments"];

  const getError = <
    T extends keyof ApplicationFormPage2Schema["employments"][number]
  >(
    name: T
  ) => employmentErrors?.[index]?.[name]?.message?.toString();

  const field = <
    T extends keyof ApplicationFormPage2Schema["employments"][number]
  >(
    name: T
  ): `employments.${number}.${T}` => `employments.${index}.${name}` as const;

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Employer Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.employerName")}
          </label>
          <input
            {...register(field("employerName"))}
            data-field={field("employerName")}
            type="text"
            placeholder="Acme Corp..."
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {getError("employerName") && (
            <p className="text-red-500 text-sm mt-1">
              {getError("employerName")}
            </p>
          )}
        </div>

        {/* Supervisor Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.supervisorName")}
          </label>
          <input
            {...register(field("supervisorName"))}
            data-field={field("supervisorName")}
            type="text"
            placeholder="Jquane Doe"
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {getError("supervisorName") && (
            <p className="text-red-500 text-sm mt-1">
              {getError("supervisorName")}
            </p>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.address")}
          </label>
          <input
            {...register(field("address"))}
            data-field={field("address")}
            type="text"
            placeholder="123 Main St"
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {getError("address") && (
            <p className="text-red-500 text-sm mt-1">{getError("address")}</p>
          )}
        </div>

        {/* Postal Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.postalCode")}
          </label>
          <input
            {...register(field("postalCode"))}
            data-field={field("postalCode")}
            type="text"
            placeholder="A1A 1A1"
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {getError("postalCode") && (
            <p className="text-red-500 text-sm mt-1">
              {getError("postalCode")}
            </p>
          )}
        </div>

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.city")}
          </label>
          <input
            {...register(field("city"))}
            data-field={field("city")}
            type="text"
            placeholder="Toronto"
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {getError("city") && (
            <p className="text-red-500 text-sm mt-1">{getError("city")}</p>
          )}
        </div>

        {/* Province */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.stateOrProvince")}
          </label>
          <input
            {...register(field("stateOrProvince"))}
            data-field={field("stateOrProvince")}
            type="text"
            placeholder="Ontario"
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {getError("stateOrProvince") && (
            <p className="text-red-500 text-sm mt-1">
              {getError("stateOrProvince")}
            </p>
          )}
        </div>

                 {/* Phone 1 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.phone1")}
          </label>
          <div className="relative mt-1">
            <div className="flex">
              {/* Country Code */}
              <div className="flex items-center px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-sm font-medium text-gray-700">
                +1
              </div>

              {/* Phone Input */}
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={getDisplayPhone(
                  useWatch({ control, name: field("phone1") }) || ""
                )}
                onChange={(e) => handlePhoneChange(field("phone1"), e.target.value)}
                data-field={field("phone1")}
                className="flex-1 py-2 px-3 border border-gray-300 rounded-r-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md focus:border-transparent"
              />
            </div>
          </div>
          {getError("phone1") && (
            <p className="text-red-500 text-sm mt-1">{getError("phone1")}</p>
          )}
        </div>

        {/* Phone 2 (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.phone2")} (Optional)
          </label>
          <div className="relative mt-1">
            <div className="flex">
              {/* Country Code */}
              <div className="flex items-center px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-sm font-medium text-gray-700">
                +1
              </div>

              {/* Phone Input */}
              <input
                type="tel"
                placeholder="(555) 987-6543"
                value={getDisplayPhone(
                  useWatch({ control, name: field("phone2") }) || ""
                )}
                onChange={(e) => handlePhoneChange(field("phone2"), e.target.value)}
                data-field={field("phone2")}
                className="flex-1 py-2 px-3 border border-gray-300 rounded-r-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md focus:border-transparent"
              />
            </div>
          </div>
          {getError("phone2") && (
            <p className="text-red-500 text-sm mt-1">{getError("phone2")}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.email")}
          </label>
          <input
            {...register(field("email"))}
            data-field={field("email")}
            type="email"
            placeholder="jquanedeo@AcmeCorp.com"
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {getError("email") && (
            <p className="text-red-500 text-sm mt-1">{getError("email")}</p>
          )}
        </div>

       

        {/* Position Held */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.positionHeld")}
          </label>
          <input
            {...register(field("positionHeld"))}
            data-field={field("positionHeld")}
            type="text"
            placeholder="Truck Driver"
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {getError("positionHeld") && (
            <p className="text-red-500 text-sm mt-1">
              {getError("positionHeld")}
            </p>
          )}
        </div>

        {/* From / To / Salary */}
        <div className="md:col-span-2">
          {/* Timeline-based duration messages */}
          {(() => {
            const fromDate = watch(`employments.${index}.from`);
            const toDate = watch(`employments.${index}.to`);

            if (fromDate && toDate) {
              try {
                const from = new Date(fromDate);
                const to = new Date(toDate);
                const today = new Date();

                // Check for invalid dates
                if (isNaN(from.getTime()) || isNaN(to.getTime())) {
                  return (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-800">
                        Invalid Date Format
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        Please enter valid dates in the correct format.
                      </p>
                    </div>
                  );
                }

                // Check if to date is in the future
                if (to > today) {
                  return (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-800">
                        Invalid End Date
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        End date cannot be in the future. Please enter a valid
                        end date.
                      </p>
                    </div>
                  );
                }

                // Check if from date is in the future
                if (from > today) {
                  return (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-800">
                        Invalid Start Date
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        Start date cannot be in the future. Please enter a valid
                        start date.
                      </p>
                    </div>
                  );
                }

                // Check if from date is after to date
                if (from > to) {
                  return (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-800">
                        Invalid Date Range
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        Start date cannot be after end date. Please correct the
                        date range.
                      </p>
                    </div>
                  );
                }

                // Check if dates are the same (same day employment)
                if (from.toDateString() === to.toDateString()) {
                  return (
                    <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800">
                        Same Day Employment
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Start and end dates are the same. Please verify this is
                        correct.
                      </p>
                    </div>
                  );
                }

                // Use centralized timeline calculation
                const currentEmployments = watch("employments");
                const { totalDays, totalMonths, timeline } =
                  calculateTimelineFromCurrent(currentEmployments);

                // Find this employment in the timeline
                const thisEmployment = timeline.find((emp) =>
                  emp.type === "current" ? index === 0 : emp.index === index
                );

                const thisEmploymentMonths =
                  thisEmployment?.durationMonths || 0;
                const thisEmploymentDays = thisEmployment?.durationDays || 0;

                // For current employment (index 0)
                if (index === 0) {
                  if (thisEmploymentDays < 730) {
                    // Less than 2 years (730 days)
                    return (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm font-medium text-red-800">
                          Employment History Requirement
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          Employment history of 2 or more years is needed.
                          Current duration: {thisEmploymentMonths} months (
                          {thisEmploymentDays} days).
                        </p>
                      </div>
                    );
                  } else if (totalDays >= 730 && totalDays <= 760) {
                    // Exactly 2 years or 2 years + buffer (≤30 days) - green success
                    const isExactly2Years = totalDays === 730;
                    const message = isExactly2Years 
                      ? `You have entered exactly 2 years of employment history in this location. Success!`
                      : `You have entered ${thisEmploymentMonths} months (${thisEmploymentDays} days) of employment history in this location. Success!`;
                    
                    return (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-medium text-green-800">
                          Employment History Valid
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          {message}
                        </p>
                      </div>
                    );
                  } else if (totalDays > 760 && totalDays < 3650) {
                    // Greater than 2 years + 30 days but less than 10 years - yellow warning
                    return (
                      <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm font-medium text-yellow-800">
                          Extended Employment History Required
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Employment duration of {thisEmploymentMonths} months (
                          {thisEmploymentDays} days) detected. You must provide
                          10 years of employment history. Additional employment
                          entries will be required.
                        </p>
                      </div>
                    );
                  } else {
                    // 10+ years total - green success
                    const thisEmploymentYears = Math.floor(thisEmploymentDays / 365);
                    const thisEmploymentMonthsOnly = thisEmploymentMonths % 12;
                    return (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-medium text-green-800">
                          Employment History Complete
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          {thisEmploymentYears} years ({thisEmploymentMonthsOnly} months) of work in this location. 10 year history complete.
                        </p>
                      </div>
                    );
                  }
                }

                // For previous employments (index > 0)
                if (index > 0) {
                  const remainingDays = Math.max(0, 3650 - totalDays); // 3650 days = 10 years
                  const remainingMonths = Math.floor(remainingDays / 30.44);
                  const remainingYears = Math.floor(remainingDays / 365);
                  const remainingMonthsOnly = remainingMonths % 12;
                  const yearsNeededText =
                    remainingDays > 0
                      ? `${remainingYears} years, ${remainingMonthsOnly} months`
                      : "0 years, 0 months";

                  if (totalDays >= 3650 || remainingDays === 0) {
                    // 10+ years total OR no remaining days needed - green success for all entries
                    const thisEmploymentYears = Math.floor(thisEmploymentDays / 365);
                    const thisEmploymentMonthsOnly = thisEmploymentMonths % 12;
                    return (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-medium text-green-800">
                          Employment History Complete
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          {thisEmploymentYears} years ({thisEmploymentMonthsOnly} months) of work in this location. 10 year history complete.
                        </p>
                      </div>
                    );
                  } else {
                    // Incomplete - show years/months format with days when close to 10 years
                    const thisEmploymentYears = Math.floor(thisEmploymentDays / 365);
                    const thisEmploymentMonthsOnly = thisEmploymentMonths % 12;
                    
                    // When remaining time is less than 1 month, show days
                    let remainingText;
                    if (remainingDays < 30 && remainingDays > 0) {
                      remainingText = `${remainingDays} days`;
                    } else if (remainingYears === 0 && remainingMonthsOnly === 0 && remainingDays > 0) {
                      remainingText = `${remainingDays} days`;
                    } else {
                      remainingText = `${remainingYears} years (${remainingMonthsOnly} months)`;
                    }
                    
                    return (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-medium text-blue-800">
                          Previous Employment Entry
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          {thisEmploymentYears} years ({thisEmploymentMonthsOnly} months) of work in this location, {remainingText} history needed to make up for the 10 years.
                        </p>
                      </div>
                    );
                  }
                }
              } catch {
                return (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800">
                      Date Error
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      Please check your date entries and try again.
                    </p>
                  </div>
                );
              }
            }
            return null;
          })()}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("form.fields.from")}
              </label>
              <input
                {...register(field("from"))}
                data-field={field("from")}
                type="date"
                className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
              />
              {getError("from") && (
                <p className="text-red-500 text-sm mt-1">{getError("from")}</p>
              )}
            </div>

            {/* To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("form.fields.to")}
              </label>
              <input
                {...register(field("to"))}
                data-field={field("to")}
                type="date"
                className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
              />
              {getError("to") && (
                <p className="text-red-500 text-sm mt-1">{getError("to")}</p>
              )}
            </div>

            {/* Salary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("form.fields.salary")}
              </label>
              <input
                {...register(field("salary"))}
                data-field={field("salary")}
                type="text"
                placeholder="$50,000/year"
                className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
              />
              {getError("salary") && (
                <p className="text-red-500 text-sm mt-1">
                  {getError("salary")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Reason for Leaving */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.reasonForLeaving")}
          </label>
          <textarea
            {...register(field("reasonForLeaving"))}
            data-field={field("reasonForLeaving")}
            placeholder={t("form.placeholders.reasonForLeaving")}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            rows={2}
          />
          {getError("reasonForLeaving") && (
            <p className="text-red-500 text-sm mt-1">
              {getError("reasonForLeaving")}
            </p>
          )}
        </div>

        {/* FMCSR Question */}
        <div className="md:col-span-2">
          <QuestionGroup
            question={t("form.fields.subjectToFMCSR")}
            value={
              watch(`employments.${index}.subjectToFMCSR`) === true
                ? "Yes"
                : watch(`employments.${index}.subjectToFMCSR`) === false
                ? "No"
                : ""
            }
            onChange={(val) =>
              setValue(`employments.${index}.subjectToFMCSR`, val === "Yes")
            }
          />
          {getError("subjectToFMCSR") && (
            <p className="text-red-500 text-sm mt-1">
              {getError("subjectToFMCSR")}
            </p>
          )}
        </div>

        {/* Safety Sensitive Question */}
        <div className="md:col-span-2">
          <QuestionGroup
            question={t("form.fields.safetySensitiveFunction")}
            value={
              watch(`employments.${index}.safetySensitiveFunction`) === true
                ? "Yes"
                : watch(`employments.${index}.safetySensitiveFunction`) ===
                  false
                ? "No"
                : ""
            }
            onChange={(val) =>
              setValue(
                `employments.${index}.safetySensitiveFunction`,
                val === "Yes"
              )
            }
          />
          {getError("safetySensitiveFunction") && (
            <p className="text-red-500 text-sm mt-1">
              {getError("safetySensitiveFunction")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
