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
import { submitFormStep } from "@/lib/frontendUtils/submitFormStep";
import { EApplicationType } from "@/types/onboardingTracker.type";

type ContinueButtonProps<T extends FieldValues> = {
  config: {
    validationFields: (values: T) => string[];
    nextRoute: string;
    validateBusinessRules?: (values: T) => string | null;
  };
  trackerId?: string;
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

    const fieldsToValidate = config.validationFields(values);
    const isValid = await trigger(fieldsToValidate as Parameters<typeof trigger>[0]);
    if (!isValid) {
      handleFormError(errors);
      return;
    }

    if (config.validateBusinessRules) {
      const ruleError = config.validateBusinessRules(values);
      if (ruleError) {
        alert(ruleError);
        return;
      }
    }

    const companyId = selectedCompany?.id;
    const urlTrackerId = params.id as string;
    const effectiveTrackerId = trackerId || urlTrackerId;
    const isPost = !tracker?.id && !effectiveTrackerId;

    if (isPost) {
      if (!prequalifications?.completed) {
        alert("Prequalification data is missing. Please restart the application.");
        return;
      }

      if (!companyId || !COMPANIES.some((c) => c.id === companyId)) {
        alert("Invalid company selection. Please restart the application.");
        return;
      }
    }

    try {
      setSubmitting(true);

      const jsonPayload = isPost
        ? {
          applicationFormPage1: values,
          prequalifications,
          companyId,
          applicationType: EApplicationType.FLAT_BED,
        }
        : values;

      const { trackerContext } = await submitFormStep({
        json: jsonPayload,
        tracker,
        nextRoute: config.nextRoute,
        urlTrackerId: effectiveTrackerId,
      });

      if (isPost) {
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
          ${submitting
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
