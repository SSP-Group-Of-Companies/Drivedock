"use client";

/**
 * ===============================================================
 * <ContinueButton />
 * ---------------------------------------------------------------
 * Generic continue/next button for DriveDock multi-step forms.
 *
 * Delegates all form-specific logic to a passed `config`:
 *  - validationFields(values): string[]
 *  - validateBusinessRules?(values): string | null
 *  - buildPayload(values, prequalifications, companyId, tracker): any
 *  - nextRoute: string (fallback)
 *  - submitSegment: string
 *
 * Flow:
 *  - Validates specified fields via RHF
 *  - Optional business rules (config)
 *  - Determines POST vs PATCH based on presence of trackerId/URL param
 *  - Submits via submitFormStep()
 *  - Navigates using server `trackerContext.nextUrl` when present,
 *    falling back to config.nextRoute
 *
 * Owner: SSP Tech Team – Faruq Adebayo Atanda
 * ===============================================================
 */
// main/src/app/onboarding/[id]/ContinueButton.tsx
"use client";

import { useFormContext, FieldValues } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState, ReactNode } from "react";

//components, hooks, and types
import useMounted from "@/hooks/useMounted";
import { usePrequalificationStore } from "@/store/usePrequalificationStore";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import { useCompanySelection } from "@/hooks/frontendHooks/useCompanySelection";
import { useFormErrorScroll } from "@/hooks/useFormErrorScroll";
import { COMPANIES } from "@/constants/companies";
import { submitFormStep } from "@/lib/frontendUtils/submitFormStep";
import { ECompanyApplicationType } from "@/hooks/frontendHooks/useCompanySelection";
import type { FormPageConfig } from "@/lib/frontendConfigs/formPageConfig.types";

type ContinueButtonProps<T extends FieldValues> = {
  config: FormPageConfig<T>;
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

  const mounted = useMounted();
  const { t } = useTranslation("common");

  const { data: prequalifications, clearData } = usePrequalificationStore();
  const { tracker, setTracker } = useOnboardingTracker();
  const { selectedCompany } = useCompanySelection();
  const { handleFormError } = useFormErrorScroll<T>();

  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const values = getValues();

    const fieldsToValidate = config.validationFields(values);
    const isValid = await trigger(
      fieldsToValidate as Parameters<typeof trigger>[0]
    );
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

    const urlTrackerId = params?.id as string | undefined;
    const effectiveTrackerId = trackerId || urlTrackerId;
    const isPost = !effectiveTrackerId;

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

      const jsonPayload = config.buildPayload(values, {
        prequalifications: prequalifications ?? undefined,
        companyId: selectedCompany?.id,
        applicationType: selectedCompany?.type as
          | ECompanyApplicationType
          | undefined,
        tracker,
        isPatch: !isPost, // << NEW
        effectiveTrackerId, // << NEW
      });

      const { trackerContext, nextUrl } = await submitFormStep({
        json: jsonPayload,
        tracker,
        urlTrackerId,
        submitSegment: config.submitSegment,
      });

      if (isPost) {
        if (!trackerContext?.id)
          throw new Error("Tracker not returned from POST");
        setTracker(trackerContext);
        clearData();
        router.push(
          nextUrl ?? config.nextRoute.replace("[id]", trackerContext.id)
        );
      } else {
        router.push(
          nextUrl ?? config.nextRoute.replace("[id]", effectiveTrackerId!)
        );
        if (!nextUrl) router.refresh();
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("An error occurred while submitting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Only render button if mounted to avoid hydration mismatch
  if (!mounted) return null;
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
