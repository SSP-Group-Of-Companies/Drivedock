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
import type { BuildPayloadCtx, FormPageConfig, FormPageConfigFactory } from "@/lib/frontendConfigs/formPageConfig.types";

type ContinueButtonProps<T extends FieldValues> = {
  config: FormPageConfig<T> | FormPageConfigFactory<T>;
  trackerId?: string;
};

// =====================
// Deep compare helpers
// =====================
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Object.prototype.toString.call(v) === "[object Object]";
}

function isDate(v: unknown): v is Date {
  return v instanceof Date || (typeof v === "string" && !isNaN(Date.parse(v)));
}

function isFileLike(v: unknown): v is { name: string; size: number; type?: string; lastModified?: number } {
  // Works in browser for File/Blob; remains safe in SSR (will just return false).
  return !!v && typeof v === "object" && "name" in (v as any) && "size" in (v as any);
}

/**
 * Normalize values for stable comparison:
 * - Convert Date-like strings to Date timestamps
 * - Convert File objects to a comparable shape
 * - Remove undefined values (treat missing and undefined as equal)
 * - Optionally treat "" and null as undefined (toggle by need)
 */
function normalizeForCompare<T>(input: T): any {
  const seen = new WeakMap<object, any>();

  const walk = (val: any): any => {
    // Handle primitives
    if (val === undefined) return undefined;
    if (val === null) return undefined; // treat null ~ undefined (toggle off if you need strict)
    if (typeof val === "string" && val.trim() === "") return undefined; // treat empty string ~ undefined (toggle off if needed)
    if (typeof val !== "object") return Number.isNaN(val) ? "__NaN__" : val;

    // Handle Date-like
    if (isDate(val)) {
      const d = val instanceof Date ? val : new Date(val);
      return ["__Date__", d.getTime()];
    }

    // Handle File-like
    if (isFileLike(val)) {
      const f = val as any;
      return ["__File__", f.name, f.size, f.type ?? "", f.lastModified ?? 0];
    }

    // Avoid cycles
    if (seen.has(val)) return seen.get(val);

    if (Array.isArray(val)) {
      const out = val.map(walk).filter((x) => x !== undefined); // drop undefined entries
      seen.set(val, out);
      return out;
    }

    if (isPlainObject(val)) {
      const out: Record<string, any> = {};
      seen.set(val, out);
      for (const key of Object.keys(val).sort()) {
        const v = walk(val[key]);
        if (v !== undefined) out[key] = v; // remove undefined keys
      }
      return out;
    }

    // Fallback (Map/Set/etc.) – stringify as last resort
    try {
      return JSON.parse(JSON.stringify(val));
    } catch {
      return String(val);
    }
  };

  return walk(input);
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  // NaN equality
  if (typeof a === "number" && typeof b === "number" && Number.isNaN(a) && Number.isNaN(b)) {
    return true;
  }

  // If types differ after normalization, they'll fail below
  if (typeof a !== "object" || typeof b !== "object" || a == null || b == null) {
    return false;
  }

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Objects
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

export default function ContinueButton<T extends FieldValues>({ config, trackerId }: ContinueButtonProps<T>): ReactNode {
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
      applicationType: selectedCompany?.type as ECompanyApplicationType | undefined,
      tracker,
      isPatch: !isPost,
      effectiveTrackerId,
    };

    // Step 1: Validate form fields based on page configuration
    const resolvedConfig = typeof config === "function" ? (config as FormPageConfigFactory<T>)(ctx) : (config as FormPageConfig<T>);

    const fieldsToValidate = resolvedConfig.validationFields(values);
    const isValid = await trigger(fieldsToValidate as Parameters<typeof trigger>[0]);
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

      // =====================
      // Step 4: No‑op continue
      // =====================
      const formValues = getValues();

      // Normalize both sides so comparison is stable and forgiving for empty/undefined/null
      const normalizedCurrent = normalizeForCompare(formValues);
      const normalizedDefault = normalizeForCompare(defaultValues ?? {});

      // Deep compare the whole form (covers nested objects & arrays)
      const hasChanges = !deepEqual(normalizedCurrent, normalizedDefault);

      if (!isPost && !hasChanges) {
        router.push(resolvedConfig.nextRoute);
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
      hide(); // Hide loading screen on error
      alert(err.message || "An error occurred while submitting. Please try again.");
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
          submitting ? "bg-gray-400 text-white cursor-not-allowed" : "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90"
        }`}
      >
        {submitting ? t("form.submitting") : t("form.continue")}
      </button>
    </div>
  );
}
