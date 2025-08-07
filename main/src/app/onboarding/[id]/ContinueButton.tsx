"use client";

/**
 * <ContinueButton />
 *
 * Generic continue button for multi-step DriveDock form pages.
 * Handles validation, business rule checks, and submits via POST or PATCH.
 *
 * Supports:
 * - Dynamic form field validation
 * - Resume flow using tracker ID
 * - Delegates JSON payload construction to page-level config
 * - Auto PATCH if tracker ID exists (via Zustand or URL)
 * - Redirect + router.refresh() to reload server-rendered form pages
 */

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

type ContinueButtonProps<T extends FieldValues> = {
  config: {
    validationFields: (values: T) => string[];
    buildPayload: (
      values: T,
      prequalifications?: any,
      companyId?: string,
      tracker?: any
    ) => Record<string, unknown>;
    nextRoute: string;
    submitSegment: string;
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

    // ✅ Validate RHF fields
    const fieldsToValidate = config.validationFields(values);
    const isValid = await trigger(
      fieldsToValidate as Parameters<typeof trigger>[0]
    );
    if (!isValid) {
      handleFormError(errors);
      return;
    }

    // ✅ Business rules (e.g. employment gap rules)
    if (config.validateBusinessRules) {
      const ruleError = config.validateBusinessRules(values);
      if (ruleError) {
        alert(ruleError);
        return;
      }
    }

    const urlTrackerId = params?.id as string;
    const effectiveTrackerId = trackerId || urlTrackerId;
    const isPost = !effectiveTrackerId;

    // ✅ Validate POST requirements (Page 1 only)
    if (isPost) {
      if (!prequalifications?.completed) {
        alert(
          "Prequalification data is missing. Please restart the application."
        );
        return;
      }

      const companyId = selectedCompany?.id;
      if (!companyId || !COMPANIES.some((c) => c.id === companyId)) {
        alert("Invalid company selection. Please restart the application.");
        return;
      }
    }

    try {
      setSubmitting(true);

      // ✅ Build payload from config (includes sin cleanup, page keys, etc.)
      const jsonPayload = config.buildPayload(
        values,
        prequalifications,
        selectedCompany?.id,
        tracker
      );

      const { trackerContext } = await submitFormStep({
        json: jsonPayload,
        tracker,
        urlTrackerId,
        submitSegment: config.submitSegment,
      });

      // Redirect and refresh
      if (isPost) {
        if (trackerContext?.id) {
          setTracker(trackerContext);
          clearData();
          router.push(config.nextRoute.replace("[id]", trackerContext.id));
        } else {
          throw new Error("Tracker not returned from POST");
        }
      } else {
        router.push(config.nextRoute.replace("[id]", effectiveTrackerId));
        router.refresh();
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
