// EMPLOYMENT CARD — per-row fields + per-location duration line
"use client";

import { useFormContext, FieldErrors, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { differenceInDays } from "date-fns";

import useMounted from "@/hooks/useMounted";
import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";
import QuestionGroup from "@/app/onboarding/components/QuestionGroup";

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

  const { t } = useTranslation("common");
  const mounted = useMounted();

  // ---- errors helpers ----
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

  // ---- phone formatting ----
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
  const handlePhoneChange = (
    fieldName: `employments.${number}.phone1` | `employments.${number}.phone2`,
    value: string
  ) => {
    const raw = value.replace(/\D/g, "").slice(0, 10);
    setValue(fieldName, raw, { shouldValidate: true });
  };
  const getDisplayPhone = (value: string) =>
    value ? formatPhoneNumber(value) : "";

  // watch dates + phones
  const phone1Raw = useWatch({ control, name: field("phone1") }) || "";
  const phone2Raw = useWatch({ control, name: field("phone2") }) || "";
  const fromDate = watch(field("from"));
  const toDate = watch(field("to"));

  // per-location duration (years, months, days) for this row
  const perLocationDuration = (() => {
    if (!fromDate || !toDate) return null;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to < from) return null;

    const days = differenceInDays(to, from) + 1;
    const months = Math.floor(days / 30.44);
    const years = Math.floor(months / 12);
    const monthsOnly = months % 12;
    return { years, months, monthsOnly, days };
  })();


  if (!mounted) return null;

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Employer Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.step2.page2.fields.employerName")}
          </label>
          <input
            {...register(field("employerName"))}
            data-field={field("employerName")}
            type="text"
            placeholder="SSP Group of Comp..."
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
            {t("form.step2.page2.fields.supervisorName")}
          </label>
          <input
            {...register(field("supervisorName"))}
            data-field={field("supervisorName")}
            type="text"
            placeholder="John Doe"
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
            {t("form.step2.page2.fields.address")}
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
            {t("form.step2.page2.fields.postalCode")}
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
            {t("form.step2.page2.fields.city")}
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

        {/* Province/State */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.step2.page2.fields.stateOrProvince")}
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
            {t("form.step2.page2.fields.phone1")}
          </label>
          <div className="relative mt-1">
            <div className="flex">
              <div className="flex items-center px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-sm font-medium text-gray-700">
                +1
              </div>
              <input
                type="tel"
                placeholder="(519) 123-4567"
                value={getDisplayPhone(phone1Raw)}
                onChange={(e) =>
                  handlePhoneChange(field("phone1"), e.target.value)
                }
                data-field={field("phone1")}
                className="flex-1 py-2 px-3 border border-gray-300 rounded-r-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md focus:border-transparent"
              />
            </div>
          </div>
          {getError("phone1") && (
            <p className="text-red-500 text-sm mt-1">{getError("phone1")}</p>
          )}
        </div>

        {/* Phone 2 (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.step2.page2.fields.phone2")}
          </label>
          <div className="relative mt-1">
            <div className="flex">
              <div className="flex items-center px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-sm font-medium text-gray-700">
                +1
              </div>
              <input
                type="tel"
                placeholder="(226) 987-6543"
                value={getDisplayPhone(phone2Raw)}
                onChange={(e) =>
                  handlePhoneChange(field("phone2"), e.target.value)
                }
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
            {t("form.step2.page2.fields.email")}
          </label>
          <input
            {...register(field("email"))}
            data-field={field("email")}
            type="email"
            placeholder="johndoe@company.com"
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {getError("email") && (
            <p className="text-red-500 text-sm mt-1">{getError("email")}</p>
          )}
        </div>

        {/* Position Held */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.step2.page2.fields.positionHeld")}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("form.step2.page2.fields.from")}
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
                {t("form.step2.page2.fields.to")}
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
                {t("form.step2.page2.fields.salary")}
              </label>
              <input
                {...register(field("salary"))}
                data-field={field("salary")}
                type="text"
                placeholder={t("form.step2.page2.fields.salaryPlaceholder")}
                className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
              />
              {getError("salary") && (
                <p className="text-red-500 text-sm mt-1">
                  {getError("salary")}
                </p>
              )}
            </div>
          </div>

          {/* Per-location duration line (always visible when dates valid) */}
          {perLocationDuration && (
            <p className="mt-2 text-xs text-blue-600">
              You have submitted a date range that accounts for{" "}
              <span className="font-medium">
                {perLocationDuration.years} year
                {perLocationDuration.years === 1 ? "" : "s"} (
                {perLocationDuration.months} months, {perLocationDuration.days}{" "}
                days)
              </span>{" "}
              in this location.
            </p>
          )}
        </div>

        {/* Reason for Leaving */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.step2.page2.fields.reasonForLeaving")}
          </label>
          <textarea
            {...register(field("reasonForLeaving"))}
            data-field={field("reasonForLeaving")}
            placeholder="Enter reason for leaving..."
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            rows={2}
          />
          {getError("reasonForLeaving") && (
            <p className="text-red-500 text-sm mt-1">
              {getError("reasonForLeaving")}
            </p>
          )}
        </div>

        {/* FMCSR */}
        <div className="md:col-span-2">
          <QuestionGroup
            question={t("form.step2.page2.fields.subjectToFMCSR")}
            value={
              watch(field("subjectToFMCSR")) === true
                ? "form.yes"
                : watch(field("subjectToFMCSR")) === false
                ? "form.no"
                : ""
            }
            onChange={(val) =>
              setValue(field("subjectToFMCSR"), val === "form.yes", {
                shouldValidate: true,
              })
            }
          />
          {getError("subjectToFMCSR") && (
            <p className="text-red-500 text-sm mt-1">
              {getError("subjectToFMCSR")}
            </p>
          )}
        </div>

        {/* Safety Sensitive */}
        <div className="md:col-span-2">
          <QuestionGroup
            question={t("form.step2.page2.fields.safetySensitiveFunction")}
            value={
              watch(field("safetySensitiveFunction")) === true
                ? "form.yes"
                : watch(field("safetySensitiveFunction")) === false
                ? "form.no"
                : ""
            }
            onChange={(val) =>
              setValue(field("safetySensitiveFunction"), val === "form.yes", {
                shouldValidate: true,
              })
            }
            helpContent={t("form.helpPopups.page2SafetySensitive")}
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
