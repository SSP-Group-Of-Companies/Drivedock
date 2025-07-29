"use client";

import { useFormContext } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { usePrequalificationStore } from "@/store/usePrequalificationStore";
import { IApplicationFormPage1 } from "@/types/applicationForm.types";

export default function ContinueButton() {
  const { getValues } = useFormContext<IApplicationFormPage1>();
  const router = useRouter();
  const { t } = useTranslation("common");
  const { data: prequalifications } = usePrequalificationStore();

  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const values = getValues();

    if (!prequalifications?.completed) {
      alert(
        "Prequalification data is missing. Please restart the application."
      );
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      // Grab license photos (only for the first license)
      const frontFile = (
        document.querySelector(
          'input[name="licenses.0.licenseFrontPhoto"]'
        ) as HTMLInputElement
      )?.files?.[0];

      const backFile = (
        document.querySelector(
          'input[name="licenses.0.licenseBackPhoto"]'
        ) as HTMLInputElement
      )?.files?.[0];

      // Match backend expected keys: license_0_front and license_0_back
      if (frontFile) formData.append("license_0_front", frontFile);
      if (backFile) formData.append("license_0_back", backFile);

      const licensesCleaned = values.licenses.map((license) => {
        const licenseCopy = structuredClone(license) as Partial<typeof license>;
        delete licenseCopy.licenseFrontPhoto;
        delete licenseCopy.licenseBackPhoto;
        return licenseCopy;
      });

      const payload = {
        ...values,
        licenses: licensesCleaned,
      };

      // 📦 Add stringified payloads
      formData.append("applicationFormPage1", JSON.stringify(payload));
      formData.append("prequalifications", JSON.stringify(prequalifications));

      // 🛰 Submit to API
      const res = await fetch("/api/v1/forms/application-form", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.text();
        console.error("Backend error:", errorData);
        console.error("Form data being sent:", {
          payload,
          prequalifications,
          hasFrontFile: !!frontFile,
          hasBackFile: !!backFile,
          licenses: licensesCleaned,
        });
        throw new Error(`Failed to submit: ${errorData}`);
      }

      // ✅ Success — proceed to next page
      router.push("/form/driver-application/page-2");
    } catch (err) {
      console.error(err);
      alert("An error occurred while submitting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center">
      <button
        type="button" // ✅ prevent actual <form> submit, handled manually
        disabled={submitting}
        onClick={onSubmit}
        className={`px-8 py-2 mt-6 rounded-full font-semibold transition-colors shadow-md flex items-center gap-2
          ${
            submitting
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90"
          }
        `}
      >
        {submitting ? t("form.submitting") : t("form.continue")}
      </button>
    </div>
  );
}
