"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import { ELicenseType } from "@/types/shared.types";
import { FieldErrors } from "react-hook-form";
import { Camera, Upload, X, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { useParams } from "next/navigation";
import useMounted from "@/hooks/useMounted";
import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";

export default function LicenseSection({ disabled = false }: { disabled?: boolean }) {
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

  const [frontPhotoPreview, setFrontPhotoPreview] = useState<string | null>(null);
  const [backPhotoPreview, setBackPhotoPreview] = useState<string | null>(null);
  const [licenseExpiryWarnings, setLicenseExpiryWarnings] = useState<{ [key: number]: string }>({});

  const frontPhotoS3Key = useWatch({ control, name: "licenses.0.licenseFrontPhoto.s3Key" });
  const backPhotoS3Key = useWatch({ control, name: "licenses.0.licenseBackPhoto.s3Key" });
  const licenseExpiryDates = useWatch({ control, name: "licenses" });

  const [frontPhotoStatus, setFrontPhotoStatus] = useState<"idle" | "uploading" | "deleting" | "error">("idle");
  const [backPhotoStatus, setBackPhotoStatus] = useState<"idle" | "uploading" | "deleting" | "error">("idle");
  const [frontPhotoMessage, setFrontPhotoMessage] = useState("");
  const [backPhotoMessage, setBackPhotoMessage] = useState("");

  const validateLicenseExpiry = useCallback(
    (dateValue: string, index: number) => {
      if (!dateValue) {
        setLicenseExpiryWarnings((p) => ({ ...p, [index]: "" }));
        clearErrors(`licenses.${index}.licenseExpiry`);
        return;
      }

      const selectedDate = new Date(dateValue);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const plus30 = new Date();
      plus30.setDate(today.getDate() + 30);
      plus30.setHours(0, 0, 0, 0);
      const plus60 = new Date();
      plus60.setDate(today.getDate() + 60);
      plus60.setHours(0, 0, 0, 0);

      if (selectedDate <= today) {
        setError(`licenses.${index}.licenseExpiry`, { type: "manual", message: "License expiry date cannot be a past or current date" });
        setLicenseExpiryWarnings((p) => ({ ...p, [index]: "" }));
        return;
      }

      clearErrors(`licenses.${index}.licenseExpiry`);

      if (selectedDate <= plus60) {
        const days = Math.ceil((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (selectedDate <= plus30) {
          setError(`licenses.${index}.licenseExpiry`, { type: "manual", message: `License will expire in ${days} days. Please renew your license before proceeding.` });
          setLicenseExpiryWarnings((p) => ({ ...p, [index]: "" }));
        } else {
          setLicenseExpiryWarnings((p) => ({ ...p, [index]: `License will expire in ${days} days` }));
        }
      } else {
        setLicenseExpiryWarnings((p) => ({ ...p, [index]: "" }));
      }
    },
    [setError, clearErrors]
  );

  const handleLicensePhotoUpload = async (file: File | null, side: "front" | "back") => {
    if (disabled) return;

    const fieldKey = side === "front" ? "licenses.0.licenseFrontPhoto" : "licenses.0.licenseBackPhoto";
    const setPreview = side === "front" ? setFrontPhotoPreview : setBackPhotoPreview;
    const setStatus = side === "front" ? setFrontPhotoStatus : setBackPhotoStatus;
    const setMessage = side === "front" ? setFrontPhotoMessage : setBackPhotoMessage;

    if (!file) {
      setValue(fieldKey, undefined, { shouldValidate: true, shouldDirty: true });
      setPreview(null);
      setStatus("idle");
      setMessage("");
      return;
    }

    setStatus("uploading");
    setMessage("");

    try {
      const result = await uploadToS3Presigned({ file, folder: ES3Folder.LICENSES, trackerId: id });
      setValue(fieldKey, result, { shouldValidate: true, shouldDirty: true });

      const reader = new FileReader();
      reader.onload = (e) => setPreview(String(e.target?.result ?? ""));
      reader.readAsDataURL(file);

      setStatus("idle");
      setMessage("Upload successful");
    } catch (error: any) {
      console.error(`License ${side} upload error:`, error);
      setStatus("error");
      setMessage(error.message || `Failed to upload ${side} photo.`);
    }
  };

  const handleLicensePhotoRemove = async (side: "front" | "back", s3Key: string) => {
    if (disabled) return;

    const fieldKey = side === "front" ? "licenses.0.licenseFrontPhoto" : "licenses.0.licenseBackPhoto";
    const setPreview = side === "front" ? setFrontPhotoPreview : setBackPhotoPreview;
    const setStatus = side === "front" ? setFrontPhotoStatus : setBackPhotoStatus;
    const setMessage = side === "front" ? setFrontPhotoMessage : setBackPhotoMessage;

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

    setValue(fieldKey, undefined, { shouldValidate: true, shouldDirty: true });
    setPreview(null);
    setStatus("idle");
  };

  const licenseErrors = errors.licenses as FieldErrors<ApplicationFormPage1Schema>["licenses"];
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
  }, [frontPhotoPreview, frontPhotoS3Key, backPhotoPreview, backPhotoS3Key, methods]);

  useEffect(() => {
    if (mounted && licenseExpiryDates) {
      licenseExpiryDates.forEach((license: any, index: number) => {
        if (license?.licenseExpiry) validateLicenseExpiry(license.licenseExpiry, index);
      });
    }
  }, [licenseExpiryDates, mounted, validateLicenseExpiry]);

  useEffect(() => {
    const currentWarningKeys = Object.keys(licenseExpiryWarnings).map(Number);
    const currentFieldIndices = fields.map((_, index) => index);
    const toRemove = currentWarningKeys.filter((k) => !currentFieldIndices.includes(k));
    if (toRemove.length > 0) {
      setLicenseExpiryWarnings((prev) => {
        const next = { ...prev };
        toRemove.forEach((k) => delete next[k]);
        return next;
      });
    }
  }, [fields, licenseExpiryWarnings]);

  if (!mounted) return null;

  const inputCls = "py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md disabled:bg-gray-100 disabled:text-gray-500";
  const selectCls = "py-2 px-3 mt-1 block w-full rounded-md bg-gray-100 text-gray-700 border border-gray-300 disabled:opacity-70";
  const iconBtnCls = "absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed";
  const dashedBoxCls =
    "cursor-pointer flex flex-col items-center justify-center py-6 px-4 mt-1 w-full text-sm text-gray-600 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 transition-all duration-200 group hover:bg-gray-100 hover:border-gray-400 disabled:opacity-60";
  const addBtnCls =
    "mt-6 mx-auto flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed";
  const removeBtnCls = "absolute top-3 right-3 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded-md border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <h2 className="text-center text-lg font-semibold text-gray-800">{t("form.step2.page1.sections.license")}</h2>

      {fields.map((field, index) => (
        <div key={field.id} className="space-y-4 border border-gray-300 p-4 rounded-lg relative bg-white">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium text-gray-500">{index === 0 ? t("form.step2.page1.sections.license") : `${t("form.step2.page1.sections.license")} ${index + 1}`}</h4>
            {index > 0 && (
              <button type="button" onClick={() => !disabled && remove(index)} disabled={disabled} className={removeBtnCls}>
                {t("form.step2.page1.actions.removeLicense")}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.step2.page1.fields.licenseNumber")}</label>
              <input type="text" {...register(`licenses.${index}.licenseNumber`)} className={inputCls} data-field={`licenses.${index}.licenseNumber`} disabled={disabled} />
              {licenseErrors?.[index]?.licenseNumber && <p className="text-red-500 text-sm mt-1">{licenseErrors?.[index]?.licenseNumber?.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.step2.page1.fields.licenseProvince")}</label>
              <input type="text" {...register(`licenses.${index}.licenseStateOrProvince`)} className={inputCls} data-field={`licenses.${index}.licenseStateOrProvince`} disabled={disabled} />
              {licenseErrors?.[index]?.licenseStateOrProvince && <p className="text-red-500 text-sm mt-1">{licenseErrors?.[index]?.licenseStateOrProvince?.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.step2.page1.fields.licenseType")}</label>

              {index === 0 ? (
                <input type="text" value="AZ" readOnly {...register(`licenses.${index}.licenseType`)} className={selectCls} data-field={`licenses.${index}.licenseType`} disabled={true} />
              ) : (
                <select {...register(`licenses.${index}.licenseType`)} defaultValue={ELicenseType.Other} className={selectCls} data-field={`licenses.${index}.licenseType`} disabled={disabled}>
                  {Object.values(ELicenseType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              )}

              {licenseErrors?.[index]?.licenseType && <p className="text-red-500 text-sm mt-1">{licenseErrors?.[index]?.licenseType?.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.step2.page1.fields.licenseExpiry")}</label>
              <input type="date" {...register(`licenses.${index}.licenseExpiry`)} className={inputCls} data-field={`licenses.${index}.licenseExpiry`} disabled={disabled} />
              {licenseErrors?.[index]?.licenseExpiry && <p className="text-red-500 text-sm mt-1">{licenseErrors?.[index]?.licenseExpiry?.message}</p>}
              {licenseExpiryWarnings[index] && (
                <p className="text-yellow-600 text-sm mt-1 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {licenseExpiryWarnings[index]}
                </p>
              )}
            </div>
          </div>

          {/* Photo upload - only for first license */}
          {index === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Front */}
              <div data-field="licenses.0.licenseFrontPhoto">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.step2.page1.fields.licenseFrontPhoto")}</label>
                {frontPhotoPreview ? (
                  <div className="relative">
                    <Image src={frontPhotoPreview} alt="License Front Preview" width={400} height={128} className="w-full h-32 object-cover rounded-lg border border-gray-300" />
                    <button
                      type="button"
                      onClick={() => handleLicensePhotoRemove("front", frontPhotoS3Key)}
                      disabled={disabled || frontPhotoStatus === "uploading" || frontPhotoStatus === "deleting"}
                      className={iconBtnCls}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="licenseFrontPhoto" className={dashedBoxCls}>
                    <Camera className="w-8 h-8 text-gray-400 mb-2 group-hover:text-gray-600" />
                    <span className="font-medium text-gray-400">{t("form.step2.page1.fields.licensePhotoDesc")}</span>
                  </label>
                )}
                <input
                  id="licenseFrontPhoto"
                  type="file"
                  accept="image/*"
                  {...register(`licenses.0.licenseFrontPhoto`)}
                  onChange={(e) => handleLicensePhotoUpload(e.target.files?.[0] || null, "front")}
                  data-field="licenses.0.licenseFrontPhoto"
                  className="hidden"
                  disabled={disabled}
                />
                {frontPhotoStatus !== "uploading" && licenseErrors?.[0]?.licenseFrontPhoto && <p className="text-red-500 text-sm mt-1">{licenseErrors?.[0]?.licenseFrontPhoto?.message?.toString()}</p>}
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
                {frontPhotoStatus === "error" && <p className="text-red-500 text-sm mt-1">{frontPhotoMessage}</p>}
                {!licenseErrors?.[0]?.licenseFrontPhoto && frontPhotoStatus === "idle" && frontPhotoMessage && <p className="text-green-600 text-sm mt-1">{frontPhotoMessage}</p>}
              </div>

              {/* Back */}
              <div data-field="licenses.0.licenseBackPhoto">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.step2.page1.fields.licenseBackPhoto")}</label>
                {backPhotoPreview ? (
                  <div className="relative">
                    <Image src={backPhotoPreview} alt="License Back Preview" width={400} height={128} className="w-full h-32 object-cover rounded-lg border border-gray-300" />
                    <button
                      type="button"
                      onClick={() => handleLicensePhotoRemove("back", backPhotoS3Key)}
                      disabled={disabled || backPhotoStatus === "uploading" || backPhotoStatus === "deleting"}
                      className={iconBtnCls}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="licenseBackPhoto" className={dashedBoxCls}>
                    <Camera className="w-8 h-8 text-gray-400 mb-2 group-hover:text-gray-600" />
                    <span className="font-medium text-gray-400">{t("form.step2.page1.fields.licensePhotoDesc")}</span>
                  </label>
                )}
                <input
                  id="licenseBackPhoto"
                  type="file"
                  accept="image/*"
                  {...register(`licenses.0.licenseBackPhoto`)}
                  onChange={(e) => handleLicensePhotoUpload(e.target.files?.[0] || null, "back")}
                  data-field="licenses.0.licenseBackPhoto"
                  className="hidden"
                  disabled={disabled}
                />
                {backPhotoStatus !== "uploading" && licenseErrors?.[0]?.licenseBackPhoto && <p className="text-red-500 text-sm mt-1">{licenseErrors?.[0]?.licenseBackPhoto?.message?.toString()}</p>}
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
                {backPhotoStatus === "error" && <p className="text-red-500 text-sm mt-1">{backPhotoMessage}</p>}
                {!licenseErrors?.[0]?.licenseBackPhoto && backPhotoStatus === "idle" && backPhotoMessage && <p className="text-green-600 text-sm mt-1">{backPhotoMessage}</p>}
              </div>
            </div>
          )}
        </div>
      ))}

      {canAddMore && (
        <button
          type="button"
          onClick={() =>
            !disabled &&
            append({
              licenseNumber: "",
              licenseStateOrProvince: "",
              licenseType: ELicenseType.Other,
              licenseExpiry: "",
              licenseFrontPhoto: undefined,
              licenseBackPhoto: undefined,
            })
          }
          className={addBtnCls}
          disabled={disabled}
        >
          <Upload className="w-4 h-4" />
          {t("form.step2.page1.actions.addLicense")}
        </button>
      )}
    </section>
  );
}
