"use client";

import { useTranslation } from "react-i18next";
import { useFormContext, useFieldArray, Path } from "react-hook-form";
import { useEffect, useState, useCallback } from "react";
import { Upload, AlertTriangle } from "lucide-react";

import useMounted from "@/hooks/useMounted";
import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { useCompanySelection } from "@/hooks/frontendHooks/useCompanySelection";

// Narrow the valid address field names
type AddressFieldName =
  | "address"
  | "city"
  | "stateOrProvince"
  | "postalCode"
  | "from"
  | "to";

// Config array, typed so AddressFieldName is actually used
const ADDRESS_FIELDS = [
  { name: "address", labelKey: "form.step2.page1.fields.address" },
  { name: "city", labelKey: "form.step2.page1.fields.city" },
  {
    name: "stateOrProvince",
    labelKey: "form.step2.page1.fields.stateOrProvince",
  },
  { name: "postalCode", labelKey: "form.step2.page1.fields.postalCode" }, // label adjusted below per country
  {
    name: "from",
    labelKey: "form.step2.page1.fields.from",
    type: "date" as const,
  },
  { name: "to", labelKey: "form.step2.page1.fields.to", type: "date" as const },
] satisfies ReadonlyArray<{
  name: AddressFieldName;
  labelKey: string;
  type?: "date";
}>;

// Robustly extract array-root error message for RHF+Zod
function getAddressesRootErrorMessage(errs: any): string | undefined {
  const e = errs?.addresses;
  if (!e) return undefined;
  return (
    e?.root?.message ??
    (typeof e?.message === "string" ? e.message : undefined) ??
    (Array.isArray(e?._errors) ? e._errors[0] : undefined)
  );
}

export default function AddressSection() {
  const mounted = useMounted();
  const { t } = useTranslation("common");
  const { selectedCompany } = useCompanySelection();

  const {
    register,
    control,
    trigger,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<ApplicationFormPage1Schema>();

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [addressToDateWarnings, setAddressToDateWarnings] = useState<{
    [key: number]: string;
  }>({});

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
  const rootErrorMessage = getAddressesRootErrorMessage(errors);

  // Mark that we attempted submit once we see any array error
  useEffect(() => {
    if (errors.addresses) setHasSubmitted(true);
  }, [errors.addresses]);

  // Re-validate only after user edits following a submit attempt
  useEffect(() => {
    if (!hasSubmitted) return;
    const id = setTimeout(() => {
      trigger("addresses");
    }, 200);
    return () => clearTimeout(id);
  }, [hasSubmitted, watchedAddresses, trigger]);

  // Function to validate address "To" date (memoized for stable deps)
  const validateAddressToDate = useCallback(
    (dateValue: string, index: number) => {
      if (!dateValue) {
        setAddressToDateWarnings((prev) => ({ ...prev, [index]: "" }));
        clearErrors(`addresses.${index}.to`);
        return;
      }

      const selectedDate = new Date(dateValue);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time for accurate comparison

      // Future date check
      if (selectedDate > today) {
        setError(`addresses.${index}.to`, {
          type: "manual",
          message: "End date cannot be in the future",
        });
        setAddressToDateWarnings((prev) => ({ ...prev, [index]: "" }));
        return;
      }

      // Clear any previous errors
      clearErrors(`addresses.${index}.to`);
      setAddressToDateWarnings((prev) => ({ ...prev, [index]: "" }));
    },
    [clearErrors, setError]
  );

  // Validate existing "to" dates on mount / when fields change
  useEffect(() => {
    if (mounted && fields.length > 0) {
      fields.forEach((_, index) => {
        const toDate = watch(`addresses.${index}.to`);
        if (toDate) {
          validateAddressToDate(toDate, index);
        }
      });
    }
    // deps: when mounted flips true, fields array identity changes, or validator changes
  }, [mounted, fields, validateAddressToDate, watch]);

  // Clear warnings when addresses are removed
  useEffect(() => {
    const currentWarningKeys = Object.keys(addressToDateWarnings).map(Number);
    const currentFieldIndices = fields.map((_, index) => index);

    const warningsToRemove = currentWarningKeys.filter(
      (key) => !currentFieldIndices.includes(key)
    );
    if (warningsToRemove.length > 0) {
      setAddressToDateWarnings((prev) => {
        const newWarnings = { ...prev };
        warningsToRemove.forEach((key) => delete newWarnings[key]);
        return newWarnings;
      });
    }
  }, [fields, addressToDateWarnings]);

  const getPostalCodeLabel = () =>
    selectedCompany?.countryCode === "US"
      ? t("form.step2.page1.fields.zipCode")
      : t("form.step2.page1.fields.postalCode");

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

  if (!mounted) return null;

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">
          {t("form.step2.page1.sections.address.title")}
        </h2>
        <p className="text-center text-sm mt-2 text-gray-600">
          {t("form.step2.page1.sections.address.subtitle")}
        </p>

        {/* Anchors for scrollToError + root array error */}
        <div data-field="addresses" />
        <div data-field="addresses.root" />
        {rootErrorMessage && hasSubmitted && (
          <p className="text-red-500 text-sm text-center mt-1">
            {rootErrorMessage}
          </p>
        )}
      </div>

      {/* Current Address (first item) */}
      {fields.length > 0 && (
        <div className="space-y-4 border border-gray-300 p-4 rounded-lg bg-white relative">
          <h3 className="text-sm font-medium text-blue-700 mb-2">
            {t("form.step2.page1.sections.address.current")}
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
              {t("form.step2.page1.actions.removeAddress")}
            </button>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {t("form.step2.page1.sections.address.previous")} {index}
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
        {t("form.step2.page1.actions.addAddress")}
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
                {...register(
                  `addresses.${index}.${name}` as Path<ApplicationFormPage1Schema>
                )}
                type={type ?? "text"}
                data-field={`addresses.${index}.${name}`}
                className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                onChange={
                  name === "to"
                    ? (e) => validateAddressToDate(e.target.value, index)
                    : undefined
                }
              />
              {addressErrors?.[index]?.[name] && (
                <p className="text-red-500 text-xs mt-1">
                  {addressErrors[index][name]?.message || ""}
                </p>
              )}
              {name === "to" && addressToDateWarnings[index] && (
                <p className="text-yellow-600 text-xs mt-1 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {addressToDateWarnings[index]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }
}
