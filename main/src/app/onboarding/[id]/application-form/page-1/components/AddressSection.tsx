/**
 * AddressSection.tsx
 *
 *   Captures a dynamic list of address entries (at least 5 years required).
 * - Uses useFieldArray from React Hook Form for repeatable address blocks
 * - Shows one address by default and allows adding more
 * - Triggers immediate validation if duration requirements are not met
 * - Uses localized field labels (Postal Code vs Zip Code)
 * - Designed for DriveDock's bilingual UI + error feedback experience
 */

"use client";

import { useTranslation } from "react-i18next";
import { useFormContext, useFieldArray } from "react-hook-form";
import { useRef, useEffect, useState } from "react";
import { IApplicationFormPage1 } from "@/types/applicationForm.types";
import { Upload } from "lucide-react";
import { useCompanySelection } from "@/hooks/useCompanySelection";

export default function AddressSection() {
  const { t } = useTranslation("common");
  const { selectedCompany } = useCompanySelection();

  const {
    register,
    control,
    trigger,
    watch,
    formState: { errors },
  } = useFormContext<IApplicationFormPage1>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });

  const watchedAddresses = watch("addresses");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);

  // Re-trigger address validation on change
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (errors.addresses) {
        trigger("addresses");
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [watchedAddresses, errors.addresses, trigger]);

  useEffect(() => {
    if (errors.addresses?.message) {
      setHasSubmitted(true);
    }
  }, [errors.addresses?.message]);

  const getPostalCodeLabel = () =>
    selectedCompany?.countryCode === "US"
      ? t("form.fields.zipCode")
      : t("form.fields.postalCode");

  const getPostalCodePlaceholder = () =>
    selectedCompany?.countryCode === "US"
      ? t("form.placeholders.zipCode")
      : t("form.placeholders.postalCode");

  const getSubtitleText = () => {
    const durationError =
      typeof errors.addresses?.message === "string" &&
      errors.addresses.message.includes("5 years");
    return durationError && hasSubmitted
      ? t("form.errors.addressDurationError")
      : t("form.page1.sections.address.subtitle");
  };

  const getSubtitleClassName = () => {
    const base = "text-center text-sm mt-2";
    return typeof errors.addresses?.message === "string" &&
      errors.addresses.message.includes("5 years") &&
      hasSubmitted
      ? `${base} text-red-600 font-medium`
      : `${base} text-gray-600`;
  };

  const handleAdd = () => {
    append({
      address: "",
      city: "",
      stateOrProvince: "",
      postalCode: "",
      from: "",
      to: "",
    });
  };

  const addressErrors = errors.addresses as any[] | undefined;

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">
          {t("form.page1.sections.address.title")}
        </h2>
        <p className={getSubtitleClassName()}>{getSubtitleText()}</p>
      </div>

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="space-y-4 border border-gray-300 p-4 rounded-lg relative bg-white mt-0"
        >
          {index > 0 && (
            <button
              type="button"
              onClick={() => remove(index)}
              className="absolute top-3 right-3 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded-md border border-red-200 transition-colors duration-200"
            >
              {t("form.actions.removeAddress")}
            </button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormGroup
              label={t("form.fields.address")}
              name={`addresses.${index}.address`}
              register={register}
              error={addressErrors?.[index]?.address?.message}
            />
            <FormGroup
              label={t("form.fields.city")}
              name={`addresses.${index}.city`}
              register={register}
              error={addressErrors?.[index]?.city?.message}
            />
            <FormGroup
              label={t("form.fields.stateOrProvince")}
              name={`addresses.${index}.stateOrProvince`}
              register={register}
              error={addressErrors?.[index]?.stateOrProvince?.message}
            />
            <FormGroup
              label={getPostalCodeLabel()}
              name={`addresses.${index}.postalCode`}
              placeholder={getPostalCodePlaceholder()}
              register={register}
              error={addressErrors?.[index]?.postalCode?.message}
            />
            <FormGroup
              label={t("form.fields.from")}
              name={`addresses.${index}.from`}
              type="date"
              register={register}
              error={addressErrors?.[index]?.from?.message}
            />
            <FormGroup
              label={t("form.fields.to")}
              name={`addresses.${index}.to`}
              type="date"
              register={register}
              error={addressErrors?.[index]?.to?.message}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        ref={addButtonRef}
        onClick={handleAdd}
        className="mt-6 mx-auto flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors duration-200 font-medium"
      >
        <Upload className="w-4 h-4" />
        {t("form.actions.addAddress")}
      </button>
    </section>
  );
}

/**
 * FormGroup – simple input+label+error group to keep layout consistent
 */
function FormGroup({
  label,
  name,
  type = "text",
  placeholder,
  register,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  register: any;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
      />
      {error && (
        <p className="text-red-500 text-xs mt-1">
          {typeof error === "string" ? error : ""}
        </p>
      )}
    </div>
  );
}
