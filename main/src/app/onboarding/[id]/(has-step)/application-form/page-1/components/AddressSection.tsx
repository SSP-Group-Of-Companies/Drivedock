"use client";

import { useTranslation } from "react-i18next";
import { useFormContext, useFieldArray, Path } from "react-hook-form";
import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import useMounted from "@/hooks/useMounted";
import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { useCompanySelection } from "@/hooks/frontendHooks/useCompanySelection";

type AddressFieldName = "address" | "city" | "stateOrProvince" | "postalCode" | "from" | "to";

const ADDRESS_FIELDS = [
  { name: "address", labelKey: "form.step2.page1.fields.address" },
  { name: "city", labelKey: "form.step2.page1.fields.city" },
  { name: "stateOrProvince", labelKey: "form.step2.page1.fields.stateOrProvince" },
  { name: "postalCode", labelKey: "form.step2.page1.fields.postalCode" },
  { name: "from", labelKey: "form.step2.page1.fields.from", type: "date" as const },
  { name: "to", labelKey: "form.step2.page1.fields.to", type: "date" as const },
] satisfies ReadonlyArray<{ name: AddressFieldName; labelKey: string; type?: "date" }>;

function getAddressesRootErrorMessage(errors: any): string | undefined {
  const addressErrors = errors?.addresses;
  if (!addressErrors) return undefined;
  return (
    addressErrors?.root?.message ?? (typeof addressErrors?.message === "string" ? addressErrors.message : undefined) ?? (Array.isArray(addressErrors?._errors) ? addressErrors._errors[0] : undefined)
  );
}

export default function AddressSection({ disabled = false }: { disabled?: boolean }) {
  const mounted = useMounted();
  const { t } = useTranslation("common");
  const { selectedCompany } = useCompanySelection();

  const {
    register,
    control,
    trigger,
    watch,
    formState: { errors },
  } = useFormContext<ApplicationFormPage1Schema>();

  const [hasSubmitted, setHasSubmitted] = useState(false);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });

  useEffect(() => {
    if (fields.length === 0) {
      append({ address: "", city: "", stateOrProvince: "", postalCode: "", from: "", to: "" });
    }
  }, [fields.length, append]);

  const watchedAddresses = watch("addresses");
  const addressErrors = errors.addresses as any[] | undefined;
  const rootErrorMessage = getAddressesRootErrorMessage(errors);

  useEffect(() => {
    if (errors.addresses) setHasSubmitted(true);
  }, [errors.addresses]);

  useEffect(() => {
    if (!hasSubmitted) return;
    const timeoutId = setTimeout(() => trigger("addresses"), 200);
    return () => clearTimeout(timeoutId);
  }, [hasSubmitted, watchedAddresses, trigger]);

  const getPostalCodeLabel = () => (selectedCompany?.countryCode === "US" ? t("form.step2.page1.fields.zipCode") : t("form.step2.page1.fields.postalCode"));

  const handleAdd = () => {
    if (disabled) return;
    append({ address: "", city: "", stateOrProvince: "", postalCode: "", from: "", to: "" });
  };

  if (!mounted) return null;

  const baseInputCls = "py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md disabled:bg-gray-100 disabled:text-gray-500";

  const actionBtnCls =
    "mt-6 mx-auto flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed";

  const removeBtnCls = "absolute top-3 right-3 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded-md border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800">{t("form.step2.page1.sections.address.title")}</h2>
        <p className="text-center text-sm mt-2 text-gray-600">{t("form.step2.page1.sections.address.subtitle")}</p>
        <div data-field="addresses" />
        <div data-field="addresses.root" />
        {rootErrorMessage && hasSubmitted && <p className="text-red-500 text-sm text-center mt-1">{rootErrorMessage}</p>}
      </div>

      {/* Current Address */}
      {fields.length > 0 && (
        <div className="space-y-4 border border-gray-300 p-4 rounded-lg bg-white relative">
          <h3 className="text-sm font-medium text-blue-700 mb-2">{t("form.step2.page1.sections.address.current")}</h3>
          {renderAddressFields(0)}
        </div>
      )}

      {/* Previous Addresses */}
      {fields.slice(1).map((field, i) => {
        const index = i + 1;
        return (
          <div key={field.id} className="space-y-4 border border-gray-300 p-4 rounded-lg relative bg-white mt-6">
            <button type="button" onClick={() => !disabled && remove(index)} disabled={disabled} className={removeBtnCls}>
              {t("form.step2.page1.actions.removeAddress")}
            </button>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              {t("form.step2.page1.sections.address.previous")} {index}
            </h3>
            {renderAddressFields(index)}
          </div>
        );
      })}

      <button type="button" onClick={handleAdd} disabled={disabled} className={actionBtnCls}>
        <Upload className="w-4 h-4" />
        {t("form.step2.page1.actions.addAddress")}
      </button>
    </section>
  );

  function renderAddressFields(index: number) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ADDRESS_FIELDS.map(({ name, labelKey, type }) => {
          const label = name === "postalCode" ? getPostalCodeLabel() : t(labelKey);
          return (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700">{label}</label>
              <input
                {...register(`addresses.${index}.${name}` as Path<ApplicationFormPage1Schema>)}
                type={type ?? "text"}
                data-field={`addresses.${index}.${name}`}
                className={baseInputCls}
                disabled={disabled}
              />
              {addressErrors?.[index]?.[name] && <p className="text-red-500 text-xs mt-1">{addressErrors[index][name]?.message || ""}</p>}
            </div>
          );
        })}
      </div>
    );
  }
}
