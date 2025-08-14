/**
 * Continue Button Component — DriveDock (SSP Portal)
 *
 * Description:
 * Reusable button component for form step navigation in the onboarding flow.
 * Handles form validation, submission, and navigation with integrated loading states.
 * Supports both config objects and config factories for flexible usage.
 *
 * Features:
 * - Form validation before submission
 * - Automatic loading state management
 * - Server-driven navigation (prefers nextUrl from server)
 * - No-op continue for unchanged forms (skips unnecessary PATCH)
 * - Integrated error handling and user feedback
 *
 * Props:
 * - config: FormPageConfig or FormPageConfigFactory
 * - trackerId: Optional tracker ID (falls back to URL params)
 *
 * Author: Faruq Adebayo Atanda
 * Company: SSP Group of Companies
 * Created: 2025-01-27
 */

"use client";

/**
 * ContinueButton Component
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
import { useGlobalLoading } from "@/store/useGlobalLoading";
import { useFormErrorScroll } from "@/hooks/useFormErrorScroll";
import { COMPANIES } from "@/constants/companies";
import { submitFormStep } from "@/lib/frontendUtils/submitFormStep";
import { ECompanyApplicationType } from "@/hooks/frontendHooks/useCompanySelection";
import type {
  BuildPayloadCtx,
  FormPageConfig,
  FormPageConfigFactory,
} from "@/lib/frontendConfigs/formPageConfig.types";

type ContinueButtonProps<T extends FieldValues> = {
  config: FormPageConfig<T> | FormPageConfigFactory<T>;
  trackerId?: string;
};

export default function ContinueButton<T extends FieldValues>({
  config,
  trackerId,
}: ContinueButtonProps<T>): ReactNode {
  // React Hook Form context for form state management
  const {
    getValues,
    trigger,
    formState: { errors, defaultValues },
  } = useFormContext<T>();

  // Next.js navigation and routing
  const router = useRouter();
  const params = useParams();

  // Client-side mounting check to prevent hydration issues
  const mounted = useMounted();
  const { t } = useTranslation("common");

  // Global state management
  const { data: prequalifications, clearData } = usePrequalificationStore();
  const { tracker, setTracker } = useOnboardingTracker();
  const { selectedCompany } = useCompanySelection();
  const { handleFormError } = useFormErrorScroll<T>();

  // Local state for submission tracking
  const [submitting, setSubmitting] = useState(false);
  const { show, hide } = useGlobalLoading();

  /**
   * Handles form submission, validation, and navigation
   * Orchestrates the complete flow from validation to navigation
   */
  const onSubmit = async () => {
    const values = getValues();

    // Resolve context for validation and submission
    const urlTrackerId = params?.id as string | undefined;
    const effectiveTrackerId = trackerId || urlTrackerId;
    const isPost = !effectiveTrackerId; // POST for new, PATCH for existing

    // Build context object for config resolution
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

    // Step 1: Validate form fields based on page configuration
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

    // Step 2: Check business rules (if defined)
    const ruleError = resolvedConfig.validateBusinessRules?.(values);
    if (ruleError) {
      alert(ruleError);
      return;
    }

    // Step 3: Validate prerequisites for POST operations
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

      // Step 4: No-op continue - skip PATCH if form hasn't changed
      // Use a more reliable dirty check that handles boolean fields and deep comparisons
      const formValues = getValues();
      const hasChanges = Object.keys(formValues).some((key) => {
        const currentValue = formValues[key as keyof typeof formValues];
        const defaultValue = defaultValues?.[key as keyof typeof defaultValues];

        // Handle arrays (like employments)
        if (Array.isArray(currentValue) && Array.isArray(defaultValue)) {
          return JSON.stringify(currentValue) !== JSON.stringify(defaultValue);
        }

        // Handle primitive values
        return currentValue !== defaultValue;
      });

      if (!isPost && !hasChanges) {
        router.push(tracker?.nextUrl ?? resolvedConfig.nextRoute);
        return;
      }

      // Step 5: Show loading immediately for API operations
      show(t("form.loading", "Processing..."));

      // Step 6: Build payload and submit to server
      const jsonPayload = resolvedConfig.buildPayload(values, ctx);

      const { trackerContext, nextUrl } = await submitFormStep({
        json: jsonPayload,
        tracker,
        urlTrackerId,
        submitSegment: resolvedConfig.submitSegment,
      });

      // Step 6: Navigate to next step (prefer server-provided nextUrl)
      if (isPost) {
        if (!trackerContext?.id)
          throw new Error("Tracker not returned from POST");
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
      hide(); // Hide loading screen on error
      alert(
        err.message || "An error occurred while submitting. Please try again."
      );
    } finally {
      setSubmitting(false);
      // Only hide loading screen on error - successful navigation will be handled by navigation loading system
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
