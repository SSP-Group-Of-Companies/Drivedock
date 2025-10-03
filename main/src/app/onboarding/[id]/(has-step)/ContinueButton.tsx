/**
 * Continue Button Component — DriveDock (SSP Portal)
 * Adds confirmation popup via ErrorManager.showConfirm before submitting.
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
import { useCountrySelection } from "@/hooks/useCountrySelection";
import { useGlobalLoading } from "@/store/useGlobalLoading";
import { useFormErrorScroll } from "@/hooks/useFormErrorScroll";
import { submitFormStep } from "@/lib/frontendUtils/submitFormStep";
import { ErrorManager } from "@/lib/onboarding/errorManager";
import type { BuildPayloadCtx, FormPageConfig, FormPageConfigFactory } from "@/lib/frontendConfigs/formPageConfig.types";

import { hasDeepChanges } from "@/lib/utils/deepCompare";

type ContinueButtonProps<T extends FieldValues> = {
  config: FormPageConfig<T> | FormPageConfigFactory<T>;
  trackerId?: string;
};

export default function ContinueButton<T extends FieldValues>({ config, trackerId }: ContinueButtonProps<T>): ReactNode {
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
  const { selectedCountryCode } = useCountrySelection();
  const { handleFormError } = useFormErrorScroll<T>();

  const [submitting, setSubmitting] = useState(false);
  const { show, hide } = useGlobalLoading();

  // Extract the actual submit logic so the confirmation popup can call it.
  const doSubmit = async (resolvedConfig: FormPageConfig<T>, ctx: BuildPayloadCtx, isPost: boolean, urlTrackerId?: string) => {
    try {
      setSubmitting(true);

      // For PATCH, if nothing changed, just navigate forward.
      const formValues = getValues();
      const hasChanges = hasDeepChanges(formValues, (defaultValues ?? {}) as Partial<T>, { nullAsUndefined: true, emptyStringAsUndefined: true });

      if (!isPost && !hasChanges) {
        router.push(resolvedConfig.nextRoute);
        return;
      }

      show(t("form.loading", "Processing..."));

      const jsonPayload = resolvedConfig.buildPayload(formValues, ctx);

      const { trackerContext, nextUrl } = await submitFormStep({
        json: jsonPayload,
        tracker,
        urlTrackerId,
        submitSegment: resolvedConfig.submitSegment,
      });

      if (isPost) {
        if (!trackerContext?.id) throw new Error("Tracker not returned from POST");
        setTracker(trackerContext);
        clearData();
        router.push(nextUrl ?? resolvedConfig.nextRoute);
      } else {
        if (trackerContext) setTracker(trackerContext);
        router.push(nextUrl ?? resolvedConfig.nextRoute);
        if (!nextUrl) router.refresh();
      }
    } catch (err) {
      console.error("Submission error:", err);
      // Error modal is handled by submitFormStep’s internal usage of ErrorManager
      hide();
    } finally {
      setSubmitting(false);
      // On success, leave loader to be cleared by route transition
    }
  };

  const onSubmit = async () => {
    const values = getValues();

    const urlTrackerId = params?.id as string | undefined;
    const effectiveTrackerId = trackerId || urlTrackerId;
    const isPost = !effectiveTrackerId && !urlTrackerId; // POST for new, PATCH for existing

    const ctx: BuildPayloadCtx = {
      prequalifications: prequalifications ?? undefined,
      countryCode: selectedCountryCode as any,
      tracker,
      isPatch: !isPost,
      effectiveTrackerId,
    };

    const resolvedConfig = typeof config === "function" ? (config as FormPageConfigFactory<T>)(ctx) : (config as FormPageConfig<T>);

    // 1) Field-level validation
    const fieldsToValidate = resolvedConfig.validationFields(values);
    const isValid = await trigger(fieldsToValidate as Parameters<typeof trigger>[0]);
    if (!isValid) {
      handleFormError(errors);
      return;
    }

    // 2) Business rules validation
    const ruleError = resolvedConfig.validateBusinessRules?.(values);
    if (ruleError) {
      const errorManager = ErrorManager.getInstance();
      errorManager.showModal({
        type: "GENERIC_ERROR" as any,
        title: t("errors.generic.title", "Error"),
        message: ruleError,
        primaryAction: {
          label: t("errors.generic.tryAgain", "OK"),
          action: () => errorManager.hideModal(),
        },
        canClose: true,
      });
      return;
    }

    // 3) POST-time guards
    if (isPost) {
      if (!prequalifications?.completed) {
        const errorManager = ErrorManager.getInstance();
        errorManager.showModal({
          type: "GENERIC_ERROR" as any,
          title: t("errors.generic.title", "Error"),
          message: "Prequalification data is missing. Please restart the application.",
          primaryAction: {
            label: "Back to Start",
            action: () => {
              window.location.href = "/start";
            },
          },
          canClose: false,
        });
        return;
      }
      // Company is no longer required on initial POST
      if (!selectedCountryCode) {
        const errorManager = ErrorManager.getInstance();
        errorManager.showModal({
          type: "GENERIC_ERROR" as any,
          title: t("errors.generic.title", "Error"),
          message: "Country not selected. Please start again and choose a country.",
          primaryAction: {
            label: "Back to Start",
            action: () => {
              window.location.href = "/start";
            },
          },
          canClose: false,
        });
        return;
      }
    }

    // 4) Optional confirmation popup BEFORE submit
    const popup = resolvedConfig.confirmationPopup;
    if (popup?.show) {
      const errorManager = ErrorManager.getInstance();

      // Uses your new ErrorManager.showConfirm helper
      errorManager.showConfirm({
        title: popup.title,
        message: popup.message,
        confirmLabel: popup.confirmLabel,
        cancelLabel: popup.cancelLabel,
        onConfirm: async () => {
          await doSubmit(resolvedConfig, ctx, isPost, urlTrackerId);
        },
        onCancel: () => {
          // no-op; modal hides automatically
        },
        canClose: true,
      });

      return; // wait for user choice
    }

    // 5) No confirmation required — submit immediately
    await doSubmit(resolvedConfig, ctx, isPost, urlTrackerId);
  };

  if (!mounted) return null;

  return (
    <div className="flex justify-center">
      <button
        type="button"
        disabled={submitting}
        onClick={onSubmit}
        className={`px-8 py-2 mt-6 rounded-full font-semibold transition-all shadow-md flex items-center gap-2 cursor-pointer active:translate-y-[1px] active:shadow ${
          submitting ? "bg-gray-400 text-white cursor-not-allowed" : "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90"
        }`}
      >
        {submitting ? t("form.submitting") : t("form.continue")}
      </button>
    </div>
  );
}
