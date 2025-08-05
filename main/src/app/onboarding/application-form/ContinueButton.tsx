"use client";

import { useFormContext, FieldValues } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState, ReactNode } from "react";

import { usePrequalificationStore } from "@/store/usePrequalificationStore";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import { useCompanySelection } from "@/hooks/useCompanySelection";
import { useFormErrorScroll } from "@/hooks/useFormErrorScroll";
import { COMPANIES } from "@/constants/companies";
import { IPreQualifications } from "@/types/preQualifications.types";
import { submitFormStep } from "@/lib/frontendUtils/submitFormStep";

type ContinueButtonProps<T extends FieldValues> = {
  config: {
    validationFields: (values: T) => string[];
    buildFormData:
      | ((values: T) => FormData)
      | ((
          values: T,
          prequal: IPreQualifications,
          companyId: string
        ) => FormData)
      | ((
          values: T,
          prequal: IPreQualifications,
          companyId: string,
          tracker?: any
        ) => FormData);
    nextRoute: string;
    validateBusinessRules?: (values: T) => string | null;
  };
  trackerId?: string; // ✅ Add optional trackerId prop
};

export default function ContinueButton<T extends FieldValues>({
  config,
  trackerId,
}: ContinueButtonProps<T>): ReactNode {
  const {
    getValues,
    trigger,
    formState: { errors },
  } = useFormContext<T>();

  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation("common");
  const { data: prequalifications, clearData } = usePrequalificationStore();
  const { tracker, setTracker } = useOnboardingTracker();
  const { selectedCompany } = useCompanySelection();
  const { handleFormError } = useFormErrorScroll<T>();

  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const values = getValues();

    // 1. Validate fields
    const fieldsToValidate = config.validationFields(values);
    const isValid = await trigger(
      fieldsToValidate as Parameters<typeof trigger>[0]
    );
    if (!isValid) {
      handleFormError(errors);
      return;
    }

    // 2. Optional business rule validation
    if (config.validateBusinessRules) {
      const ruleError = config.validateBusinessRules(values);
      if (ruleError) {
        alert(ruleError);
        return;
      }
    }

    // 3. Determine mode (POST or PATCH)
    const companyId = selectedCompany?.id;
    const urlTrackerId = params.id as string; // Extract tracker ID from URL
    const effectiveTrackerId = trackerId || urlTrackerId; // ✅ Use passed trackerId or fallback to URL
    const isFirstPost = config.buildFormData.length === 3;
    const isPatchMode = !isFirstPost && (tracker?.id || effectiveTrackerId);

    if (isFirstPost) {
      if (!prequalifications?.completed) {
        alert(
          "Prequalification data is missing. Please restart the application."
        );
        return;
      }
      if (!companyId || !COMPANIES.some((c) => c.id === companyId)) {
        alert("Invalid company selection. Please restart the application.");
        return;
      }
    }

    try {
      setSubmitting(true);

      // 4. Build FormData
      const formData =
        config.buildFormData.length === 4
          ? (
              config.buildFormData as (
                values: T,
                prequal: IPreQualifications,
                companyId: string,
                tracker?: any
              ) => FormData
            )(values, prequalifications!, companyId!, tracker)
          : config.buildFormData.length === 3
          ? (
              config.buildFormData as (
                values: T,
                prequal: IPreQualifications,
                companyId: string
              ) => FormData
            )(values, prequalifications!, companyId!)
          : (config.buildFormData as (values: T) => FormData)(values);

      // 5. Submit via shared utility
      const { trackerContext } = await submitFormStep({
        formData,
        tracker,
        nextRoute: config.nextRoute,
        urlTrackerId: effectiveTrackerId, // ✅ Pass effective tracker ID
      });

      // 6. Routing
      if (!isPatchMode) {
        if (trackerContext?.id) {
          setTracker(trackerContext);
          clearData();
          router.push(config.nextRoute.replace("[id]", trackerContext.id));
        } else {
          throw new Error("Tracker not returned from POST");
        }
      } else {
        router.push(config.nextRoute.replace("[id]", tracker?.id || ""));
      }
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
