"use client";

import { useTranslation } from "react-i18next";
import { useFormContext, useFieldArray, Path } from "react-hook-form";
import { useEffect, useState } from "react";

import { Upload } from "lucide-react";

//component, types and hooks imports
import useMounted from "@/hooks/useMounted";
import { IApplicationFormPage1 } from "@/types/applicationForm.types";
import { useCompanySelection } from "@/hooks/frontendHooks/useCompanySelection";

// Narrow the valid address field names
type AddressFieldName =
  | "address"
  | "city"
  | "stateOrProvince"
  | "postalCode"
  | "from"
  | "to";

// Config array, now typed so AddressFieldName is actually used
const ADDRESS_FIELDS = [
  { name: "address", labelKey: "form.fields.address" },
  { name: "city", labelKey: "form.fields.city" },
  { name: "stateOrProvince", labelKey: "form.fields.stateOrProvince" },
  { name: "postalCode", labelKey: "form.fields.postalCode" }, // label adjusted below per country
  { name: "from", labelKey: "form.fields.from", type: "date" as const },
  { name: "to", labelKey: "form.fields.to", type: "date" as const },
] satisfies ReadonlyArray<{
  name: AddressFieldName;
  labelKey: string;
  type?: "date";
}>;

export default function AddressSection() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  const { selectedCompany } = useCompanySelection();

  const {
    register,
    control,
    trigger,
    watch,
    formState: { errors },
  } = useFormContext<IApplicationFormPage1>();

  const [hasSubmitted, setHasSubmitted] = useState(false);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });

  // Ensure exactly one blank address appears on first load (when empty)
  useEffect(() => {
    if (fields.length === 0) {
      append({
        address: "",
        city: "",
        stateOrProvince: "",
        postalCode: "",
        from: "",
        to: "",
      });
    }
  }, [fields, append]);

  const watchedAddresses = watch("addresses");
  const addressErrors = errors.addresses as any[] | undefined;

  useEffect(() => {
    if (errors.addresses) setHasSubmitted(true);
  }, [errors.addresses]);

  // Re-validate the array after edits so root-level refinements show up
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (errors.addresses) trigger("addresses");
    }, 300);
    return () => clearTimeout(timeout);
  }, [watchedAddresses, errors.addresses, trigger]);

  const getPostalCodeLabel = () =>
    selectedCompany?.countryCode === "US"
      ? t("form.fields.zipCode")
      : t("form.fields.postalCode");

  const getPostalCodePlaceholder = () =>
    selectedCompany?.countryCode === "US"
      ? t("form.placeholders.zipCode")
      : t("form.placeholders.postalCode");

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

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) return null;
  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">
          {t("form.page1.sections.address.title")}
        </h2>
        <p className="text-center text-sm mt-2 text-gray-600">
          {t("form.page1.sections.address.subtitle")}
        </p>

        {/* Anchor for scrollToError + root array error */}
        <div data-field="addresses.root">
          {typeof errors.addresses?.message === "string" && hasSubmitted && (
            <p className="text-red-500 text-sm text-center mt-1">
              {errors.addresses.message}
            </p>
          )}
        </div>
      </div>

      {/* Current Address (first item) */}
      {fields.length > 0 && (
        <div className="space-y-4 border border-gray-300 p-4 rounded-lg bg-white relative">
          <h3 className="text-sm font-medium text-blue-700 mb-2">
            {t("form.page1.sections.address.current")}
          </h3>
          {renderAddressFields(0)}
        </div>
      )}

      {/* Previous Addresses (rest) */}
      {fields.slice(1).map((field, i) => {
        const index = i + 1;
        return (
          <div
            key={field.id}
            className="space-y-4 border border-gray-300 p-4 rounded-lg bg-white relative mt-6"
          >
            <button
              type="button"
              onClick={() => remove(index)}
              className="absolute top-3 right-3 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded-md border border-red-200"
            >
              {t("form.actions.removeAddress")}
            </button>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {t("form.page1.sections.address.previous")} {index}
            </h3>
            {renderAddressFields(index)}
          </div>
        );
      })}

      <button
        type="button"
        onClick={handleAdd}
        className="mt-6 mx-auto flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-md font-medium"
      >
        <Upload className="w-4 h-4" />
        {t("form.actions.addAddress")}
      </button>
    </section>
  );

  function renderAddressFields(index: number) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ADDRESS_FIELDS.map(({ name, labelKey, type }) => {
          const label =
            name === "postalCode" ? getPostalCodeLabel() : t(labelKey);

          return (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700">
                {label}
              </label>
              <input
                // Use Path<T> to satisfy RHF typing for dynamic keys
                {...register(
                  `addresses.${index}.${name}` as Path<IApplicationFormPage1>
                )}
                type={type ?? "text"}
                placeholder={
                  name === "postalCode" ? getPostalCodePlaceholder() : ""
                }
                data-field={`addresses.${index}.${name}`}
                className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
              />
              {addressErrors?.[index]?.[name] && (
                <p className="text-red-500 text-xs mt-1">
                  {addressErrors[index][name]?.message || ""}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }
}
