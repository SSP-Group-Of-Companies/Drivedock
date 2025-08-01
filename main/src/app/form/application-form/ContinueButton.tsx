"use client";

import { useFormContext, FieldValues } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState, ReactNode } from "react";

import { usePrequalificationStore } from "@/store/usePrequalificationStore";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import { useCompanySelection } from "@/hooks/useCompanySelection";
import { useFormErrorScroll } from "@/hooks/useFormErrorScroll";
import { COMPANIES } from "@/constants/companies";
import { IPreQualifications } from "@/types/preQualifications.types";

type ContinueButtonProps<T extends FieldValues> = {
  config: {
    validationFields: (values: T) => string[];
    buildFormData:
      | ((values: T) => FormData)
      | ((
          values: T,
          prequal: IPreQualifications,
          companyId: string
        ) => FormData);
    nextRoute: string;
    validateBusinessRules?: (values: T) => string | null;
  };
};

export default function ContinueButton<T extends FieldValues>({
  config,
}: ContinueButtonProps<T>): ReactNode {
  const {
    getValues,
    trigger,
    formState: { errors },
  } = useFormContext<T>();

  const router = useRouter();
  const { t } = useTranslation("common");
  const { data: prequalifications } = usePrequalificationStore();
  const { tracker, setTracker } = useOnboardingTracker();
  const { selectedCompany } = useCompanySelection();
  const { handleFormError } = useFormErrorScroll<T>();

  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const values = getValues();

    // Step 1: Field-level validation
    const fieldsToValidate = config.validationFields(values);
    const isValid = await trigger(
      fieldsToValidate as Parameters<typeof trigger>[0]
    );

    if (!isValid) {
      handleFormError(errors);
      return;
    }

    // Step 2: Optional business rule validation
    if (config.validateBusinessRules) {
      const ruleError = config.validateBusinessRules(values);
      if (ruleError) {
        alert(ruleError);
        return;
      }
    }

    // Step 3: Validate company and prequal if needed
    const companyId = selectedCompany?.id;
    const isValidCompany =
      !!companyId && COMPANIES.some((c) => c.id === companyId);

    if (config.buildFormData.length === 3) {
      if (!prequalifications?.completed) {
        alert(
          "Prequalification data is missing. Please restart the application."
        );
        return;
      }

      if (!isValidCompany) {
        alert("Invalid company selection. Please restart the application.");
        return;
      }
    }

    try {
      setSubmitting(true);

      // Step 4: Build form data
      const formData =
        config.buildFormData.length === 3
          ? (
              config.buildFormData as (
                values: T,
                prequal: IPreQualifications,
                companyId: string
              ) => FormData
            )(values, prequalifications!, companyId!)
          : (config.buildFormData as (values: T) => FormData)(values);

      // Step 5: Determine route and method
      const sin = tracker?.sin;
      const isUpdate = Boolean(sin);
      const pageSegment = config.nextRoute.split("/").pop();

      const url =
        isUpdate && pageSegment
          ? `/api/v1/forms/application-form/${sin}/${pageSegment}`
          : "/api/v1/forms/application-form";

      const method = isUpdate ? "PATCH" : "POST";

      // Step 6: Submit to backend
      const res = await fetch(url, {
        method,
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      // Step 7: Save tracker if this is initial Page 1 POST
      if (!isUpdate && pageSegment === "page-2") {
        const responseData = await res.json();
        if (responseData?.data?.sin) {
          setTracker(responseData.data); // Save full tracker object
        }
      }

      // Step 8: Route to next step
      router.push(config.nextRoute);
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
