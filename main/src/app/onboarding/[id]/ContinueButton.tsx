"use client";

/**
 * <ContinueButton />
 * - Accepts a config object OR a config factory (receives BuildPayloadCtx)
 * - Prefers server-provided nextUrl; otherwise uses config.nextRoute (already resolved)
 * - No-op continue: if revisiting (PATCH path) and form is NOT dirty, skip PATCH and navigate
 */

import { useFormContext, FieldValues } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState, ReactNode } from "react";

import useMounted from "@/hooks/useMounted";
import { usePrequalificationStore } from "@/store/usePrequalificationStore";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import { useCompanySelection } from "@/hooks/frontendHooks/useCompanySelection";
import { useFormErrorScroll } from "@/hooks/useFormErrorScroll";
import { COMPANIES } from "@/constants/companies";
import { submitFormStep } from "@/lib/frontendUtils/submitFormStep";
import { ECompanyApplicationType } from "@/hooks/frontendHooks/useCompanySelection";
import type { BuildPayloadCtx, FormPageConfig, FormPageConfigFactory } from "@/lib/frontendConfigs/formPageConfig.types";

type ContinueButtonProps<T extends FieldValues> = {
  config: FormPageConfig<T> | FormPageConfigFactory<T>;
  trackerId?: string;
};

export default function ContinueButton<T extends FieldValues>({ config, trackerId }: ContinueButtonProps<T>): ReactNode {
  const {
    getValues,
    trigger,
    formState: { errors, isDirty },
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

    // Resolve context now (used for both validationFields + submission)
    const urlTrackerId = params?.id as string | undefined;
    const effectiveTrackerId = trackerId || urlTrackerId;
    const isPost = !effectiveTrackerId;

    const ctx: BuildPayloadCtx = {
      prequalifications: prequalifications ?? undefined,
      companyId: selectedCompany?.id,
      applicationType: selectedCompany?.type as ECompanyApplicationType | undefined,
      tracker,
      isPatch: !isPost,
      effectiveTrackerId,
    };

    // 1) Validate fields listed by this page
    const resolvedConfig = typeof config === "function" ? (config as FormPageConfigFactory<T>)(ctx) : (config as FormPageConfig<T>);

    const fieldsToValidate = resolvedConfig.validationFields(values);
    const isValid = await trigger(fieldsToValidate as Parameters<typeof trigger>[0]);
    if (!isValid) {
      handleFormError(errors);
      return;
    }

    // 2) Business rules (optional)
    const ruleError = resolvedConfig.validateBusinessRules?.(values);
    if (ruleError) {
      alert(ruleError);
      return;
    }

    // 3) For POST pages, ensure prequalifications & company selection exist
    if (isPost) {
      if (!prequalifications?.completed) {
        alert("Prequalification data is missing. Please restart the application.");
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

      // 4) NO-OP CONTINUE: If revisiting and nothing changed, skip PATCH and go forward
      if (!isPost && !isDirty) {
        router.push(tracker?.nextUrl ?? resolvedConfig.nextRoute);
        return;
      }

      // 5) Build JSON payload and submit
      const jsonPayload = resolvedConfig.buildPayload(values, ctx);

      const { trackerContext, nextUrl } = await submitFormStep({
        json: jsonPayload,
        tracker,
        urlTrackerId,
        submitSegment: resolvedConfig.submitSegment,
      });

      // 6) Navigate (prefer server-driven nextUrl)
      if (isPost) {
        if (!trackerContext?.id) throw new Error("Tracker not returned from POST");
        setTracker(trackerContext);
        clearData();
        router.push(nextUrl ?? resolvedConfig.nextRoute);
      } else {
        if (trackerContext) setTracker(trackerContext); // keep store fresh if returned
        router.push(nextUrl ?? resolvedConfig.nextRoute);
        if (!nextUrl) router.refresh();
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      alert(err.message || "An error occurred while submitting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;
  return (
    <div className="flex justify-center">
      <button
        type="button"
        disabled={submitting}
        onClick={onSubmit}
        className={`px-8 py-2 mt-6 rounded-full font-semibold transition-colors shadow-md flex items-center gap-2 ${
          submitting ? "bg-gray-400 text-white cursor-not-allowed" : "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90"
        }`}
      >
        {submitting ? t("form.submitting") : t("form.continue")}
      </button>
    </div>
  );
}
