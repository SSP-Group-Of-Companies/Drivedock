"use client";

import { useTranslation } from "react-i18next";
import { useFormContext, useFieldArray } from "react-hook-form";
import { useEffect, useState } from "react";
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

  const [hasSubmitted, setHasSubmitted] = useState(false);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });

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
    if (errors.addresses) {
      setHasSubmitted(true);
    }
  }, [errors.addresses]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (errors.addresses) {
        trigger("addresses");
      }
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

  const getSubtitleText = () => t("form.page1.sections.address.subtitle"); // Always static now

  const getSubtitleClassName = () => "text-center text-sm mt-2 text-gray-600";

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

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">
          {t("form.page1.sections.address.title")}
        </h2>
        <p className={getSubtitleClassName()}>{getSubtitleText()}</p>

        {/* Always render the anchor for scrollToError */}
        <div data-field="addresses.root">
          {typeof errors.addresses?.message === "string" && hasSubmitted && (
            <p className="text-red-500 text-sm text-center mt-1">
              {errors.addresses.message}
            </p>
          )}
        </div>
      </div>

      {/* Render Current Address First */}
      {fields.length > 0 && (
        <div className="space-y-4 border border-gray-300 p-4 rounded-lg bg-white relative">
          <h3 className="text-sm font-medium text-blue-700 mb-2">
            {t("form.page1.sections.address.current")}
          </h3>
          {renderAddressFields(0)}
        </div>
      )}

      {/* Render Previous Addresses */}
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

  // Helper to render input fields per address index
  function renderAddressFields(index: number) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { name: "address", label: t("form.fields.address") },
          { name: "city", label: t("form.fields.city") },
          { name: "stateOrProvince", label: t("form.fields.stateOrProvince") },
          {
            name: "postalCode",
            label: getPostalCodeLabel(),
            placeholder: getPostalCodePlaceholder(),
          },
          { name: "from", label: t("form.fields.from"), type: "date" },
          { name: "to", label: t("form.fields.to"), type: "date" },
        ].map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
            </label>
            <input
              {...register(`addresses.${index}.${field.name}` as any)}
              type={field.type || "text"}
              placeholder={field.placeholder || ""}
              data-field={`addresses.${index}.${field.name}`}
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
            {addressErrors?.[index]?.[field.name] && (
              <p className="text-red-500 text-xs mt-1">
                {addressErrors[index][field.name]?.message || ""}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }
}
