/**
 * LicenseSection.tsx
 *
 *   Handles the dynamic list of licenses (max 3), including:
 * - License number, province, type (AZ for first), and expiry
 * - License front/back photo upload for the first entry
 * - Controlled via RHF's useFieldArray
 * - Includes preview thumbnails, validations, and drag-to-upload UI
 */

"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { ELicenseType } from "@/types/shared.types";
import { FieldErrors } from "react-hook-form";
import { Camera, Upload, X } from "lucide-react";
import Image from "next/image";
import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { useParams } from "next/navigation";

//components, types and hooks imports
import useMounted from "@/hooks/useMounted";
import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";

export default function LicenseSection() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  const {
    register,
    control,
    formState: { errors },
    setValue,
  } = useFormContext();

  const { id } = useParams<{ id: string }>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "licenses",
  });

  const [frontPhotoPreview, setFrontPhotoPreview] = useState<string | null>(
    null
  );
  const [backPhotoPreview, setBackPhotoPreview] = useState<string | null>(null);

  const frontPhotoS3Key = useWatch({
    control,
    name: "licenses.0.licenseFrontPhoto.s3Key",
  });
  const backPhotoS3Key = useWatch({
    control,
    name: "licenses.0.licenseBackPhoto.s3Key",
  });
  const [frontPhotoStatus, setFrontPhotoStatus] = useState<
    "idle" | "uploading" | "deleting" | "error"
  >("idle");
  const [backPhotoStatus, setBackPhotoStatus] = useState<
    "idle" | "uploading" | "deleting" | "error"
  >("idle");
  const [frontPhotoMessage, setFrontPhotoMessage] = useState("");
  const [backPhotoMessage, setBackPhotoMessage] = useState("");

  const handleLicensePhotoUpload = async (
    file: File | null,
    side: "front" | "back"
  ) => {
    const fieldKey =
      side === "front"
        ? "licenses.0.licenseFrontPhoto"
        : "licenses.0.licenseBackPhoto";

    const setPreview =
      side === "front" ? setFrontPhotoPreview : setBackPhotoPreview;
    const setStatus =
      side === "front" ? setFrontPhotoStatus : setBackPhotoStatus;
    const setMessage =
      side === "front" ? setFrontPhotoMessage : setBackPhotoMessage;

    if (!file) {
      setValue(fieldKey, undefined, { shouldValidate: true });
      setPreview(null);
      setStatus("idle");
      setMessage("");
      return;
    }

    setStatus("uploading");
    setMessage("");

    try {
      const result = await uploadToS3Presigned({
        file,
        folder: ES3Folder.LICENSES,
        trackerId: id,
      });

      setValue(fieldKey, result, { shouldValidate: true });

      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        setPreview(preview);
      };
      reader.readAsDataURL(file);

      setStatus("idle");
      setMessage("Upload successful");
    } catch (error: any) {
      console.error(`License ${side} upload error:`, error);
      setStatus("error");
      setMessage(error.message || `Failed to upload ${side} photo.`);
    }
  };

  const handleLicensePhotoRemove = async (
    side: "front" | "back",
    s3Key: string
  ) => {
    const fieldKey =
      side === "front"
        ? "licenses.0.licenseFrontPhoto"
        : "licenses.0.licenseBackPhoto";

    const setPreview =
      side === "front" ? setFrontPhotoPreview : setBackPhotoPreview;
    const setStatus =
      side === "front" ? setFrontPhotoStatus : setBackPhotoStatus;
    const setMessage =
      side === "front" ? setFrontPhotoMessage : setBackPhotoMessage;

    setStatus("deleting");
    setMessage("");

    if (s3Key?.startsWith("temp-files/")) {
      try {
        await fetch("/api/v1/delete-temp-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: [s3Key] }),
        });

        setMessage("Photo removed");
      } catch (err) {
        console.error(`Failed to delete temp S3 ${side} photo:`, err);
        setStatus("error");
        setMessage("Delete failed");
      }
    }

    setValue(fieldKey, undefined, { shouldValidate: true });
    setPreview(null);
    setStatus("idle");
  };

  const licenseErrors =
    errors.licenses as FieldErrors<ApplicationFormPage1Schema>["licenses"];

  const canAddMore = fields.length < 3;

  const methods = useFormContext();

  useEffect(() => {
    if (!frontPhotoPreview && frontPhotoS3Key) {
      const frontUrl = methods.getValues("licenses.0.licenseFrontPhoto.url");
      if (frontUrl) setFrontPhotoPreview(frontUrl);
    }

    if (!backPhotoPreview && backPhotoS3Key) {
      const backUrl = methods.getValues("licenses.0.licenseBackPhoto.url");
      if (backUrl) setBackPhotoPreview(backUrl);
    }
  }, [
    frontPhotoPreview,
    frontPhotoS3Key,
    backPhotoPreview,
    backPhotoS3Key,
    methods,
  ]);

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) return null;
  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <h2 className="text-center text-lg font-semibold text-gray-800">
        {t("form.page1.sections.license")}
      </h2>

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="space-y-4 border border-gray-300 p-4 rounded-lg relative bg-white"
        >
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium text-gray-500">
              {index === 0
                ? t("form.page1.sections.license")
                : `${t("form.page1.sections.license")} ${index + 1}`}
            </h4>
            {index > 0 && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                {t("form.actions.removeLicense")}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("form.fields.licenseNumber")}
              </label>
              <input
                type="text"
                {...register(`licenses.${index}.licenseNumber`)}
                className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                data-field={`licenses.${index}.licenseNumber`}
              />
              {licenseErrors?.[index]?.licenseNumber && (
                <p className="text-red-500 text-sm mt-1">
                  {licenseErrors?.[index]?.licenseNumber?.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("form.fields.licenseProvince")}
              </label>
              <input
                type="text"
                {...register(`licenses.${index}.licenseStateOrProvince`)}
                className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                data-field={`licenses.${index}.licenseStateOrProvince`}
              />
              {licenseErrors?.[index]?.licenseStateOrProvince && (
                <p className="text-red-500 text-sm mt-1">
                  {licenseErrors?.[index]?.licenseStateOrProvince?.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("form.fields.licenseType")}
              </label>

              {index === 0 ? (
                <input
                  type="text"
                  value="AZ"
                  readOnly
                  {...register(`licenses.${index}.licenseType`)}
                  className="py-2 px-3 mt-1 block w-full rounded-md bg-gray-100 text-gray-700 border border-gray-300"
                  data-field={`licenses.${index}.licenseType`}
                />
              ) : (
                <select
                  {...register(`licenses.${index}.licenseType`)}
                  defaultValue={ELicenseType.Other}
                  className="py-2 px-3 mt-1 block w-full rounded-md bg-gray-100 text-gray-700 border border-gray-300"
                  data-field={`licenses.${index}.licenseType`}
                >
                  {Object.values(ELicenseType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              )}

              {licenseErrors?.[index]?.licenseType && (
                <p className="text-red-500 text-sm mt-1">
                  {licenseErrors?.[index]?.licenseType?.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("form.fields.licenseExpiry")}
              </label>
              <input
                type="date"
                {...register(`licenses.${index}.licenseExpiry`)}
                className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                data-field={`licenses.${index}.licenseExpiry`}
              />
              {licenseErrors?.[index]?.licenseExpiry && (
                <p className="text-red-500 text-sm mt-1">
                  {licenseErrors?.[index]?.licenseExpiry?.message}
                </p>
              )}
            </div>
          </div>

          {/* Photo upload fields - only show for first license */}
          {index === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* License Front Photo Upload */}
              <div data-field="licenses.0.licenseFrontPhoto">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.fields.licenseFrontPhoto")}
                </label>
                {frontPhotoPreview ? (
                  <div className="relative">
                    <Image
                      src={frontPhotoPreview}
                      alt="License Front Preview"
                      width={400}
                      height={128}
                      className="w-full h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleLicensePhotoRemove("front", frontPhotoS3Key)
                      }
                      disabled={
                        frontPhotoStatus === "uploading" ||
                        frontPhotoStatus === "deleting"
                      }
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="licenseFrontPhoto"
                    className="cursor-pointer flex flex-col items-center justify-center py-6 px-4 mt-1 w-full text-sm text-gray-600 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 group"
                  >
                    <Camera className="w-8 h-8 text-gray-400 mb-2 group-hover:text-gray-600" />
                    <span className="font-medium text-gray-400">
                      {t("form.fields.licensePhotoDesc")}
                    </span>
                  </label>
                )}
                <input
                  id="licenseFrontPhoto"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  {...register(`licenses.0.licenseFrontPhoto`)}
                  onChange={(e) =>
                    handleLicensePhotoUpload(
                      e.target.files?.[0] || null,
                      "front"
                    )
                  }
                  data-field="licenses.0.licenseFrontPhoto"
                  className="hidden"
                />
                {frontPhotoStatus !== "uploading" &&
                  licenseErrors?.[0]?.licenseFrontPhoto && (
                    <p className="text-red-500 text-sm mt-1">
                      {licenseErrors?.[0]?.licenseFrontPhoto?.message?.toString()}
                    </p>
                  )}

                {frontPhotoStatus === "uploading" && (
                  <div className="text-yellow-600 text-sm mt-1 flex items-center">
                    <p className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></p>
                    Uploading...
                  </div>
                )}

                {frontPhotoStatus === "deleting" && (
                  <div className="text-yellow-600 text-sm mt-1 flex items-center">
                    <p className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></p>
                    Deleting...
                  </div>
                )}

                {frontPhotoStatus === "error" && (
                  <p className="text-red-500 text-sm mt-1">
                    {frontPhotoMessage}
                  </p>
                )}

                {!licenseErrors?.[0]?.licenseFrontPhoto &&
                  frontPhotoStatus === "idle" &&
                  frontPhotoMessage && (
                    <p className="text-green-600 text-sm mt-1">
                      {frontPhotoMessage}
                    </p>
                  )}
              </div>

              {/* License Back Photo Upload */}
              <div data-field="licenses.0.licenseBackPhoto">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.fields.licenseBackPhoto")}
                </label>
                {backPhotoPreview ? (
                  <div className="relative">
                    <Image
                      src={backPhotoPreview}
                      alt="License Back Preview"
                      width={400}
                      height={128}
                      className="w-full h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleLicensePhotoRemove("back", backPhotoS3Key)
                      }
                      disabled={
                        backPhotoStatus === "uploading" ||
                        backPhotoStatus === "deleting"
                      }
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="licenseBackPhoto"
                    className="cursor-pointer flex flex-col items-center justify-center py-6 px-4 mt-1 w-full text-sm text-gray-600 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 group"
                  >
                    <Camera className="w-8 h-8 text-gray-400 mb-2 group-hover:text-gray-600" />
                    <span className="font-medium text-gray-400">
                      {t("form.fields.licensePhotoDesc")}
                    </span>
                  </label>
                )}
                <input
                  id="licenseBackPhoto"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  {...register(`licenses.0.licenseBackPhoto`)}
                  onChange={(e) =>
                    handleLicensePhotoUpload(
                      e.target.files?.[0] || null,
                      "back"
                    )
                  }
                  data-field="licenses.0.licenseBackPhoto"
                  className="hidden"
                />
                {backPhotoStatus !== "uploading" &&
                  licenseErrors?.[0]?.licenseBackPhoto && (
                    <p className="text-red-500 text-sm mt-1">
                      {licenseErrors?.[0]?.licenseBackPhoto?.message?.toString()}
                    </p>
                  )}

                {backPhotoStatus === "uploading" && (
                  <div className="text-yellow-600 text-sm mt-1 flex items-center">
                    <p className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></p>
                    Uploading...
                  </div>
                )}

                {backPhotoStatus === "deleting" && (
                  <div className="text-yellow-600 text-sm mt-1 flex items-center">
                    <p className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></p>
                    Deleting...
                  </div>
                )}

                {backPhotoStatus === "error" && (
                  <p className="text-red-500 text-sm mt-1">
                    {backPhotoMessage}
                  </p>
                )}

                {!licenseErrors?.[0]?.licenseBackPhoto &&
                  backPhotoStatus === "idle" &&
                  backPhotoMessage && (
                    <p className="text-green-600 text-sm mt-1">
                      {backPhotoMessage}
                    </p>
                  )}
              </div>
            </div>
          )}
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
              licenseType: ELicenseType.Other,
              licenseExpiry: "",
              licenseFrontPhoto: undefined,
              licenseBackPhoto: undefined,
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
