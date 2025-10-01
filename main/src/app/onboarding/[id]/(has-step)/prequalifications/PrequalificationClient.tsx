"use client";

/**
 * ========================================================================
 * DriveDock – PreQualificationClient (Resume/Edit Path)
 * ------------------------------------------------------------------------
 * - Prefers company from trackerContext (getSelectedCompany(companyId))
 *   and falls back to useCompanySelection() when missing.
 * - NEW: accepts a `disabled` prop to render all inputs read-only/disabled
 *   while keeping the Next button functional.
 * ========================================================================
 */

import { useForm, Controller } from "react-hook-form";
import { useEffect, useState, useMemo } from "react";

import { preQualificationQuestions, categoryQuestions } from "@/constants/form-questions/preQualification";
import { useTranslation } from "react-i18next";
import { useProtectedRouter } from "@/hooks/onboarding/useProtectedRouter";
import { ArrowRight } from "lucide-react";

// components, hooks, and types
import useMounted from "@/hooks/useMounted";
import QuestionGroup from "@/app/onboarding/components/QuestionGroup";
import FlatbedPopup from "@/app/onboarding/components/FlatbedPopup";
import { useCompanySelection } from "@/hooks/frontendHooks/useCompanySelection";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import { useGlobalLoading } from "@/store/useGlobalLoading";
import { apiClient } from "@/lib/onboarding/apiClient";
import { ErrorManager } from "@/lib/onboarding/errorManager";
import { EDriverType, EHaulPreference, ETeamStatus, EStatusInCanada, IPreQualifications } from "@/types/preQualifications.types";
import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { buildOnboardingStepPath } from "@/lib/utils/onboardingUtils";
import { getCompanyById } from "@/constants/companies";
import { hasDeepChanges } from "@/lib/utils/deepCompare";

/**
 * RHF form shape for this page.
 * - Keys = question names
 * - Values:
 *    • Booleans: "form.yes" | "form.no"
 *    • Categories: enum values (EDriverType, EHaulPreference, ETeamStatus)
 */
type FormValues = Record<string, string>;

type Props = {
  defaultValues: FormValues;
  trackerId: string;
  trackerContext?: IOnboardingTrackerContext | null;
  /** When true, renders all inputs read-only/disabled; Next button still works */
  disabled?: boolean;
};

export default function PreQualificationClient({ defaultValues, trackerId, trackerContext, disabled = false }: Props) {
  const mounted = useMounted(); // Prevent SSR/CSR mismatch
  const { t } = useTranslation("common");
  const router = useProtectedRouter();

  // 1) Pull currently selected company from UI (fallback)
  const { selectedCompany } = useCompanySelection();

  // 2) Prefer company from trackerContext if available; else fallback to UI selection
  //    This ensures the "resume" path uses the persisted company choice.
  const effectiveCompany = useMemo(() => {
    if (trackerContext?.companyId) {
      return getCompanyById(trackerContext.companyId) ?? selectedCompany ?? null;
    }
    return selectedCompany ?? null;
  }, [trackerContext?.companyId, selectedCompany]);

  const { setTracker } = useOnboardingTracker(); // Hydrate tracker into Zustand
  const { show, hide } = useGlobalLoading();

  // Controls visibility/content of the flatbed training popup
  const [showFlatbedPopup, setShowFlatbedPopup] = useState<null | "yes" | "no">(null);

  // On first render or when trackerContext changes, sync it into Zustand
  useEffect(() => {
    if (trackerContext?.id) setTracker(trackerContext);
  }, [trackerContext, setTracker]);

  // Conditionally exclude Canada-only questions for US companies
  const filteredPreQualificationQuestions = useMemo(() => {
    if (!effectiveCompany) return preQualificationQuestions;
    if (effectiveCompany.countryCode === "US") {
      // Hide Canada-only questions for US company
      return preQualificationQuestions.filter((q) => q.name !== "canCrossBorderUSA" && q.name !== "hasFASTCard" && q.name !== "statusInCanada" && q.name !== "eligibleForFASTCard");
    }
    return preQualificationQuestions;
  }, [effectiveCompany]);

  // Initialize RHF with defaults; validate on change for button enablement
  const { control, handleSubmit, watch, setValue } = useForm<FormValues>({
    mode: "onChange",
    defaultValues,
  });

  // Watch all fields to determine whether the Next button should be enabled
  const watchAllFields = watch();

  // Get the status in Canada value for conditional logic
  const statusInCanada = watchAllFields.statusInCanada;

  // Apply conditional filtering based on status in Canada
  const finalFilteredQuestions = useMemo(() => {
    if (!effectiveCompany || effectiveCompany.countryCode === "US") {
      return filteredPreQualificationQuestions;
    }

    // For Canadian companies, apply conditional logic
    let questions = [...filteredPreQualificationQuestions];

    // Only show FAST card question if user has selected PR or Citizenship
    if (statusInCanada !== EStatusInCanada.PR && statusInCanada !== EStatusInCanada.Citizenship) {
      questions = questions.filter((q) => q.name !== "hasFASTCard");
    }

    // Only show eligible for FAST card question if user is PR/Citizen AND answered "no" to FAST card
    if (statusInCanada === EStatusInCanada.PR || statusInCanada === EStatusInCanada.Citizenship) {
      if (watchAllFields.hasFASTCard === "form.no") {
        // Keep eligibleForFASTCard question
      } else {
        // Remove eligibleForFASTCard question
        questions = questions.filter((q) => q.name !== "eligibleForFASTCard");
      }
    } else {
      // Remove eligibleForFASTCard question if not PR/Citizen
      questions = questions.filter((q) => q.name !== "eligibleForFASTCard");
    }

    return questions;
  }, [filteredPreQualificationQuestions, effectiveCompany, statusInCanada, watchAllFields.hasFASTCard]);

  // Track previous status to only clear fields when user actually changes
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

  // Clear dependent fields when status changes (but not on initial load)
  useEffect(() => {
    // Skip clearing on initial load
    if (previousStatus === null) {
      setPreviousStatus(statusInCanada);
      return;
    }

    // Only clear if status actually changed
    if (previousStatus !== statusInCanada) {
      if (statusInCanada === EStatusInCanada.WorkPermit) {
        // Clear FAST card fields when Work Permit is selected
        setValue("hasFASTCard", "");
        setValue("eligibleForFASTCard", "");
      } else if (statusInCanada === EStatusInCanada.PR || statusInCanada === EStatusInCanada.Citizenship) {
        // Clear both FAST card fields when switching to PR/Citizen (user must make fresh choice)
        setValue("hasFASTCard", "");
        setValue("eligibleForFASTCard", "");
      }
      setPreviousStatus(statusInCanada);
    }
  }, [statusInCanada, setValue, previousStatus]);

  const allAnswered = useMemo(() => {
    return Object.keys(watchAllFields).every((key) => {
      // Only enforce answered state for fields currently shown on screen
      const isFieldRendered = [...finalFilteredQuestions, ...categoryQuestions].some((q) => q.name === key);
      // Answered if non-empty (booleans: "form.yes"/"form.no"; categories: enum value)
      return !isFieldRendered || watchAllFields[key] !== "";
    });
  }, [watchAllFields, finalFilteredQuestions]);

  // Submit handler (PATCH):
  // - Convert RHF string values to IPreQualifications
  // - Send PATCH to backend
  // - Navigate using onboardingContext.nextUrl from the server response
  const onSubmit = async (data: FormValues) => {
    // If nothing changed vs defaults → no-op continue (GET-only navigation)
    const isChanged = hasDeepChanges<FormValues>(data, (defaultValues ?? {}) as Partial<FormValues>, {
      nullAsUndefined: true,
      emptyStringAsUndefined: true,
    });
    if (!isChanged) {
      const next = trackerContext?.nextStep;
      if (next) {
        router.push(buildOnboardingStepPath(trackerContext!, next));
        router.refresh();
        return;
      }
      // Fallback: go to Page 1
      router.push(`/onboarding/${trackerId}/application-form/page-1`);
      router.refresh();
      return;
    }

    // Map RHF data to typed IPreQualifications object
    const transformed: IPreQualifications = {
      over23Local: data.over23Local === "form.yes",
      over25CrossBorder: data.over25CrossBorder === "form.yes",
      canDriveManual: data.canDriveManual === "form.yes",
      experienceDrivingTractorTrailer: data.experienceDrivingTractorTrailer === "form.yes",
      faultAccidentIn3Years: data.faultAccidentIn3Years === "form.yes",
      zeroPointsOnAbstract: data.zeroPointsOnAbstract === "form.yes",
      noUnpardonedCriminalRecord: data.noUnpardonedCriminalRecord === "form.yes",
      legalRightToWorkCanada: data.legalRightToWorkCanada === "form.yes",
      // Category fields are enum values, so we can assert:
      driverType: data.driverType as EDriverType,
      haulPreference: data.haulPreference as EHaulPreference,
      teamStatus: data.teamStatus as ETeamStatus,
      preferLocalDriving: data.preferLocalDriving === "form.yes",
      preferSwitching: data.preferSwitching === "form.yes",
      flatbedExperience: data.flatbedExperience === "form.yes",
      completed: true, // Indicates step completion
    };

    // Append Canada-only fields if they exist on this form (i.e., not US)
    if (effectiveCompany?.countryCode !== "US") {
      transformed.canCrossBorderUSA = data.canCrossBorderUSA === "form.yes";
      transformed.statusInCanada = data.statusInCanada as EStatusInCanada;

      // Only include FAST card fields if they were shown
      if (data.hasFASTCard !== undefined) {
        transformed.hasFASTCard = data.hasFASTCard === "form.yes";
      }
      if (data.eligibleForFASTCard !== undefined) {
        transformed.eligibleForFASTCard = data.eligibleForFASTCard === "form.yes";
      }
    }

    try {
      // Show loading immediately for API operations
      show(t("form.loading", "Processing..."));

      // Set retry callback for error handling
      const errorManager = ErrorManager.getInstance();
      errorManager.setRetryCallback(() => {
        onSubmit(data);
      });

      // PATCH to backend for this tracker using API client
      const response = await apiClient.patch(`/api/v1/onboarding/${trackerId}/prequalifications`, transformed);

      // Clear retry callback after response
      errorManager.clearRetryCallback();

      if (!response.success) {
        // Error handling is now managed by the API client and ErrorManager
        hide();
        return;
      }

      // Expect onboardingContext.nextUrl to be returned for navigation
      const onboardingContext: IOnboardingTrackerContext = (response.data as any)?.onboardingContext;
      const nextStep = onboardingContext?.nextStep;

      if (!onboardingContext || !nextStep) {
        console.error("nextStep missing from onboardingContext");
        hide();
        return;
      }

      // Navigate to the next step in the wizard
      router.push(buildOnboardingStepPath(onboardingContext, nextStep));
      // ensure the *destination* layout refetches with the new doc
      router.refresh();
    } catch (err) {
      // Log for debugging; error display is handled by ErrorManager
      console.error("Prequalification submit error:", err);
      hide(); // Hide loading screen on error
    } finally {
      // Success path navigates away; we leave loading to route transition UI
    }
  };

  // Only render after mount to avoid hydration mismatch issues with SSR
  if (!mounted) return null;

  // Utility: when disabled, prevent any changes and interactions locally
  const makeSafeOnChange = (originalOnChange: (value: string) => void, qName?: string) => (val: string) => {
    if (disabled) return; // block edits when disabled
    // Intercept flatbed popup trigger only when not disabled
    if (qName === "flatbedExperience") {
      if (val === "form.yes") setShowFlatbedPopup("yes");
      else if (val === "form.no") setShowFlatbedPopup("no");
      else setShowFlatbedPopup(null);
    }
    originalOnChange(val);
  };

  return (
    <>
      <div className="space-y-6" aria-disabled={disabled}>
        {/* Eligibility questions (mostly booleans) */}
        <div className={`space-y-4 ${disabled ? "opacity-60 pointer-events-none select-none" : ""}`}>
          {finalFilteredQuestions.map((q) => (
            <Controller
              key={q.name}
              control={control}
              name={q.name}
              render={({ field }) => (
                <QuestionGroup
                  // For US companies, substitute the label for the legal-work question
                  question={q.name === "legalRightToWorkCanada" && effectiveCompany?.countryCode === "US" ? t("form.step1.questions.legalRightToWorkUS") : t(q.label)}
                  options={q.options} // Centralized options (Yes/No or single-Yes)
                  value={field.value} // Controlled value
                  onChange={makeSafeOnChange(field.onChange, q.name)} // No-op when disabled
                  disabled={disabled}
                />
              )}
            />
          ))}
        </div>

        {/* Category questions (enums) */}
        <h2 className="text-xl text-center font-bold text-gray-800">{t("form.step1.questions.categories")}</h2>

        <div className={`space-y-4 ${disabled ? "opacity-60 pointer-events-none select-none" : ""}`}>
          {categoryQuestions.map((q) => (
            <Controller
              key={q.name}
              control={control}
              name={q.name}
              render={({ field }) => (
                <QuestionGroup
                  question={t(q.label)} // i18n label
                  options={q.options} // enum-backed options (value is enum)
                  value={field.value} // enum value as string
                  onChange={makeSafeOnChange(field.onChange, q.name)} // No-op when disabled
                  disabled={disabled}
                />
              )}
            />
          ))}
        </div>

        {/* Next button – enabled only when all visible questions are answered
            NOTE: `disabled` prop should NOT block the Next button. */}
        <div className="flex justify-center">
          <button
            // keep original enablement logic; do not tie to `disabled`
            disabled={!allAnswered}
            onClick={handleSubmit(onSubmit)}
            className={`px-8 py-2 mt-4 rounded-full font-semibold transition-all shadow-md flex items-center gap-2 cursor-pointer active:translate-y-[1px] active:shadow ${
              allAnswered
                ? "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-300"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {t("form.step1.next")}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Flatbed informational popup – content driven by i18n (suppressed when disabled) */}
      {!disabled && showFlatbedPopup && <FlatbedPopup type={showFlatbedPopup} onClose={() => setShowFlatbedPopup(null)} />}
    </>
  );
}
