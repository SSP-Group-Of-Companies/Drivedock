"use client";

/**
 * PersonalDetails.tsx
 *
 * Renders the first section of the Driver Application Form:
 * - Name, SIN, DOB, contact info, proof of age checkbox
 * - Debounced SIN availability check
 * - Live age calc + phone formatting
 * - Uses RHF context + i18n
 */

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useEffect } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import Image from "next/image";
import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { useParams } from "next/navigation";

// components, types and hooks
import useMounted from "@/hooks/useMounted";
import TextInput from "@/app/onboarding/components/TextInput";
import PhoneInput from "@/app/onboarding/components/PhoneInput";
import type { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { ECountryCode, EFileMimeType } from "@/types/shared.types";
import { COMPANIES } from "@/constants/companies";
import { useCountrySelection } from "@/hooks/useCountrySelection";
import UploadPicker from "@/components/media/UploadPicker";

// Helpers
const formatPhoneNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(
    6,
    10
  )}`;
};

const getDisplayPhone = (value: string) =>
  value ? formatPhoneNumber(value) : "";

const calculateAge = (dob: string) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  return monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
};

interface PersonalDetailsProps {
  onboardingContext?: IOnboardingTrackerContext | null;
  prequalificationData?: {
    statusInCanada?: string;
  } | null;
}

export default function PersonalDetails({
  onboardingContext,
  prequalificationData,
}: PersonalDetailsProps) {
  const {
    register,
    setValue,
    formState: { errors },
    control,
  } = useFormContext<ApplicationFormPage1Schema>();

  // register the field so RHF tracks touched/dirty/errors as before
  useEffect(() => {
    register("sinPhoto");
  }, [register]);

  const mounted = useMounted();
  const { t } = useTranslation("common");
  const { id } = useParams<{ id: string }>();
  const { selectedCountryCode } = useCountrySelection();

  //  WATCH ALL FIELDS UP FRONT (no hooks in JSX, no conditional hooks)
  const sinValue = useWatch({ control, name: "sin" });
  const genderValue = useWatch({ control, name: "gender" });
  const dobValue = useWatch({ control, name: "dob" });
  const canProvideProofChecked = useWatch({
    control,
    name: "canProvideProofOfAge",
  });
  const sinPhoto = useWatch({ control, name: "sinPhoto" });
  const phoneHomeRaw = useWatch({ control, name: "phoneHome" }) || "";
  const phoneCellRaw = useWatch({ control, name: "phoneCell" }) || "";
  const emergencyPhoneRaw =
    useWatch({ control, name: "emergencyContactPhone" }) || "";

  const [showSIN, setShowSIN] = useState(false);
  const sinPhotoS3Key = sinPhoto?.s3Key || "";
  const sinPhotoUrl = sinPhoto?.url || "";
  const [sinPhotoPreview, setSinPhotoPreview] = useState<string | null>(
    sinPhotoUrl || null
  );

  const [sinValidationStatus, setSinValidationStatus] = useState<
    "idle" | "checking" | "valid" | "invalid"
  >("idle");
  const [sinPhotoStatus, setSinPhotoStatus] = useState<
    "idle" | "uploading" | "deleting" | "error"
  >("idle");
  const [sinPhotoMessage, setSinPhotoMessage] = useState("");
  const [sinValidationMessage, setSinValidationMessage] = useState("");

  const calculatedAge = dobValue ? calculateAge(dobValue) : null;

  // Check if user has Work Permit status from prequalification data
  const hasWorkPermitStatus =
    prequalificationData?.statusInCanada === "Work Permit";

  // Determine the label based on country code
  const getSINLabel = () => {
    if (onboardingContext?.companyId) {
      const company = COMPANIES.find(
        (c) => c.id === onboardingContext.companyId
      );
      if (company)
        return company.countryCode === ECountryCode.US
          ? "SSN (Social Security Number)"
          : "SIN (Social Insurance Number)";
    }
    if (selectedCountryCode)
      return selectedCountryCode === ECountryCode.US
        ? "SSN (Social Security Number)"
        : "SIN (Social Insurance Number)";
    return t("form.step2.page1.fields.sin");
  };

  const [displaySIN, setDisplaySIN] = useState(() =>
    sinValue
      ? sinValue
          .replace(/^(\d{3})(\d)/, "$1-$2")
          .replace(/^(\d{3})-(\d{3})(\d)/, "$1-$2-$3")
      : ""
  );

  const validateSIN = useCallback(
    async (sin: string) => {
      if (sin.length !== 9) return;
      setSinValidationStatus("checking");
      setSinValidationMessage("");

      try {
        const res = await fetch("/api/v1/onboarding/check-sin-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sin, trackerId: id }),
        });

        if (res.ok) {
          setSinValidationStatus("valid");
          setSinValidationMessage("SIN is available");
        } else {
          const data = await res.json();
          setSinValidationStatus("invalid");
          setSinValidationMessage(data.message || "SIN already exists");
        }
      } catch {
        setSinValidationStatus("invalid");
        setSinValidationMessage("Error checking SIN availability");
      }
    },
    [id]
  );

  const debouncedValidateSIN = useCallback(() => {
    let timeout: NodeJS.Timeout;
    return (sin: string) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => validateSIN(sin), 500);
    };
  }, [validateSIN])();

  const handleSINChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setDisplaySIN(input);

    const cleaned = input.replace(/\D/g, "").slice(0, 9);
    setValue("sin", cleaned, { shouldValidate: true });

    if (cleaned.length === 9) {
      debouncedValidateSIN(cleaned);
    } else {
      setSinValidationStatus("idle");
      setSinValidationMessage("");
    }
  };

  const handlePhoneChange = (
    field: "phoneHome" | "phoneCell" | "emergencyContactPhone",
    value: string
  ) => {
    const raw = value.replace(/\D/g, "").slice(0, 10);
    setValue(field, raw, { shouldValidate: true });
  };

  const EMPTY_PHOTO = {
    s3Key: "",
    url: "",
    mimeType: "",
    sizeBytes: 0,
    originalName: "",
  };

  const handleSinPhotoUpload = async (file: File | null) => {
    // Clear
    if (!file) {
      setValue("sinPhoto", EMPTY_PHOTO, { shouldValidate: true });
      setSinPhotoPreview(null);
      setSinPhotoStatus("idle");
      setSinPhotoMessage("");
      return;
    }

    // Enforce PDF only on the client side (aligns with backend presign route)
    const lowerType = file.type?.toLowerCase() || "";
    const isPdfByMime = lowerType === EFileMimeType.PDF;
    const isPdfByName = file.name?.toLowerCase().endsWith(".pdf");
    if (!isPdfByMime && !isPdfByName) {
      setSinPhotoStatus("error");
      setSinPhotoMessage("Please upload a PDF file for your SIN/SSN document.");
      return;
    }

    setSinPhotoStatus("uploading");
    setSinPhotoMessage("");

    try {
      // Direct PDF upload (no cropping)
      const result = await uploadToS3Presigned({
        file,
        folder: ES3Folder.SIN_PHOTOS,
        trackerId: id,
        // extra safety: only allow PDFs here
        allowedMimeTypes: [EFileMimeType.PDF],
      });

      // Update form
      setValue("sinPhoto", result, { shouldValidate: true });
      // No inline image preview for PDF (we show a PDF card below)
      setSinPhotoPreview(null);
      setSinPhotoStatus("idle");
      setSinPhotoMessage("Upload successful");
    } catch (error: any) {
      console.error("SIN document upload failed:", error);
      setSinPhotoStatus("error");
      setSinPhotoMessage(
        error?.message || "Upload failed. Please try again with a PDF file."
      );
    }
  };

  const handleSinPhotoRemove = async () => {
    setSinPhotoStatus("deleting");
    setSinPhotoMessage("");

    if (sinPhotoS3Key?.startsWith("temp-files/")) {
      try {
        await fetch("/api/v1/delete-temp-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: [sinPhotoS3Key] }),
        });
        setSinPhotoMessage("Document removed");
      } catch (err) {
        console.error("Failed to delete temp S3 file:", err);
        setSinPhotoStatus("error");
        setSinPhotoMessage("Delete failed");
      }
    }

    setValue("sinPhoto", EMPTY_PHOTO, { shouldValidate: true });
    setSinPhotoPreview(null);
    setSinPhotoStatus("idle");
  };

  const isPdfSin =
    sinPhoto?.mimeType === EFileMimeType.PDF ||
    (sinPhotoUrl && sinPhotoUrl.toLowerCase().endsWith(".pdf"));

  // 👇 early return AFTER all hooks
  if (!mounted) return null;

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      {/* Hidden fields to prevent autocomplete - more aggressive approach */}
      <input
        type="text"
        style={{ display: "none" }}
        autoComplete="new-password"
        tabIndex={-1}
      />
      <input
        type="email"
        style={{ display: "none" }}
        autoComplete="new-password"
        tabIndex={-1}
      />
      <input
        type="password"
        style={{ display: "none" }}
        autoComplete="new-password"
        tabIndex={-1}
      />
      <input
        type="text"
        name="fake-username"
        style={{ display: "none" }}
        autoComplete="username"
        tabIndex={-1}
      />
      <input
        type="password"
        name="fake-password"
        style={{ display: "none" }}
        autoComplete="current-password"
        tabIndex={-1}
      />

      <h2 className="text-center text-lg font-semibold text-gray-800">
        {t("form.step2.page1.sections.personal")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <TextInput
          name="firstName"
          label={t("form.step2.page1.fields.firstName")}
          placeholder="John"
          error={errors.firstName}
          register={register}
          autoComplete="new-password"
        />

        {/* Last Name */}
        <TextInput
          name="lastName"
          label={t("form.step2.page1.fields.lastName")}
          placeholder="Deo"
          error={errors.lastName}
          register={register}
          autoComplete="new-password"
        />

        {/* Email Address */}
        <TextInput
          name="email"
          label={t("form.step2.page1.fields.email")}
          placeholder="john@gmail.com"
          error={errors.email}
          register={register}
          autoComplete="new-password"
        />

        {/* Gender Selection */}
        <div data-field="gender">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("form.step2.page1.fields.gender")}
          </label>
          <div className="inline-flex w-full rounded-full border border-gray-300 overflow-hidden">
            {["male", "female"].map((option, idx) => {
              const isSelected = genderValue === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    setValue("gender", option as "male" | "female", {
                      shouldValidate: true,
                    })
                  }
                  className={`w-full px-4 py-2 text-sm font-medium transition-all ${
                    isSelected
                      ? "bg-[#0071BC] text-white"
                      : "bg-white text-gray-800 hover:bg-gray-50"
                  } ${idx > 0 ? "border-l border-gray-300" : ""}`}
                >
                  {t(`form.step2.page1.fields.${option}`)}
                </button>
              );
            })}
          </div>
          {errors.gender && (
            <p className="text-red-500 text-sm mt-1">
              {errors.gender.message?.toString()}
            </p>
          )}
        </div>

        {/* SIN Number */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">
            {getSINLabel()}
          </label>

          <input
            type={showSIN ? "text" : "password"}
            placeholder="963-456-789"
            value={displaySIN}
            inputMode="numeric"
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            maxLength={11}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              if (raw.length <= 9) handleSINChange(e);
            }}
            pattern="\d{9}"
            data-field="sin"
            data-lpignore="true"
            data-form-type="other"
            className={`py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md pr-10 ${
              sinValidationStatus === "valid"
                ? "border-green-500 focus:border-green-500"
                : sinValidationStatus === "invalid"
                ? "border-red-500 focus:border-red-500"
                : sinValidationStatus === "checking"
                ? "border-yellow-500 focus:border-yellow-500"
                : ""
            }`}
          />

          <button
            type="button"
            onClick={() => setShowSIN((prev) => !prev)}
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {showSIN ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>

          {/* SIN Validation Status */}
          {sinValidationStatus === "checking" && (
            <div className="text-yellow-600 text-sm mt-1 flex items-center">
              <p className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></p>
              Checking SIN availability...
            </div>
          )}
          {sinValidationStatus === "valid" && (
            <p className="text-green-600 text-sm mt-1 flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {sinValidationMessage}
            </p>
          )}
          {sinValidationStatus === "invalid" && (
            <p className="text-red-500 text-sm mt-1 flex items-center">
              <svg
                className="w-4 h-4 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              {sinValidationMessage}
            </p>
          )}
          {errors.sin && (
            <p className="text-red-500 text-sm mt-1">
              {errors.sin.message?.toString()}
            </p>
          )}
        </div>

        {/* SIN Issue Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.step2.page1.fields.sinIssueDate")}
          </label>
          <input
            {...register("sinIssueDate")}
            type="date"
            name="sinIssueDate"
            data-field="sinIssueDate"
            max={(() => {
              const today = new Date();
              return today.toISOString().split("T")[0];
            })()}
            min={(() => {
              const today = new Date();
              const minDate = new Date(
                today.getFullYear() - 100,
                today.getMonth(),
                today.getDate()
              );
              return minDate.toISOString().split("T")[0];
            })()}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {errors.sinIssueDate && (
            <p className="text-red-500 text-sm mt-1">
              {errors.sinIssueDate.message?.toString()}
            </p>
          )}
        </div>

        {/* SIN Expiry Date - Only for Work Permit holders */}
        {hasWorkPermitStatus && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("form.step2.page1.fields.sinExpiryDate")}
            </label>
            <input
              {...register("sinExpiryDate")}
              type="date"
              name="sinExpiryDate"
              data-field="sinExpiryDate"
              min={(() => {
                const today = new Date();
                return today.toISOString().split("T")[0];
              })()}
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
            />
            {errors.sinExpiryDate && (
              <p className="text-red-500 text-sm mt-1">
                {errors.sinExpiryDate.message?.toString()}
              </p>
            )}
          </div>
        )}

        {/* SIN Document Upload - Full Width */}
        <div className="md:col-span-2" data-field="sinPhoto.s3Key">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.step2.page1.fields.sinPhoto")}
          </label>

          {sinPhotoPreview || sinPhotoUrl ? (
            isPdfSin ? (
              // PDF preview card
              <div className="relative flex items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-8 items-center justify-center rounded-md bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                    PDF
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800">
                      SIN / SSN document uploaded
                    </span>
                    <span className="text-xs text-gray-500 truncate max-w-[220px]">
                      {sinPhoto?.originalName || "PDF file"}
                    </span>
                    {sinPhotoUrl && (
                      <a
                        href={sinPhotoUrl}
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
                  onClick={handleSinPhotoRemove}
                  disabled={
                    sinPhotoStatus === "uploading" ||
                    sinPhotoStatus === "deleting"
                  }
                  className="ml-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              // Backwards-compat: if existing data is an image, keep old preview behaviour
              <div className="relative">
                <Image
                  src={sinPhotoPreview || sinPhotoUrl || ""}
                  alt="SIN Card Preview"
                  width={800}
                  height={400}
                  className="w-full h-40 object-contain rounded-lg border border-gray-300 bg-white"
                />
                <button
                  type="button"
                  onClick={handleSinPhotoRemove}
                  disabled={
                    sinPhotoStatus === "uploading" ||
                    sinPhotoStatus === "deleting"
                  }
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                >
                  <X size={12} />
                </button>
              </div>
            )
          ) : (
            <UploadPicker
              label={t("form.step2.page1.fields.sinPhotoDesc")}
              onPick={handleSinPhotoUpload}
              // PDF-only mode: no camera, plus global guidance modal
              mode="pdf"
              showPdfGuidance
              accept="application/pdf"
              className="w-full"
            />
          )}
          {sinPhotoStatus !== "uploading" && errors.sinPhoto && (
            <p className="text-red-500 text-sm mt-1">
              {errors.sinPhoto.message?.toString() ||
                "SIN document is required"}
            </p>
          )}
          {sinPhotoStatus === "uploading" && (
            <div className="text-yellow-600 text-sm mt-1 flex items-center">
              <p className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></p>
              Uploading...
            </div>
          )}
          {sinPhotoStatus === "deleting" && (
            <div className="text-yellow-600 text-sm mt-1 flex items-center">
              <p className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></p>
              Deleting...
            </div>
          )}
          {sinPhotoStatus === "error" && (
            <p className="text-red-500 text-sm mt-1">{sinPhotoMessage}</p>
          )}
          {!errors.sinPhoto && sinPhotoStatus === "idle" && sinPhotoMessage && (
            <p className="text-green-600 text-sm mt-1">{sinPhotoMessage}</p>
          )}
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.step2.page1.fields.dob")}
          </label>
          <input
            {...register("dob")}
            type="date"
            name="dob"
            data-field="dob"
            max={(() => {
              const today = new Date();
              const maxDate = new Date(
                today.getFullYear() - 23,
                today.getMonth(),
                today.getDate()
              );
              return maxDate.toISOString().split("T")[0];
            })()}
            min={(() => {
              const today = new Date();
              const minDate = new Date(
                today.getFullYear() - 100,
                today.getMonth(),
                today.getDate()
              );
              return minDate.toISOString().split("T")[0];
            })()}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {calculatedAge !== null && (
            <p
              className={`text-sm mt-1 ${
                calculatedAge >= 23 && calculatedAge <= 100
                  ? "text-green-600"
                  : "text-red-500"
              }`}
            >
              Age: {calculatedAge} years old
              {calculatedAge < 23 && " (Must be at least 23 years old)"}
              {calculatedAge > 100 && " (Age cannot exceed 100 years)"}
            </p>
          )}
          {errors.dob && (
            <p className="text-red-500 text-sm mt-1">
              {errors.dob.message?.toString()}
            </p>
          )}
        </div>

        {/* Can Provide Proof of Age */}
        <div className="flex items-center h-full">
          <div className="flex items-center gap-3 relative">
            <input
              type="checkbox"
              {...register("canProvideProofOfAge")}
              data-field="canProvideProofOfAge"
              className="appearance-none w-6 h-6 border-2 border-gray-300 rounded-md bg-white focus:outline-none transition-all duration-150 cursor-pointer focus:shadow-[0_0_0_3px_rgba(56,189,248,0.25)] checked:shadow-[0_0_0_3px_rgba(56,189,248,0.25)] checked:bg-white relative"
            />
            {canProvideProofChecked && dobValue && (
              <svg
                className="absolute w-6 h-6 pointer-events-none left-0 top-0"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M20 6L9 17L4 12"
                  stroke="#0071BC"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <label
              className={`text-sm font-medium ${
                dobValue ? "text-gray-700" : "text-gray-400"
              }`}
            >
              {t("form.step2.page1.fields.canProvideProof")}
            </label>
          </div>
          {errors.canProvideProofOfAge && (
            <p className="text-red-500 text-sm mt-1">
              {errors.canProvideProofOfAge.message?.toString()}
            </p>
          )}
        </div>

        {/* Phone: Home */}
        <PhoneInput
          name="phoneHome"
          label={t("form.step2.page1.fields.phoneHome")}
          value={getDisplayPhone(phoneHomeRaw)}
          onChange={(v) => handlePhoneChange("phoneHome", v)}
          error={errors.phoneHome}
        />

        {/* Phone: Cell */}
        <PhoneInput
          name="phoneCell"
          label={t("form.step2.page1.fields.phoneCell")}
          value={getDisplayPhone(phoneCellRaw)}
          onChange={(v) => handlePhoneChange("phoneCell", v)}
          error={errors.phoneCell}
        />

        {/* Emergency Contact */}
        <TextInput
          name="emergencyContactName"
          label={t("form.step2.page1.fields.emergencyContactName")}
          error={errors.emergencyContactName}
          register={register}
        />

        <PhoneInput
          name="emergencyContactPhone"
          label={t("form.step2.page1.fields.emergencyContactPhone")}
          value={getDisplayPhone(emergencyPhoneRaw)}
          onChange={(v) => handlePhoneChange("emergencyContactPhone", v)}
          error={errors.emergencyContactPhone}
        />
      </div>
    </section>
  );
}
