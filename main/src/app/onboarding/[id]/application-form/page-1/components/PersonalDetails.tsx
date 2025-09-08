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
import { Eye, EyeOff, Camera, X } from "lucide-react";
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
import { ECountryCode } from "@/types/shared.types";
import { COMPANIES } from "@/constants/companies";
import { useCompanySelection } from "@/hooks/frontendHooks/useCompanySelection";

// Helpers
const formatPhoneNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

const getDisplayPhone = (value: string) => (value ? formatPhoneNumber(value) : "");

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
}

export default function PersonalDetails({ onboardingContext }: PersonalDetailsProps) {
  const {
    register,
    setValue,
    formState: { errors },
    control,
  } = useFormContext<ApplicationFormPage1Schema>();

  const mounted = useMounted();
  const { t } = useTranslation("common");
  const { id } = useParams<{ id: string }>();
  const { selectedCompany, clearSelectedCompany } = useCompanySelection();

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
  const emergencyPhoneRaw = useWatch({ control, name: "emergencyContactPhone" }) || "";

  const [showSIN, setShowSIN] = useState(false);
  const sinPhotoS3Key = sinPhoto?.s3Key || "";
  const sinPhotoUrl = sinPhoto?.url || "";
  const [sinPhotoPreview, setSinPhotoPreview] = useState<string | null>(sinPhotoUrl || null);

  const [sinValidationStatus, setSinValidationStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [sinPhotoStatus, setSinPhotoStatus] = useState<"idle" | "uploading" | "deleting" | "error">("idle");
  const [sinPhotoMessage, setSinPhotoMessage] = useState("");
  const [sinValidationMessage, setSinValidationMessage] = useState("");

  const calculatedAge = dobValue ? calculateAge(dobValue) : null;

  // Clear company selection when resuming an application to prevent conflicts
  useEffect(() => {
    if (onboardingContext?.companyId) {
      clearSelectedCompany();
    }
  }, [onboardingContext?.companyId, clearSelectedCompany]);

  // Determine the label based on country code
  const getSINLabel = () => {
    // ALWAYS prioritize onboarding context if it exists (for resumed applications)
    if (onboardingContext?.companyId) {
      const company = COMPANIES.find(c => c.id === onboardingContext.companyId);
      if (company) {
        return company.countryCode === ECountryCode.US 
          ? "SSN (Social Security Number)"
          : "SIN (Social Insurance Number)";
      }
    }
    
    // Only use selected company if we have NO onboarding context (truly new application)
    if (selectedCompany && !onboardingContext) {
      return selectedCompany.countryCode === ECountryCode.US 
        ? "SSN (Social Security Number)"
        : "SIN (Social Insurance Number)";
    }
    
    // Final fallback to translation
    return t("form.step2.page1.fields.sin");
  };

  const [displaySIN, setDisplaySIN] = useState(() => (sinValue ? sinValue.replace(/^(\d{3})(\d)/, "$1-$2").replace(/^(\d{3})-(\d{3})(\d)/, "$1-$2-$3") : ""));

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

  const handlePhoneChange = (field: "phoneHome" | "phoneCell" | "emergencyContactPhone", value: string) => {
    const raw = value.replace(/\D/g, "").slice(0, 10);
    setValue(field, raw, { shouldValidate: true });
  };

  const EMPTY_PHOTO = { s3Key: "", url: "" };

  const handleSinPhotoUpload = async (file: File | null) => {
    if (!file) {
      setValue("sinPhoto", EMPTY_PHOTO, { shouldValidate: true });
      setSinPhotoPreview(null);
      setSinPhotoStatus("idle");
      setSinPhotoMessage("");
      return;
    }

    setSinPhotoStatus("uploading");
    setSinPhotoMessage("");

    try {
      const result = await uploadToS3Presigned({
        file,
        folder: ES3Folder.SIN_PHOTOS,
        trackerId: id,
      });

      setValue("sinPhoto", result, { shouldValidate: true });

      const reader = new FileReader();
      reader.onload = (ev) => setSinPhotoPreview(String(ev.target?.result || ""));
      reader.readAsDataURL(file);

      setSinPhotoStatus("idle");
      setSinPhotoMessage("Upload successful");
    } catch (error: any) {
      console.error("SIN photo upload failed:", error);
      setSinPhotoStatus("error");
      setSinPhotoMessage(error.message || "Upload failed");
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
        setSinPhotoMessage("Photo removed");
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

  // 👇 early return AFTER all hooks
  if (!mounted) return null;

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <h2 className="text-center text-lg font-semibold text-gray-800">{t("form.step2.page1.sections.personal")}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <TextInput name="firstName" label={t("form.step2.page1.fields.firstName")} placeholder="John" error={errors.firstName} register={register} />

        {/* Last Name */}
        <TextInput name="lastName" label={t("form.step2.page1.fields.lastName")} placeholder="Deo" error={errors.lastName} register={register} />

        {/* Email Address */}
        <TextInput name="email" label={t("form.step2.page1.fields.email")} placeholder="john@gmail.com" error={errors.email} register={register} />

        {/* Gender Selection */}
        <div data-field="gender">
          <label className="block text-sm font-medium text-gray-700 mb-2">{t("form.step2.page1.fields.gender")}</label>
          <div className="inline-flex w-full rounded-full border border-gray-300 overflow-hidden">
            {["male", "female"].map((option, idx) => {
              const isSelected = genderValue === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setValue("gender", option as "male" | "female", { shouldValidate: true })}
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
          {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message?.toString()}</p>}
        </div>

        {/* SIN Number */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">{getSINLabel()}</label>

          <input
            type={showSIN ? "text" : "password"}
            placeholder="963-456-789"
            value={displaySIN}
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              if (raw.length <= 9) handleSINChange(e);
            }}
            pattern="\d{9}"
            data-field="sin"
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

          <button type="button" onClick={() => setShowSIN((prev) => !prev)} className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 focus:outline-none">
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
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {sinValidationMessage}
            </p>
          )}
          {sinValidationStatus === "invalid" && (
            <p className="text-red-500 text-sm mt-1 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              {sinValidationMessage}
            </p>
          )}
          {errors.sin && <p className="text-red-500 text-sm mt-1">{errors.sin.message?.toString()}</p>}
        </div>

        {/* SIN Issue Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("form.step2.page1.fields.sinIssueDate")}</label>
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
              const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
              return minDate.toISOString().split("T")[0];
            })()}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {errors.sinIssueDate && <p className="text-red-500 text-sm mt-1">{errors.sinIssueDate.message?.toString()}</p>}
        </div>

        {/* SIN Photo Upload - Full Width */}
        <div className="md:col-span-2" data-field="sinPhoto">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.step2.page1.fields.sinPhoto")}</label>
          {sinPhotoPreview || sinPhotoUrl ? (
            <div className="relative">
              <Image src={sinPhotoPreview || sinPhotoUrl || ""} alt="SIN Card Preview" width={400} height={128} className="w-full h-32 object-cover rounded-lg border border-gray-300" />
              <button
                type="button"
                onClick={handleSinPhotoRemove}
                disabled={sinPhotoStatus === "uploading" || sinPhotoStatus === "deleting"}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <label
              htmlFor="sinPhoto"
              className="cursor-pointer flex flex-col items-center justify-center h-10 px-4 mt-1 w-full text-sm text-gray-600 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 group"
            >
              <Camera className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              <span className="font-medium text-gray-400 text-xs">{t("form.step2.page1.fields.sinPhotoDesc")}</span>
            </label>
          )}
          <input id="sinPhoto" type="file" accept="image/*" {...register("sinPhoto")} onChange={(e) => handleSinPhotoUpload(e.target.files?.[0] || null)} data-field="sinPhoto" className="hidden" />
          {sinPhotoStatus !== "uploading" && errors.sinPhoto && <p className="text-red-500 text-sm mt-1">{errors.sinPhoto.message?.toString()}</p>}
          {sinPhotoStatus === "uploading" && (
            <div className="text-yellow-600 text-sm mt-1 flex items-center">
              <p className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></p>
              Uploading...
            </div>
          )}
          {sinPhotoStatus === "deleting" && (
            <p className="text-yellow-600 text-sm mt-1 flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></div>
              Deleting...
            </p>
          )}
          {sinPhotoStatus === "error" && <p className="text-red-500 text-sm mt-1">{sinPhotoMessage}</p>}
          {!errors.sinPhoto && sinPhotoStatus === "idle" && sinPhotoMessage && <p className="text-green-600 text-sm mt-1">{sinPhotoMessage}</p>}
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("form.step2.page1.fields.dob")}</label>
          <input
            {...register("dob")}
            type="date"
            name="dob"
            data-field="dob"
            max={(() => {
              const today = new Date();
              const maxDate = new Date(today.getFullYear() - 23, today.getMonth(), today.getDate());
              return maxDate.toISOString().split("T")[0];
            })()}
            min={(() => {
              const today = new Date();
              const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
              return minDate.toISOString().split("T")[0];
            })()}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {calculatedAge !== null && (
            <p className={`text-sm mt-1 ${calculatedAge >= 23 && calculatedAge <= 100 ? "text-green-600" : "text-red-500"}`}>
              Age: {calculatedAge} years old
              {calculatedAge < 23 && " (Must be at least 23 years old)"}
              {calculatedAge > 100 && " (Age cannot exceed 100 years)"}
            </p>
          )}
          {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob.message?.toString()}</p>}
        </div>

        {/* Can Provide Proof of Age */}
        <div className="flex items-center h-full">
          <div className="flex items-center gap-3 relative">
            <input
              type="checkbox"
              {...register("canProvideProofOfAge")}
              disabled={!dobValue}
              data-field="canProvideProofOfAge"
              className="appearance-none w-6 h-6 border-2 border-gray-300 rounded-md bg-white focus:outline-none transition-all duration-150 cursor-pointer focus:shadow-[0_0_0_3px_rgba(56,189,248,0.25)] checked:shadow-[0_0_0_3px_rgba(56,189,248,0.25)] checked:bg-white relative"
            />
            {canProvideProofChecked && dobValue && (
              <svg className="absolute w-6 h-6 pointer-events-none left-0 top-0" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17L4 12" stroke="#0071BC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <label className={`text-sm font-medium ${dobValue ? "text-gray-700" : "text-gray-400"}`}>{t("form.step2.page1.fields.canProvideProof")}</label>
          </div>
          {errors.canProvideProofOfAge && <p className="text-red-500 text-sm mt-1">{errors.canProvideProofOfAge.message?.toString()}</p>}
        </div>

        {/* Phone: Home */}
        <PhoneInput label={t("form.step2.page1.fields.phoneHome")} value={getDisplayPhone(phoneHomeRaw)} onChange={(v) => handlePhoneChange("phoneHome", v)} error={errors.phoneHome} />

        {/* Phone: Cell */}
        <PhoneInput label={t("form.step2.page1.fields.phoneCell")} value={getDisplayPhone(phoneCellRaw)} onChange={(v) => handlePhoneChange("phoneCell", v)} error={errors.phoneCell} />

        {/* Emergency Contact */}
        <TextInput name="emergencyContactName" label={t("form.step2.page1.fields.emergencyContactName")} error={errors.emergencyContactName} register={register} />

        <PhoneInput
          label={t("form.step2.page1.fields.emergencyContactPhone")}
          value={getDisplayPhone(emergencyPhoneRaw)}
          onChange={(v) => handlePhoneChange("emergencyContactPhone", v)}
          error={errors.emergencyContactPhone}
        />
      </div>
    </section>
  );
}
