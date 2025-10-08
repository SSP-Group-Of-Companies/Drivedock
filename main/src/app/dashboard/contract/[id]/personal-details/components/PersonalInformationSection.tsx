"use client";

import { Eye, EyeOff, Camera, X } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { formatInputDate } from "@/lib/utils/dateUtils";
import { IApplicationFormPage1 } from "@/types/applicationForm.types";
import { uploadToS3Presigned, deleteTempFiles, isTempKey } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";

interface PersonalInformationSectionProps {
  data: IApplicationFormPage1;
  isEditMode: boolean;
  staged: any;
  onStage: (changes: any) => void;
  prequalificationData?: {
    statusInCanada?: string;
  };
}

export default function PersonalInformationSection({ data, isEditMode, staged, onStage, prequalificationData }: PersonalInformationSectionProps) {
  const [showSIN, setShowSIN] = useState(false);

  // Upload/Delete UI state
  const [sinPhotoStatus, setSinPhotoStatus] = useState<"idle" | "uploading" | "deleting" | "error">("idle");
  const [sinPhotoMessage, setSinPhotoMessage] = useState<string>("");

  // Merge staged changes with original data for display
  const formData = { ...data, ...staged };

  const formatPhoneNumber = (value: string) => {
    if (!value) return "";
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const formatDisplayDate = (date: string | Date) => {
    if (!date) return "Not provided";
    const s = String(date);

    // If already plain date (yyyy-MM-dd), format directly without timezone conversion
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [year, month, day] = s.split("-");
      return `${month}/${day}/${year}`;
    }

    // For ISO strings, use UTC methods to avoid timezone drift
    try {
      const dateObj = new Date(s);
      if (isNaN(dateObj.getTime())) return s;

      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getUTCDate()).padStart(2, "0");
      return `${month}/${day}/${year}`;
    } catch {
      return s;
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    return monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  };

  const calculatedAge = formData.dob ? calculateAge(formData.dob) : null;

  const updateField = (field: keyof typeof formData, value: any) => {
    onStage({ [field]: value });
  };

  /** Upload handler (client-side presign → PUT → stage result) */
  const handleSinPhotoUpload = async (file: File | null) => {
    if (!isEditMode) return;
    if (!file) return;

    setSinPhotoStatus("uploading");
    setSinPhotoMessage("");

    try {
      const result = await uploadToS3Presigned({
        file,
        folder: ES3Folder.SIN_PHOTOS,
        // trackerId optional — defaults inside helper if not provided
      });

      updateField("sinPhoto", result);
      setSinPhotoStatus("idle");
      setSinPhotoMessage("Upload successful");
    } catch (err: any) {
      console.error("SIN photo upload failed:", err);
      setSinPhotoStatus("error");
      setSinPhotoMessage(err?.message || "Upload failed");
    }
  };

  /** Delete handler:
   * - If temp (key starts with temp-files/): call API → show "Deleting..."
   * - If final/empty: instant remove from state
   */
  const handleSinPhotoRemove = async () => {
    if (!isEditMode) return;
    const key = formData?.sinPhoto?.s3Key;

    // If no key/url in state, just clear
    if (!key && !formData?.sinPhoto?.url) {
      updateField("sinPhoto", { s3Key: "", url: "", mimeType: "", sizeBytes: 0, originalName: "" });
      return;
    }

    // Temp file: show deleting + call API
    if (key && isTempKey(key)) {
      setSinPhotoStatus("deleting");
      setSinPhotoMessage("");

      try {
        await deleteTempFiles([key]);
        // Clear from state after deletion
        updateField("sinPhoto", { s3Key: "", url: "", mimeType: "", sizeBytes: 0, originalName: "" });
        setSinPhotoStatus("idle");
        setSinPhotoMessage("Photo removed");
      } catch (err) {
        console.error("Temp photo deletion failed:", err);
        setSinPhotoStatus("error");
        setSinPhotoMessage("Delete failed");
      }
      return;
    }

    // Final/Non-temp photo: remove immediately from state
    updateField("sinPhoto", { s3Key: "", url: "", mimeType: "", sizeBytes: 0, originalName: "" });
    setSinPhotoStatus("idle");
    setSinPhotoMessage("");
  };

  const openSinPhotoInNewTab = () => {
    const url = formData?.sinPhoto?.url;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: "var(--color-outline-variant)" }}>
        <div className="w-2 h-8 rounded-full" style={{ background: "var(--color-primary)" }}></div>
        <h3 className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>
          Personal Information
        </h3>
      </div>

      <div className="space-y-4">
        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              First Name
            </label>
            {isEditMode ? (
              <input
                type="text"
                value={formData.firstName || ""}
                onChange={(e) => updateField("firstName", e.target.value)}
                className="w-full p-3 rounded-lg border text-sm transition-colors"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                  color: "var(--color-on-surface)",
                }}
                placeholder="Enter first name"
              />
            ) : (
              <div
                className="p-3 rounded-lg border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                }}
              >
                <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                  {formData.firstName || "Not provided"}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              Last Name
            </label>
            {isEditMode ? (
              <input
                type="text"
                value={formData.lastName || ""}
                onChange={(e) => updateField("lastName", e.target.value)}
                className="w-full p-3 rounded-lg border text-sm transition-colors"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                  color: "var(--color-on-surface)",
                }}
                placeholder="Enter last name"
              />
            ) : (
              <div
                className="p-3 rounded-lg border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                }}
              >
                <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                  {formData.lastName || "Not provided"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* SIN Field and Photo - One Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              SIN (Social Insurance Number)
            </label>
            <div className="relative">
              {isEditMode ? (
                <input
                  type={showSIN ? "text" : "password"}
                  value={formData.sin || ""}
                  onChange={(e) => updateField("sin", e.target.value)}
                  className="w-full p-3 rounded-lg border pr-10 text-sm transition-colors"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                  placeholder="123-456-789"
                />
              ) : (
                <div
                  className="p-3 rounded-lg border pr-10"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                  }}
                >
                  <span className="text-sm font-mono" style={{ color: "var(--color-on-surface)" }}>
                    {showSIN ? formData.sin || "Not available" : "•••-•••-•••"}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowSIN(!showSIN)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                {showSIN ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              SIN Card Photo
            </label>

            {/* Container is relative so we can pin the X and overlay consistently */}
            <div
              className="relative group rounded-lg border-2 border-dashed p-4 text-center overflow-hidden"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-outline-variant)" }}
            >
              {/* Only show delete button if a photo exists */}
              {isEditMode && formData?.sinPhoto?.url && (
                <button
                  type="button"
                  onClick={handleSinPhotoRemove}
                  disabled={sinPhotoStatus === "uploading" || sinPhotoStatus === "deleting"}
                  className="absolute top-2 right-2 z-20 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60"
                  aria-label="Remove photo"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* If photo exists, show it with a hover overlay to view */}
              {formData?.sinPhoto?.url ? (
                <>
                  <div className="relative inline-block">
                    <Image src={formData.sinPhoto.url} alt="SIN Card" width={240} height={140} className="mx-auto rounded-lg object-contain max-h-40 w-auto" />
                  </div>

                  {/* Hover overlay to view (never covers the ❌ thanks to z-index) */}
                  <button
                    type="button"
                    onClick={openSinPhotoInNewTab}
                    className="absolute inset-0 z-10 hidden group-hover:flex items-center justify-center transition-opacity"
                    style={{ background: "rgba(0,0,0,0.4)" }}
                    aria-label="View SIN card photo"
                    title="View"
                  >
                    <Eye className="w-7 h-7 text-white" />
                  </button>
                </>
              ) : (
                <>
                  <label htmlFor="sinPhotoInput" className="cursor-pointer flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8" style={{ color: "var(--color-on-surface-variant)" }} />
                    <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
                      Click to capture or select an image
                    </span>
                  </label>
                  {isEditMode && <input id="sinPhotoInput" type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleSinPhotoUpload(e.target.files?.[0] || null)} />}
                </>
              )}

              {/* Status messages under the card area */}
              {sinPhotoStatus === "uploading" && (
                <div className="text-yellow-600 text-sm mt-2 flex items-center justify-center">
                  <p className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></p>
                  Uploading...
                </div>
              )}
              {sinPhotoStatus === "deleting" && (
                <div className="text-yellow-600 text-sm mt-2 flex items-center justify-center">
                  <p className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></p>
                  Deleting...
                </div>
              )}
              {sinPhotoStatus === "error" && <p className="text-red-500 text-sm mt-2">{sinPhotoMessage}</p>}
              {sinPhotoStatus === "idle" && sinPhotoMessage && <p className="text-green-600 text-sm mt-2">{sinPhotoMessage}</p>}
            </div>
          </div>
        </div>

        {/* SIN Issue Date and Gender - One Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              SIN Issue Date
            </label>
            {isEditMode ? (
              <input
                type="date"
                value={formatInputDate(formData.sinIssueDate) || ""}
                onChange={(e) => updateField("sinIssueDate", e.target.value)}
                className="w-full p-3 rounded-lg border text-sm transition-colors"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                  color: "var(--color-on-surface)",
                }}
              />
            ) : (
              <div
                className="p-3 rounded-lg border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                }}
              >
                <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                  {formatDisplayDate(formData.sinIssueDate)}
                </span>
              </div>
            )}
          </div>

          {/* SIN Expiry Date - Only for Work Permit holders */}
          {prequalificationData?.statusInCanada === "Work Permit" && (
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
                SIN Expiry Date
              </label>
              {isEditMode ? (
                <input
                  type="date"
                  value={formatInputDate(formData.sinExpiryDate) || ""}
                  onChange={(e) => updateField("sinExpiryDate", e.target.value)}
                  required={prequalificationData?.statusInCanada === "Work Permit"}
                  className="w-full p-3 rounded-lg border text-sm transition-colors"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                />
              ) : (
                <div
                  className="p-3 rounded-lg border"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                  }}
                >
                  <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                    {formatDisplayDate(formData.sinExpiryDate)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              Gender
            </label>
            {isEditMode ? (
              <select
                value={formData.gender || ""}
                onChange={(e) => updateField("gender", e.target.value)}
                className="w-full p-3 rounded-lg border text-sm transition-colors"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                  color: "var(--color-on-surface)",
                }}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            ) : (
              <div
                className="p-3 rounded-lg border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                }}
              >
                <span className="text-sm capitalize" style={{ color: "var(--color-on-surface)" }}>
                  {formData.gender || "Not provided"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Date of Birth and Proof of Age - One Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              Date of Birth
            </label>
            <div className="flex items-center gap-4">
              {isEditMode ? (
                <input
                  type="date"
                  value={formatInputDate(formData.dob) || ""}
                  onChange={(e) => updateField("dob", e.target.value)}
                  className="flex-1 p-3 rounded-lg border text-sm transition-colors"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                    color: "var(--color-on-surface)",
                  }}
                />
              ) : (
                <div
                  className="flex-1 p-3 rounded-lg border"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-outline)",
                  }}
                >
                  <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                    {formatDisplayDate(formData.dob)}
                  </span>
                </div>
              )}
              {calculatedAge && (
                <div
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    background: "var(--color-primary-container)",
                    color: "var(--color-on-surface)",
                  }}
                >
                  Age: {calculatedAge}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              Proof of Age
            </label>
            {isEditMode ? (
              <div
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.canProvideProofOfAge || false}
                  onChange={(e) => updateField("canProvideProofOfAge", e.target.checked)}
                  className="w-5 h-5 rounded border-2"
                  style={{ borderColor: "var(--color-outline)" }}
                />
                <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                  Can you provide proof of age?
                </span>
              </div>
            ) : (
              <div
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                }}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${formData.canProvideProofOfAge ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                  {formData.canProvideProofOfAge && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                  Can you provide proof of age?
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Phone Numbers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              Phone (Home) (Optional)
            </label>
            {isEditMode ? (
              <input
                type="tel"
                value={formData.phoneHome || ""}
                onChange={(e) => updateField("phoneHome", e.target.value)}
                className="w-full p-3 rounded-lg border text-sm transition-colors"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                  color: "var(--color-on-surface)",
                }}
                placeholder="Enter home phone"
              />
            ) : (
              <div
                className="p-3 rounded-lg border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                }}
              >
                <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                  {formData.phoneHome ? formatPhoneNumber(formData.phoneHome) : "Not provided"}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              Phone (Cell)
            </label>
            {isEditMode ? (
              <input
                type="tel"
                value={formData.phoneCell || ""}
                onChange={(e) => updateField("phoneCell", e.target.value)}
                className="w-full p-3 rounded-lg border text-sm transition-colors"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                  color: "var(--color-on-surface)",
                }}
                placeholder="Enter cell phone"
              />
            ) : (
              <div
                className="p-3 rounded-lg border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                }}
              >
                <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                  {formData.phoneCell ? formatPhoneNumber(formData.phoneCell) : "Not provided"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
            Email Address
          </label>
          {isEditMode ? (
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full p-3 rounded-lg border text-sm transition-colors"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
                color: "var(--color-on-surface)",
              }}
              placeholder="Enter email address"
            />
          ) : (
            <div
              className="p-3 rounded-lg border"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
              }}
            >
              <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                {formData.email || "Not provided"}
              </span>
            </div>
          )}
        </div>

        {/* Emergency Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              Emergency Contact Name
            </label>
            {isEditMode ? (
              <input
                type="text"
                value={formData.emergencyContactName || ""}
                onChange={(e) => updateField("emergencyContactName", e.target.value)}
                className="w-full p-3 rounded-lg border text-sm transition-colors"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                  color: "var(--color-on-surface)",
                }}
                placeholder="Enter emergency contact name"
              />
            ) : (
              <div
                className="p-3 rounded-lg border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                }}
              >
                <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                  {formData.emergencyContactName || "Not provided"}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              Emergency Contact Phone
            </label>
            {isEditMode ? (
              <input
                type="tel"
                value={formData.emergencyContactPhone || ""}
                onChange={(e) => updateField("emergencyContactPhone", e.target.value)}
                className="w-full p-3 rounded-lg border text-sm transition-colors"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                  color: "var(--color-on-surface)",
                }}
                placeholder="Enter emergency contact phone"
              />
            ) : (
              <div
                className="p-3 rounded-lg border"
                style={{
                  background: "var(--color-surface)",
                  borderColor: "var(--color-outline)",
                }}
              >
                <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
                  {formData.emergencyContactPhone ? formatPhoneNumber(formData.emergencyContactPhone) : "Not provided"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
