/**
 * Continue Button Component — DriveDock (SSP Portal)
 * Author: Faruq Adebayo Atanda
 * Company: SSP Group of Companies
 * Created: 2025-01-27
 */

"use client";

import { useFormContext, FieldValues } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState, ReactNode } from "react";

import useMounted from "@/hooks/useMounted";
import { usePrequalificationStore } from "@/store/usePrequalificationStore";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import { useCompanySelection } from "@/hooks/frontendHooks/useCompanySelection";
import { useGlobalLoading } from "@/store/useGlobalLoading";
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
    formState: { errors, isDirty, dirtyFields }, // ✅ use RHF dirtiness
    // NOTE: avoid using formState.defaultValues for equality, it often differs in shape ('' vs undefined)
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
  const { show, hide } = useGlobalLoading();

  const onSubmit = async () => {
    const values = getValues();

    const urlTrackerId = params?.id as string | undefined;
    const effectiveTrackerId = trackerId || urlTrackerId;
    const isPost = !effectiveTrackerId; // POST for new, PATCH for existing

    const ctx: BuildPayloadCtx = {
      prequalifications: prequalifications ?? undefined,
      companyId: selectedCompany?.id,
      applicationType: selectedCompany?.type as ECompanyApplicationType | undefined,
      tracker,
      isPatch: !isPost,
      effectiveTrackerId,
    };

    const resolvedConfig = typeof config === "function" ? (config as FormPageConfigFactory<T>)(ctx) : (config as FormPageConfig<T>);

    // 1) Validate only the fields the page cares about
    const fieldsToValidate = resolvedConfig.validationFields(values);
    const valid = await trigger(fieldsToValidate as any);
    if (!valid) {
      handleFormError(errors);
      return;
    }

    // 2) Extra business rules if present
    const ruleError = resolvedConfig.validateBusinessRules?.(values);
    if (ruleError) {
      alert(ruleError);
      return;
    }

    // 3) POST pre-reqs
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

    // 4) 🔒 No‑op continue: rely on RHF's dirtiness instead of manual deep compare
    // - isDirty is usually enough
    // - some controlled subtrees may only mark dirtyFields; the OR covers edge cases
    const actuallyDirty = isDirty || Object.keys(dirtyFields ?? {}).length > 0;
    if (!isPost && !actuallyDirty) {
      router.push(tracker?.nextUrl ?? resolvedConfig.nextRoute);
      return;
    }

    try {
      setSubmitting(true);
      show(t("form.loading", "Processing..."));

      // 5) Build payload + submit
      const jsonPayload = resolvedConfig.buildPayload(getValues(), ctx);

      const { trackerContext, nextUrl } = await submitFormStep({
        json: jsonPayload,
        tracker,
        urlTrackerId,
        submitSegment: resolvedConfig.submitSegment,
      });

      // 6) Navigate (prefer server's nextUrl)
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
    } catch (err: any) {
      console.error("Submission error:", err);
      hide(); // hide on error; successful nav will swap screens
      alert(err?.message || "An error occurred while submitting. Please try again.");
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
        className={`px-8 py-2 mt-6 rounded-full font-semibold transition-all shadow-md flex items-center gap-2 cursor-pointer active:translate-y-[1px] active:shadow ${
          submitting ? "bg-gray-400 text-white cursor-not-allowed" : "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90"
        }`}
      >
        {submitting ? t("form.submitting") : t("form.continue")}
      </button>
    </div>
  );
}
