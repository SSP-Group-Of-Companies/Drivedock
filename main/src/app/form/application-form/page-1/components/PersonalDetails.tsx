"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Eye, EyeOff, Camera, X } from "lucide-react";
import Image from "next/image";

export default function PersonalDetails() {
  const {
    register,
    setValue,
    formState: { errors },
    control,
  } = useFormContext();
  const { t } = useTranslation("common");

  const canProvideProofChecked = useWatch({
    control,
    name: "canProvideProofOfAge",
  });
  const dobValue = useWatch({ control, name: "dob" });

  const [showSIN, setShowSIN] = useState(false);
  const [sinPhotoPreview, setSinPhotoPreview] = useState<string | null>(null);

  // Get the current SIN value and format it for display
  const sinValue = useWatch({ control, name: "sin" });
  const displaySIN = sinValue
    ? sinValue
        .replace(/^(\d{3})(\d)/, "$1-$2")
        .replace(/^(\d{3})-(\d{3})(\d)/, "$1-$2-$3")
    : "";

  const handleSINChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 9);
    setValue("sin", raw, { shouldValidate: true });
    setValue("sinEncrypted", raw, { shouldValidate: true }); // Set both fields
  };

  const handleSinPhotoUpload = (file: File | null) => {
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        alert("SIN photo must be a JPEG, PNG, or WebP image.");
        return;
      }

      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        alert("SIN photo must be less than 10MB.");
        return;
      }

      setValue("sinPhoto", file, { shouldValidate: true });

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSinPhotoPreview(result);
      };
      reader.readAsDataURL(file);
    } else {
      setValue("sinPhoto", undefined, { shouldValidate: true });
      setSinPhotoPreview(null);
    }
  };

  // Phone formatting functions
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6)
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(
      6,
      10
    )}`;
  };

  const handlePhoneChange = (
    field: "phoneHome" | "phoneCell" | "emergencyContactPhone",
    value: string
  ) => {
    const raw = value.replace(/\D/g, "").slice(0, 10);
    setValue(field, raw, { shouldValidate: true });
  };

  const getDisplayPhone = (value: string) => {
    if (!value) return "";
    return formatPhoneNumber(value);
  };

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white/80 shadow-sm">
      <h2 className="text-center text-lg font-semibold text-gray-800">
        {t("form.page1.sections.personal")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.fields.firstName")}
          </label>
          <input
            {...register("firstName")}
            type="text"
            name="firstName"
            data-field="firstName"
            placeholder={t("form.placeholders.firstName")}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm mt-1">
              {errors.firstName.message?.toString()}
            </p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.fields.lastName")}
          </label>
          <input
            {...register("lastName")}
            type="text"
            name="lastName"
            data-field="lastName"
            placeholder={t("form.placeholders.lastName")}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm mt-1">
              {errors.lastName.message?.toString()}
            </p>
          )}
        </div>

        {/* SIN Number */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">
            {t("form.fields.sin")}
          </label>
          <input
            type={showSIN ? "text" : "password"}
            placeholder="123-456-789"
            value={displaySIN}
            inputMode="numeric"
            autoComplete="off"
            {...register("sin")}
            onChange={handleSINChange}
            data-field="sin"
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md pr-10"
          />
          <button
            type="button"
            onClick={() => setShowSIN((prev) => !prev)}
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {showSIN ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          {errors.sin && (
            <p className="text-red-500 text-sm mt-1">
              {errors.sin.message?.toString()}
            </p>
          )}
        </div>

        {/* SIN Photo Upload */}
        <div data-field="sinPhoto">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("form.fields.sinPhoto")}
          </label>
          {sinPhotoPreview ? (
            <div className="relative">
              <Image
                src={sinPhotoPreview}
                alt="SIN Card Preview"
                width={400}
                height={128}
                className="w-full h-32 object-cover rounded-lg border border-gray-300"
              />
              <button
                type="button"
                onClick={() => handleSinPhotoUpload(null)}
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
              <span className="font-medium text-gray-400 text-xs">
                {t("form.fields.sinPhotoDesc")}
              </span>
            </label>
          )}
          <input
            id="sinPhoto"
            type="file"
            accept="image/*"
            capture="environment"
            {...register("sinPhoto")}
            onChange={(e) => handleSinPhotoUpload(e.target.files?.[0] || null)}
            data-field="sinPhoto"
            className="hidden"
          />
          {errors.sinPhoto && (
            <p className="text-red-500 text-sm mt-1">
              {errors.sinPhoto.message?.toString()}
            </p>
          )}
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.fields.dob")}
          </label>
          <input
            {...register("dob")}
            type="date"
            name="dob"
            data-field="dob"
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
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
              disabled={!dobValue}
              data-field="canProvideProofOfAge"
              className="appearance-none w-6 h-6 border-2 border-gray-300 rounded-md bg-white focus:outline-none transition-all duration-150 cursor-pointer focus:shadow-[0_0_0_3px_rgba(56,189,248,0.25)] checked:shadow-[0_0_0_3px_rgba(56,189,248,0.25)] checked:bg-white relative"
            />
            {canProvideProofChecked && dobValue && (
              <svg
                className="absolute w-6 h-6 pointer-events-none left-0 top-0"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
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
              {t("form.fields.canProvideProof")}
            </label>
          </div>
          {errors.canProvideProofOfAge && (
            <p className="text-red-500 text-sm mt-1">
              {errors.canProvideProofOfAge.message?.toString()}
            </p>
          )}
        </div>

        {/* Phone (Home) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.fields.phoneHome")}
          </label>
          <div className="relative mt-1">
            <div className="flex">
              {/* Country Code */}
              <div className="flex items-center px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-sm font-medium text-gray-700">
                +1
              </div>

              {/* Phone Input */}
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={getDisplayPhone(
                  useWatch({ control, name: "phoneHome" }) || ""
                )}
                onChange={(e) => handlePhoneChange("phoneHome", e.target.value)}
                data-field="phoneHome"
                className="flex-1 py-2 px-3 border border-gray-300 rounded-r-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md focus:border-transparent"
              />
            </div>
          </div>
          {errors.phoneHome && (
            <p className="text-red-500 text-sm mt-1">
              {errors.phoneHome.message?.toString()}
            </p>
          )}
        </div>

        {/* Phone (Cell) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.fields.phoneCell")}
          </label>
          <div className="relative mt-1">
            <div className="flex">
              {/* Country Code */}
              <div className="flex items-center px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-sm font-medium text-gray-700">
                +1
              </div>

              {/* Phone Input */}
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={getDisplayPhone(
                  useWatch({ control, name: "phoneCell" }) || ""
                )}
                onChange={(e) => handlePhoneChange("phoneCell", e.target.value)}
                data-field="phoneCell"
                className="flex-1 py-2 px-3 border border-gray-300 rounded-r-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md focus:border-transparent"
              />
            </div>
          </div>
          {errors.phoneCell && (
            <p className="text-red-500 text-sm mt-1">
              {errors.phoneCell.message?.toString()}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.fields.email")}
          </label>
          <input
            {...register("email")}
            type="email"
            name="email"
            data-field="email"
            placeholder={t("form.placeholders.email")}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">
              {errors.email.message?.toString()}
            </p>
          )}
        </div>

        {/* Emergency Contact Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.fields.emergencyContactName")}
          </label>
          <input
            {...register("emergencyContactName")}
            type="text"
            name="emergencyContactName"
            data-field="emergencyContactName"
            placeholder={t("form.placeholders.emergencyContactName")}
            className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
          />
          {errors.emergencyContactName && (
            <p className="text-red-500 text-sm mt-1">
              {errors.emergencyContactName.message?.toString()}
            </p>
          )}
        </div>

        {/* Emergency Contact Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("form.fields.emergencyContactPhone")}
          </label>
          <div className="relative mt-1">
            <div className="flex">
              {/* Country Code */}
              <div className="flex items-center px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-sm font-medium text-gray-700">
                +1
              </div>

              {/* Phone Input */}
              <input
                type="tel"
                placeholder="(555) 123-4567"
                value={getDisplayPhone(
                  useWatch({ control, name: "emergencyContactPhone" }) || ""
                )}
                onChange={(e) =>
                  handlePhoneChange("emergencyContactPhone", e.target.value)
                }
                data-field="emergencyContactPhone"
                className="flex-1 py-2 px-3 border border-gray-300 rounded-r-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md focus:border-transparent"
              />
            </div>
          </div>
          {errors.emergencyContactPhone && (
            <p className="text-red-500 text-sm mt-1">
              {errors.emergencyContactPhone.message?.toString()}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
