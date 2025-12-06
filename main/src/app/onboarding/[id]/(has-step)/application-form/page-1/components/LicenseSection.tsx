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
import { useState, useEffect, useCallback } from "react";
import { ELicenseType, EFileMimeType } from "@/types/shared.types";
import { FieldErrors } from "react-hook-form";
import { Upload, X, AlertTriangle, Trash2 } from "lucide-react";
import Image from "next/image";
import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { useParams } from "next/navigation";

//components, types and hooks imports
import useMounted from "@/hooks/useMounted";
import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import UploadPicker from "@/components/media/UploadPicker";

export default function LicenseSection() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  const {
    register,
    control,
    formState: { errors },
    setValue,
    setError,
    clearErrors,
  } = useFormContext<ApplicationFormPage1Schema>();

  const { id } = useParams<{ id: string }>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "licenses",
  });

  const [frontPhotoPreview, setFrontPhotoPreview] = useState<string | null>(
    null
  );
  const [backPhotoPreview, setBackPhotoPreview] = useState<string | null>(null);
  const [licenseExpiryWarnings, setLicenseExpiryWarnings] = useState<{
    [key: number]: string;
  }>({});

  const frontPhotoS3Key = useWatch({
    control,
    name: "licenses.0.licenseFrontPhoto.s3Key",
  });
  const backPhotoS3Key = useWatch({
    control,
    name: "licenses.0.licenseBackPhoto.s3Key",
  });

  // Watch full photo objects so we can detect PDF vs image (for preview mode)
  const frontPhotoData = useWatch({
    control,
    name: "licenses.0.licenseFrontPhoto",
  }) as any;
  const backPhotoData = useWatch({
    control,
    name: "licenses.0.licenseBackPhoto",
  }) as any;

  const isPdfFront =
    frontPhotoData?.mimeType === EFileMimeType.PDF ||
    frontPhotoData?.url?.toLowerCase().endsWith(".pdf");
  const isPdfBack =
    backPhotoData?.mimeType === EFileMimeType.PDF ||
    backPhotoData?.url?.toLowerCase().endsWith(".pdf");

  // Watch all license expiry dates for validation
  const licenseExpiryDates = useWatch({
    control,
    name: "licenses",
  });
  const [frontPhotoStatus, setFrontPhotoStatus] = useState<
    "idle" | "uploading" | "deleting" | "error"
  >("idle");
  const [backPhotoStatus, setBackPhotoStatus] = useState<
    "idle" | "uploading" | "deleting" | "error"
  >("idle");
  const [frontPhotoMessage, setFrontPhotoMessage] = useState("");
  const [backPhotoMessage, setBackPhotoMessage] = useState("");

  // Function to validate license expiry date
  const validateLicenseExpiry = useCallback(
    (dateValue: string, index: number) => {
      if (!dateValue) {
        setLicenseExpiryWarnings((prev) => ({ ...prev, [index]: "" }));
        clearErrors(`licenses.${index}.licenseExpiry`);
        return;
      }

      const selectedDate = new Date(dateValue);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      thirtyDaysFromNow.setHours(0, 0, 0, 0);

      const sixtyDaysFromNow = new Date();
      sixtyDaysFromNow.setDate(today.getDate() + 60);
      sixtyDaysFromNow.setHours(0, 0, 0, 0);

      // Check if date is in the past or today
      if (selectedDate <= today) {
        setError(`licenses.${index}.licenseExpiry`, {
          type: "manual",
          message: "License expiry date cannot be a past or current date",
        });
        setLicenseExpiryWarnings((prev) => ({ ...prev, [index]: "" }));
        return;
      }

      // Clear any previous errors
      clearErrors(`licenses.${index}.licenseExpiry`);

      // Check if date is between 31-60 days (show warning but allow proceeding)
      if (selectedDate <= sixtyDaysFromNow) {
        const daysUntilExpiry = Math.ceil(
          (selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (selectedDate <= thirtyDaysFromNow) {
          setError(`licenses.${index}.licenseExpiry`, {
            type: "manual",
            message: `License will expire in ${daysUntilExpiry} days. Please renew your license before proceeding.`,
          });
          setLicenseExpiryWarnings((prev) => ({ ...prev, [index]: "" }));
        } else {
          setLicenseExpiryWarnings((prev) => ({
            ...prev,
            [index]: `License will expire in ${daysUntilExpiry} days`,
          }));
        }
      } else {
        setLicenseExpiryWarnings((prev) => ({ ...prev, [index]: "" }));
      }
    },
    [setError, clearErrors, setLicenseExpiryWarnings]
  );

  const EMPTY_PHOTO = {
    s3Key: "",
    url: "",
    mimeType: "",
    sizeBytes: 0,
    originalName: "",
  };

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
      setValue(fieldKey, EMPTY_PHOTO, {
        shouldValidate: true,
        shouldDirty: true,
      });
      setPreview(null);
      setStatus("idle");
      setMessage("");
      return;
    }

    // Enforce PDF only on client-side, aligning with updated presign route
    const lowerType = file.type?.toLowerCase() || "";
    const isPdfByMime = lowerType === EFileMimeType.PDF;
    const isPdfByName = file.name?.toLowerCase().endsWith(".pdf");
    if (!isPdfByMime && !isPdfByName) {
      setStatus("error");
      setMessage(
        "Please upload a PDF file for your driver’s license (front/back)."
      );
      return;
    }

    setStatus("uploading");
    setMessage("");

    try {
      const result = await uploadToS3Presigned({
        file,
        folder: ES3Folder.LICENSES,
        trackerId: id,
        // extra safety: backend expects PDF_ONLY for LICENSES
        allowedMimeTypes: [EFileMimeType.PDF],
      });

      setValue(fieldKey, result, { shouldValidate: true, shouldDirty: true });
      // We render PDFs as a card, so no inline image preview needed
      setPreview(null);

      setStatus("idle");
      setMessage("Upload successful");
    } catch (error: any) {
      console.error(`License ${side} upload error:`, error);
      setStatus("error");
      setMessage(
        error.message || `Failed to upload ${side} document. Please use a PDF.`
      );
    }
  };

  const handleLicensePhotoRemove = async (
    side: "front" | "back",
    s3Key?: string
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

        setMessage("Document removed");
      } catch (err) {
        console.error(`Failed to delete temp S3 ${side} document:`, err);
        setStatus("error");
        setMessage("Delete failed");
      }
    }

    setValue(fieldKey, EMPTY_PHOTO, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setPreview(null);
    setStatus("idle");
  };

  const licenseErrors =
    errors.licenses as FieldErrors<ApplicationFormPage1Schema>["licenses"];

  const canAddMore = fields.length < 3;

  const methods = useFormContext<ApplicationFormPage1Schema>();

  // Register license photo fields with RHF
  useEffect(() => {
    register("licenses.0.licenseFrontPhoto");
    register("licenses.0.licenseBackPhoto");
  }, [register]);

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

  // Validate license expiry dates when they change
  useEffect(() => {
    if (mounted && licenseExpiryDates) {
      licenseExpiryDates.forEach((license: any, index: number) => {
        if (license?.licenseExpiry) {
          validateLicenseExpiry(license.licenseExpiry, index);
        }
      });
    }
  }, [licenseExpiryDates, mounted, validateLicenseExpiry]);

  // Clear warnings when licenses are removed
  useEffect(() => {
    const currentWarningKeys = Object.keys(licenseExpiryWarnings).map(Number);
    const currentFieldIndices = fields.map((_, index) => index);

    // Remove warnings for licenses that no longer exist
    const warningsToRemove = currentWarningKeys.filter(
      (key) => !currentFieldIndices.includes(key)
    );
    if (warningsToRemove.length > 0) {
      setLicenseExpiryWarnings((prev) => {
        const newWarnings = { ...prev };
        warningsToRemove.forEach((key) => delete newWarnings[key]);
        return newWarnings;
      });
    }
  }, [fields, licenseExpiryWarnings]);

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) return null;
  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <h2 className="text-center text-lg font-semibold text-gray-800">
        {t("form.step2.page1.sections.license")}
      </h2>

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="space-y-4 border border-gray-300 p-4 rounded-lg relative bg-white"
        >
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium text-gray-500">
              {index === 0
                ? t("form.step2.page1.sections.license")
                : `${t("form.step2.page1.sections.license")} ${index + 1}`}
            </h4>
            {index > 0 && (
              <button
                type="button"
                aria-label={t("form.remove", "Remove")}
                onClick={() => remove(index)}
                className="absolute top-2 right-2 text-red-600 hover:text-red-700"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("form.step2.page1.fields.licenseNumber")}
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
                {t("form.step2.page1.fields.licenseProvince")}
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
                {t("form.step2.page1.fields.licenseType")}
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
                {t("form.step2.page1.fields.licenseExpiry")}
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
              {licenseExpiryWarnings[index] && (
                <p className="text-yellow-600 text-sm mt-1 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {licenseExpiryWarnings[index]}
                </p>
              )}
            </div>
          </div>

          {/* Photo upload fields - only show for first license */}
          {index === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* License Front Document Upload */}
              <div data-field="licenses.0.licenseFrontPhoto">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.step2.page1.fields.licenseFrontPhoto")}
                </label>
                {frontPhotoPreview ? (
                  isPdfFront ? (
                    // PDF card preview
                    <div className="relative flex items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-8 items-center justify-center rounded-md bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                          PDF
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-800">
                            License (front) document uploaded
                          </span>
                          <span className="text-xs text-gray-500 truncate max-w-[220px]">
                            {frontPhotoData?.originalName || "PDF file"}
                          </span>
                          {frontPhotoData?.url && (
                            <a
                              href={frontPhotoData.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-0.5 text-xs text-blue-600 hover:underline"
                            >
                              View PDF
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleLicensePhotoRemove("front", frontPhotoS3Key)
                        }
                        disabled={
                          frontPhotoStatus === "uploading" ||
                          frontPhotoStatus === "deleting"
                        }
                        className="ml-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    // Backwards-compat: image preview for existing image data
                    <div className="relative">
                      <Image
                        src={frontPhotoPreview}
                        alt="License Front Preview"
                        width={400}
                        height={128}
                        className="w-full h-32 object-contain rounded-lg border border-gray-300 bg-white"
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
                  )
                ) : (
                  <UploadPicker
                    label={t("form.step2.page1.fields.licensePhotoDesc")}
                    onPick={(file) => handleLicensePhotoUpload(file, "front")}
                    // PDF-only: no camera; also shows the same guidance (but respects global toggle)
                    mode="pdf"
                    showPdfGuidance
                    accept="application/pdf"
                    className="w-full"
                  />
                )}
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

              {/* License Back Document Upload */}
              <div data-field="licenses.0.licenseBackPhoto">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("form.step2.page1.fields.licenseBackPhoto")}
                </label>
                {backPhotoPreview ? (
                  isPdfBack ? (
                    // PDF card preview
                    <div className="relative flex items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-8 items-center justify-center rounded-md bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                          PDF
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-800">
                            License (back) document uploaded
                          </span>
                          <span className="text-xs text-gray-500 truncate max-w-[220px]">
                            {backPhotoData?.originalName || "PDF file"}
                          </span>
                          {backPhotoData?.url && (
                            <a
                              href={backPhotoData.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-0.5 text-xs text-blue-600 hover:underline"
                            >
                              View PDF
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleLicensePhotoRemove("back", backPhotoS3Key)
                        }
                        disabled={
                          backPhotoStatus === "uploading" ||
                          backPhotoStatus === "deleting"
                        }
                        className="ml-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    // Backwards-compat: image preview for existing image data
                    <div className="relative">
                      <Image
                        src={backPhotoPreview}
                        alt="License Back Preview"
                        width={400}
                        height={128}
                        className="w-full h-32 object-contain rounded-lg border border-gray-300 bg-white"
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
                  )
                ) : (
                  <UploadPicker
                    label={t("form.step2.page1.fields.licensePhotoDesc")}
                    onPick={(file) => handleLicensePhotoUpload(file, "back")}
                    mode="pdf"
                    showPdfGuidance
                    accept="application/pdf"
                    className="w-full"
                  />
                )}
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
          {t("form.step2.page1.actions.addLicense")}
        </button>
      )}
    </section>
  );
}
