"use client";

import { useFormContext } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { usePrequalificationStore } from "@/store/usePrequalificationStore";
import { IApplicationFormPage1 } from "@/types/applicationForm.types";
import { COMPANIES } from "@/constants/companies";
import { useCompanySelection } from "@/hooks/useCompanySelection";
import { useFormErrorScroll } from "@/hooks/useFormErrorScroll";
import { page1Config } from "@/lib/frontendConfigs/applicationFormConfigs/page1Config";

export default function ContinueButton() {
  const {
    getValues,
    trigger,
    formState: { errors },
  } = useFormContext<IApplicationFormPage1>();
  const router = useRouter();
  const { t } = useTranslation("common");
  const { data: prequalifications } = usePrequalificationStore();
  const { selectedCompany } = useCompanySelection();
  const { handleFormError } = useFormErrorScroll<IApplicationFormPage1>();

  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const values = getValues();

    const fieldsToValidate = page1Config.validationFields(values);
    const isValid = await trigger(
      fieldsToValidate as Parameters<typeof trigger>[0]
    );

    if (!isValid) {
      handleFormError(errors);
      return;
    }

    if (!prequalifications?.completed) {
      alert(
        "Prequalification data is missing. Please restart the application."
      );
      return;
    }

    const companyId = selectedCompany?.id || "default";
    const isValidCompany = COMPANIES.some((c) => c.id === companyId);
    if (!isValidCompany) {
      alert("Invalid company selection. Please restart the application.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = page1Config.buildFormData(
        values,
        prequalifications,
        companyId
      );

      const res = await fetch("/api/v1/forms/application-form", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData);
      }

      router.push(page1Config.nextRoute);
    } catch (err) {
      console.error("Submission error:", err);
      alert("An error occurred while submitting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center">
      <button
        type="button"
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
