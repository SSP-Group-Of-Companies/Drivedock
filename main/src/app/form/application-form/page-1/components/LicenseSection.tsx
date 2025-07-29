"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ELicenseType } from "@/types/shared.types";
import { FieldErrors } from "react-hook-form";
import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { Camera, Upload } from "lucide-react";
import { useEffect } from "react";

export default function LicenseSection() {
  const { t } = useTranslation("common");
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "licenses",
  });

  // Add default license if none exists
  useEffect(() => {
    if (fields.length === 0) {
      append({
        licenseNumber: "",
        licenseStateOrProvince: "",
        licenseType: "AZ",
        licenseExpiry: "",
        licenseFrontPhoto: null,
        licenseBackPhoto: null,
      });
    }
  }, [fields.length, append]);

  const licenseErrors =
    errors.licenses as FieldErrors<ApplicationFormPage1Schema>["licenses"];
  const canAddMore = fields.length < 3;

  // Always ensure at least one license entry is rendered
  const hasFirst = fields.length > 0;
  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">
        {t("form.page1.sections.license")}
      </h2>
      {/* Always show the first license entry */}
      <div
        key={hasFirst ? fields[0].id : "first-license"}
        className="space-y-4 border border-gray-300 p-4 rounded-lg relative bg-white"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* License Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("form.fields.licenseNumber")}
            </label>
            <input
              {...register(`licenses.0.licenseNumber`)}
              type="text"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
            {licenseErrors?.[0]?.licenseNumber && (
              <p className="text-red-500 text-sm mt-1">
                {licenseErrors[0].licenseNumber.message?.toString()}
              </p>
            )}
          </div>
          {/* Province */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("form.fields.licenseProvince")}
            </label>
            <input
              {...register(`licenses.0.licenseStateOrProvince`)}
              type="text"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
            {licenseErrors?.[0]?.licenseStateOrProvince && (
              <p className="text-red-500 text-sm mt-1">
                {licenseErrors[0].licenseStateOrProvince.message?.toString()}
              </p>
            )}
          </div>
          {/* License Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("form.fields.licenseType")}
            </label>
            <div className="py-2 px-3 mt-1 block w-full rounded-md bg-gray-100 text-gray-700 border border-gray-300">
              AZ
            </div>
            <input
              type="hidden"
              {...register(`licenses.0.licenseType`)}
              value="AZ"
            />
            {licenseErrors?.[0]?.licenseType && (
              <p className="text-red-500 text-sm mt-1">
                {licenseErrors[0].licenseType.message?.toString()}
              </p>
            )}
          </div>
          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("form.fields.licenseExpiry")}
            </label>
            <input
              {...register(`licenses.0.licenseExpiry`)}
              type="date"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
            {licenseErrors?.[0]?.licenseExpiry && (
              <p className="text-red-500 text-sm mt-1">
                {licenseErrors[0].licenseExpiry.message?.toString()}
              </p>
            )}
          </div>
        </div>
        {/* Uploads only for first license */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* License Front Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("form.fields.licenseFrontPhoto")}
            </label>
            <label
              htmlFor="licenseFrontPhoto"
              className="cursor-pointer flex flex-col items-center justify-center py-6 px-4 mt-1 w-full text-sm text-gray-600 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 group"
            >
              <Camera className="w-8 h-8 text-gray-400 mb-2 group-hover:text-gray-600" />
              <span className="font-medium text-gray-700">
                Upload Front Photo
              </span>
              <span className="text-xs text-gray-500 mt-1">
                Click to capture or select image
              </span>
            </label>
            <input
              id="licenseFrontPhoto"
              type="file"
              accept="image/*"
              capture="environment" // opens camera on mobile
              {...register(`licenses.0.licenseFrontPhoto`)}
              className="hidden"
            />
            {licenseErrors?.[0]?.licenseFrontPhoto && (
              <p className="text-red-500 text-sm mt-1">
                {licenseErrors[0].licenseFrontPhoto.message?.toString()}
              </p>
            )}
          </div>

          {/* License Back Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("form.fields.licenseBackPhoto")}
            </label>
            <label
              htmlFor="licenseBackPhoto"
              className="cursor-pointer flex flex-col items-center justify-center py-6 px-4 mt-1 w-full text-sm text-gray-600 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 group"
            >
              <Camera className="w-8 h-8 text-gray-400 mb-2 group-hover:text-gray-600" />
              <span className="font-medium text-gray-700">
                Upload Back Photo
              </span>
              <span className="text-xs text-gray-500 mt-1">
                Click to capture or select image
              </span>
            </label>
            <input
              id="licenseBackPhoto"
              type="file"
              accept="image/*"
              capture="environment"
              {...register(`licenses.0.licenseBackPhoto`)}
              className="hidden"
            />
            {licenseErrors?.[0]?.licenseBackPhoto && (
              <p className="text-red-500 text-sm mt-1">
                {licenseErrors[0].licenseBackPhoto.message?.toString()}
              </p>
            )}
          </div>
        </div>
      </div>
      {/* Additional licenses (if any) */}
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
              {t("form.actions.removeLicense")}
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* License Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.fields.licenseNumber")}
                </label>
                <input
                  {...register(`licenses.${index + 1}.licenseNumber`)}
                  type="text"
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
                {licenseErrors?.[index + 1]?.licenseNumber && (
                  <p className="text-red-500 text-sm mt-1">
                    {licenseErrors?.[
                      index + 1
                    ]?.licenseNumber?.message?.toString()}
                  </p>
                )}
              </div>
              {/* Province */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.fields.licenseProvince")}
                </label>
                <input
                  {...register(`licenses.${index + 1}.licenseStateOrProvince`)}
                  type="text"
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
                {licenseErrors?.[index + 1]?.licenseStateOrProvince && (
                  <p className="text-red-500 text-sm mt-1">
                    {licenseErrors?.[
                      index + 1
                    ]?.licenseStateOrProvince?.message?.toString()}
                  </p>
                )}
              </div>
              {/* License Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.fields.licenseType")}
                </label>
                <select
                  {...register(`licenses.${index + 1}.licenseType`)}
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                >
                  <option value="">{t("form.placeholders.select")}</option>
                  {Object.values(ELicenseType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {licenseErrors?.[index + 1]?.licenseType && (
                  <p className="text-red-500 text-sm mt-1">
                    {licenseErrors?.[
                      index + 1
                    ]?.licenseType?.message?.toString()}
                  </p>
                )}
              </div>
              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.fields.licenseExpiry")}
                </label>
                <input
                  {...register(`licenses.${index + 1}.licenseExpiry`)}
                  type="date"
                  className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                />
                {licenseErrors?.[index + 1]?.licenseExpiry && (
                  <p className="text-red-500 text-sm mt-1">
                    {licenseErrors?.[
                      index + 1
                    ]?.licenseExpiry?.message?.toString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      {/* Add License Button */}
      {canAddMore && (
        <button
          type="button"
          onClick={() =>
            append({
              licenseNumber: "",
              licenseStateOrProvince: "",
              licenseType: "",
              licenseExpiry: "",
            })
          }
          className="mt-6 mx-auto flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors duration-200 font-medium"
        >
          <Upload className="w-4 h-4" />
          {t("form.actions.addLicense")}
        </button>
      )}
    </section>
  );
}
