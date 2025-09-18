/**
 * Continue Button Component — DriveDock (SSP Portal)
 * (…header unchanged…)
 */

"use client";

import { useFormContext, FieldValues } from "react-hook-form";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useProtectedRouter } from "@/hooks/onboarding/useProtectedRouter";
import { useState, ReactNode } from "react";

import useMounted from "@/hooks/useMounted";
import { usePrequalificationStore } from "@/store/usePrequalificationStore";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import { useCompanySelection } from "@/hooks/frontendHooks/useCompanySelection";
import { useGlobalLoading } from "@/store/useGlobalLoading";
import { useFormErrorScroll } from "@/hooks/useFormErrorScroll";
import { COMPANIES } from "@/constants/companies";
import { submitFormStep } from "@/lib/frontendUtils/submitFormStep";
import { ECompanyApplicationType } from "@/constants/companies";
import { ErrorManager } from "@/lib/onboarding/errorManager";
import type {
  BuildPayloadCtx,
  FormPageConfig,
  FormPageConfigFactory,
} from "@/lib/frontendConfigs/formPageConfig.types";

// ✅ NEW: import deep-compare helpers
import { hasDeepChanges } from "@/lib/utils/deepCompare";

type ContinueButtonProps<T extends FieldValues> = {
  config: FormPageConfig<T> | FormPageConfigFactory<T>;
  trackerId?: string;
};

export default function ContinueButton<T extends FieldValues>({
  config,
  trackerId,
}: ContinueButtonProps<T>): ReactNode {
  const {
    getValues,
    trigger,
    formState: { errors, defaultValues },
  } = useFormContext<T>();

  const router = useProtectedRouter();
  const params = useParams();

  const mounted = useMounted();
  const { t } = useTranslation("common");

  const { data: prequalifications, clearData } = usePrequalificationStore();
  const { tracker, setTracker } = useOnboardingTracker();
  const { selectedCompany, clearSelectedCompany } = useCompanySelection();
  const { handleFormError } = useFormErrorScroll<T>();

  const [submitting, setSubmitting] = useState(false);
  const { show, hide } = useGlobalLoading();

  const onSubmit = async () => {
    const values = getValues();

    const urlTrackerId = params?.id as string | undefined;
    const effectiveTrackerId = trackerId || urlTrackerId;
    // For POST flow, we should not have a trackerId and should be on (noid) route
    const isPost = !effectiveTrackerId && !urlTrackerId; // POST for new, PATCH for existing

    const ctx: BuildPayloadCtx = {
      prequalifications: prequalifications ?? undefined,
      companyId: selectedCompany?.id,
      applicationType: selectedCompany?.type as
        | ECompanyApplicationType
        | undefined,
      tracker,
      isPatch: !isPost,
      effectiveTrackerId,
    };

    const resolvedConfig =
      typeof config === "function"
        ? (config as FormPageConfigFactory<T>)(ctx)
        : (config as FormPageConfig<T>);

    const fieldsToValidate = resolvedConfig.validationFields(values);
    const isValid = await trigger(
      fieldsToValidate as Parameters<typeof trigger>[0]
    );
    if (!isValid) {
      handleFormError(errors);
      return;
    }

    const ruleError = resolvedConfig.validateBusinessRules?.(values);
    if (ruleError) {
      // Show business rule error via ErrorManager
      const errorManager = ErrorManager.getInstance();
      errorManager.showModal({
        type: "GENERIC_ERROR" as any,
        title: t("errors.generic.title", "Error"),
        message: ruleError,
        primaryAction: {
          label: t("errors.generic.tryAgain", "OK"),
          action: () => errorManager.hideModal()
        },
        canClose: true
      });
      return;
    }

    if (isPost) {
      if (!prequalifications?.completed) {
        const errorManager = ErrorManager.getInstance();
        errorManager.showModal({
          type: "GENERIC_ERROR" as any,
          title: t("errors.generic.title", "Error"),
          message: "Prequalification data is missing. Please restart the application.",
          primaryAction: {
            label: "Restart Application",
            action: () => {
              window.location.href = "/start/company";
            }
          },
          canClose: false
        });
        return;
      }
      const companyId = selectedCompany?.id;
      if (!companyId || !COMPANIES.some((c) => c.id === companyId)) {
        const errorManager = ErrorManager.getInstance();
        errorManager.showModal({
          type: "GENERIC_ERROR" as any,
          title: t("errors.generic.title", "Error"),
          message: "Invalid company selection. Please restart the application.",
          primaryAction: {
            label: "Restart Application",
            action: () => {
              window.location.href = "/start/company";
            }
          },
          canClose: false
        });
        return;
      }
    }

    try {
      setSubmitting(true);

      // =====================
      // No‑op continue (PATCH)
      // =====================
      const formValues = getValues();

      const hasChanges = hasDeepChanges(
        formValues,
        (defaultValues ?? {}) as Partial<T>,
        {
          nullAsUndefined: true,
          emptyStringAsUndefined: true,
        }
      );

      if (!isPost && !hasChanges) {
        router.push(resolvedConfig.nextRoute);
        return;
      }

      show(t("form.loading", "Processing..."));

      const jsonPayload = resolvedConfig.buildPayload(values, ctx);

      const { trackerContext, nextUrl } = await submitFormStep({
        json: jsonPayload,
        tracker,
        urlTrackerId,
        submitSegment: resolvedConfig.submitSegment,
      });

      if (isPost) {
        if (!trackerContext?.id)
          throw new Error("Tracker not returned from POST");
        setTracker(trackerContext);
        clearData();
        clearSelectedCompany(); // Clear company selection after successful POST
        router.push(nextUrl ?? resolvedConfig.nextRoute);
      } else {
        if (trackerContext) setTracker(trackerContext);
        router.push(nextUrl ?? resolvedConfig.nextRoute);
        if (!nextUrl) router.refresh();
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      hide();
      // Error display is now handled by ErrorManager through submitFormStep
    } finally {
      setSubmitting(false);
      // Success path leaves global loader visible until route transition
    }
  };

  if (!mounted) return null;
  return (
    <div className="flex justify-center">
      <button
        type="button"
        disabled={submitting}
        onClick={onSubmit}
        className={`px-8 py-2 mt-6 rounded-full font-semibold transition-all shadow-md flex items-center gap-2 cursor-pointer active:translate-y-[1px] active:shadow ${
          submitting
            ? "bg-gray-400 text-white cursor-not-allowed"
            : "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90"
        }`}
      >
        {submitting ? t("form.submitting") : t("form.continue")}
      </button>
    </div>
  );
}
