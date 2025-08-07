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

  // Helper functions for conditional labels and placeholders
  const getPostalCodeLabel = () => {
    return selectedCompany?.countryCode === "US"
      ? t("form.fields.zipCode")
      : t("form.fields.postalCode");
  };

  const getPostalCodePlaceholder = () => {
    return selectedCompany?.countryCode === "US"
      ? t("form.placeholders.zipCode")
      : t("form.placeholders.postalCode");
  };

  // State to track if form has been submitted (for error styling)
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Check if there's an address duration error
  const hasAddressDurationError =
    errors.addresses?.message &&
    typeof errors.addresses.message === "string" &&
    errors.addresses.message.includes("5 years");

  // Get subtitle text and styling
  const getSubtitleText = () => {
    if (hasAddressDurationError && hasSubmitted) {
      return t("form.errors.addressDurationError");
    }
    return t("form.page1.sections.address.subtitle");
  };

  const getSubtitleClassName = () => {
    const baseClass = "text-center text-sm mt-2";
    if (hasAddressDurationError && hasSubmitted) {
      return `${baseClass} text-red-600 font-medium`;
    }
    return `${baseClass} text-gray-600`;
  };

  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });

  const addButtonRef = useRef<HTMLButtonElement | null>(null);

  // Watch address dates to trigger validation immediately
  const watchedAddresses = watch("addresses");

  // Trigger validation when address dates change
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (errors.addresses) {
        trigger("addresses");
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [watchedAddresses, errors.addresses, trigger]);

  // Track form submission for error styling
  useEffect(() => {
    if (errors.addresses?.message) {
      setHasSubmitted(true);
    }
  }, [errors.addresses?.message]);

  const addressErrors = errors.addresses as any[] | undefined;

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

  // Always ensure at least one address entry is rendered
  const hasFirst = fields.length > 0;
  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">
          {t("form.page1.sections.address.title")}
        </h2>
        <p className={getSubtitleClassName()}>{getSubtitleText()}</p>
      </div>

      {/* Invisible anchor for scroll-to-error on array root */}
      {errors.addresses?.message && (
        <p
          className="text-red-500 text-sm text-center mt-1"
          data-field="addresses.root"
        >
          {errors.addresses.message.toString()}
        </p>
      )}

      {/* Always show the first address entry */}
      <div
        key={hasFirst ? fields[0].id : "first-address"}
        className="space-y-4 border border-gray-300 p-4 rounded-lg relative bg-white"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("form.fields.address")}
            </label>
            <input
              {...register(`addresses.0.address`)}
              type="text"
              data-field="addresses.0.address"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
            {addressErrors?.[0]?.address && (
              <p className="text-red-500 text-xs mt-1">
                {typeof addressErrors?.[0]?.address?.message === "string"
                  ? addressErrors[0].address.message
                  : ""}
              </p>
            )}
          </div>
          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("form.fields.city")}
            </label>
            <input
              {...register(`addresses.0.city`)}
              type="text"
              data-field="addresses.0.city"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
            {addressErrors?.[0]?.city && (
              <p className="text-red-500 text-xs mt-1">
                {typeof addressErrors?.[0]?.city?.message === "string"
                  ? addressErrors[0].city.message
                  : ""}
              </p>
            )}
          </div>
          {/* State/Province */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("form.fields.stateOrProvince")}
            </label>
            <input
              {...register(`addresses.0.stateOrProvince`)}
              type="text"
              data-field="addresses.0.stateOrProvince"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
            {addressErrors?.[0]?.stateOrProvince && (
              <p className="text-red-500 text-xs mt-1">
                {typeof addressErrors?.[0]?.stateOrProvince?.message ===
                "string"
                  ? addressErrors[0].stateOrProvince.message
                  : ""}
              </p>
            )}
          </div>
          {/* Postal Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {getPostalCodeLabel()}
            </label>
            <input
              {...register(`addresses.0.postalCode`)}
              type="text"
              placeholder={getPostalCodePlaceholder()}
              data-field="addresses.0.postalCode"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
            {addressErrors?.[0]?.postalCode && (
              <p className="text-red-500 text-xs mt-1">
                {typeof addressErrors?.[0]?.postalCode?.message === "string"
                  ? addressErrors[0].postalCode.message
                  : ""}
              </p>
            )}
          </div>
          {/* From */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("form.fields.from")}
            </label>
            <input
              {...register(`addresses.0.from`)}
              type="date"
              data-field="addresses.0.from"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
            {addressErrors?.[0]?.from && (
              <p className="text-red-500 text-xs mt-1">
                {typeof addressErrors?.[0]?.from?.message === "string"
                  ? addressErrors[0].from.message
                  : ""}
              </p>
            )}
          </div>
          {/* To */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("form.fields.to")}
            </label>
            <input
              {...register(`addresses.0.to`)}
              type="date"
              data-field="addresses.0.to"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
            {addressErrors?.[0]?.to && (
              <p className="text-red-500 text-xs mt-1">
                {typeof addressErrors?.[0]?.to?.message === "string"
                  ? addressErrors[0].to.message
                  : ""}
              </p>
            )}
          </div>
        </div>
      </div>
      {/* Additional addresses (if any) */}
      {fields.length > 1 &&
        fields.slice(1).map((field, index) => (
          <div
            key={field.id}
            className="space-y-4 border border-gray-300 p-4 rounded-lg relative bg-white mt-6"
          >
            <button
              type="button"
              onClick={() => remove(index + 1)}
              className="absolute top-3 right-3 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded-md border border-red-200 transition-colors duration-200"
            >
              {t("form.actions.removeAddress")}
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("form.fields.address")}
                </label>
                <input
                  {...register(`addresses.${index + 1}.address`)}
                  type="text"
                  data-field={`addresses.${index + 1}.address`}
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
                {addressErrors?.[index + 1]?.address && (
                  <p className="text-red-500 text-xs mt-1">
                    {typeof addressErrors?.[index + 1]?.address?.message ===
                    "string"
                      ? addressErrors[index + 1].address.message
                      : ""}
                  </p>
                )}
              </div>
              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("form.fields.city")}
                </label>
                <input
                  {...register(`addresses.${index + 1}.city`)}
                  type="text"
                  data-field={`addresses.${index + 1}.city`}
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
                {addressErrors?.[index + 1]?.city && (
                  <p className="text-red-500 text-xs mt-1">
                    {typeof addressErrors?.[index + 1]?.city?.message ===
                    "string"
                      ? addressErrors[index + 1].city.message
                      : ""}
                  </p>
                )}
              </div>
              {/* State/Province */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("form.fields.stateOrProvince")}
                </label>
                <input
                  {...register(`addresses.${index + 1}.stateOrProvince`)}
                  type="text"
                  data-field={`addresses.${index + 1}.stateOrProvince`}
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
                {addressErrors?.[index + 1]?.stateOrProvince && (
                  <p className="text-red-500 text-xs mt-1">
                    {typeof addressErrors?.[index + 1]?.stateOrProvince
                      ?.message === "string"
                      ? addressErrors[index + 1].stateOrProvince.message
                      : ""}
                  </p>
                )}
              </div>
              {/* Postal Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {getPostalCodeLabel()}
                </label>
                <input
                  {...register(`addresses.${index + 1}.postalCode`)}
                  type="text"
                  placeholder={getPostalCodePlaceholder()}
                  data-field={`addresses.${index + 1}.postalCode`}
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
                {addressErrors?.[index + 1]?.postalCode && (
                  <p className="text-red-500 text-xs mt-1">
                    {typeof addressErrors?.[index + 1]?.postalCode?.message ===
                    "string"
                      ? addressErrors[index + 1].postalCode.message
                      : ""}
                  </p>
                )}
              </div>
              {/* From */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("form.fields.from")}
                </label>
                <input
                  {...register(`addresses.${index + 1}.from`)}
                  type="date"
                  data-field={`addresses.${index + 1}.from`}
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
                {addressErrors?.[index + 1]?.from && (
                  <p className="text-red-500 text-xs mt-1">
                    {typeof addressErrors?.[index + 1]?.from?.message ===
                    "string"
                      ? addressErrors[index + 1].from.message
                      : ""}
                  </p>
                )}
              </div>
              {/* To */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t("form.fields.to")}
                </label>
                <input
                  {...register(`addresses.${index + 1}.to`)}
                  type="date"
                  data-field={`addresses.${index + 1}.to`}
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
                {addressErrors?.[index + 1]?.to && (
                  <p className="text-red-500 text-xs mt-1">
                    {typeof addressErrors?.[index + 1]?.to?.message === "string"
                      ? addressErrors[index + 1].to.message
                      : ""}
                  </p>
                )}
              </div>
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
