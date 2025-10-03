"use client";

/**
 * ========================================================================
 * DriveDock – PreQualificationClient (Resume/Edit Path)
 * ------------------------------------------------------------------------
 * - Prefers company from trackerContext (getSelectedCompany(companyId))
 *   and falls back to useCompanySelection() when missing.
 * ========================================================================
 */

import { useForm, Controller } from "react-hook-form";
import { useEffect, useState, useMemo, useId } from "react";

import {
  preQualificationQuestions,
  categoryQuestions,
} from "@/constants/form-questions/preQualification";
import { useTranslation } from "react-i18next";
import { useProtectedRouter } from "@/hooks/onboarding/useProtectedRouter";
import { ArrowRight } from "lucide-react";

// components, hooks, and types
import useMounted from "@/hooks/useMounted";
import QuestionGroup from "@/app/onboarding/components/QuestionGroup";
import FlatbedPopup from "@/app/onboarding/components/FlatbedPopup";
import { useCountrySelection } from "@/hooks/useCountrySelection";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import { useGlobalLoading } from "@/store/useGlobalLoading";
import { apiClient } from "@/lib/onboarding/apiClient";
import { ErrorManager } from "@/lib/onboarding/errorManager";
import {
  EDriverType,
  EHaulPreference,
  ETeamStatus,
  EStatusInCanada,
  IPreQualifications,
} from "@/types/preQualifications.types";
import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { buildOnboardingStepPath } from "@/lib/utils/onboardingUtils";
import { getCompanyById } from "@/constants/companies";
import { ECountryCode } from "@/types/shared.types";
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
};

export default function PreQualificationClient({
  defaultValues,
  trackerId,
  trackerContext,
}: Props) {
  const mounted = useMounted(); // Prevent SSR/CSR mismatch
  const { t } = useTranslation("common");
  const router = useProtectedRouter();

  // Pull selected country for pre-approval cases
  const { selectedCountryCode } = useCountrySelection();
  const effectiveCountry: ECountryCode | null = useMemo(() => {
    if (trackerContext?.companyId) {
      const comp = getCompanyById(trackerContext.companyId);
      return (comp?.countryCode as ECountryCode) || null;
    }
    return (selectedCountryCode as ECountryCode) || null;
  }, [trackerContext?.companyId, selectedCountryCode]);

  const { setTracker } = useOnboardingTracker(); // Hydrate tracker into Zustand
  const { show, hide } = useGlobalLoading();

  // Determine lock state after admin approval (prevent edits but allow navigation)
  const locked = !!trackerContext?.invitationApproved;
  const lockedDescId = useId();
  const lockedMessage = t("form.lockedAfterApproval.prequal", "This page is locked after approval.");

  // Controls visibility/content of the flatbed training popup
  const [showFlatbedPopup, setShowFlatbedPopup] = useState<null | "yes" | "no">(
    null
  );

  // On first render or when trackerContext changes, sync it into Zustand
  useEffect(() => {
    if (trackerContext?.id) setTracker(trackerContext);
  }, [trackerContext, setTracker]);

  // Conditionally exclude Canada-only questions for US companies
  const filteredPreQualificationQuestions = useMemo(() => {
    if (!effectiveCountry) return preQualificationQuestions;
    if (effectiveCountry === ECountryCode.US) {
      // Hide Canada-only questions for US company
      return preQualificationQuestions.filter(
        (q) =>
          q.name !== "canCrossBorderUSA" &&
          q.name !== "hasFASTCard" &&
          q.name !== "statusInCanada" &&
          q.name !== "eligibleForFASTCard"
      );
    }
    return preQualificationQuestions;
  }, [effectiveCountry]);

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
    if (!effectiveCountry || effectiveCountry === ECountryCode.US) {
      return filteredPreQualificationQuestions;
    }

    // For Canadian companies, apply conditional logic
    let questions = [...filteredPreQualificationQuestions];

    // Only show FAST card question if user has selected PR or Citizenship
    if (
      statusInCanada !== EStatusInCanada.PR &&
      statusInCanada !== EStatusInCanada.Citizenship
    ) {
      questions = questions.filter((q) => q.name !== "hasFASTCard");
    }

    // Only show eligible for FAST card question if user is PR/Citizen AND answered "no" to FAST card
    if (
      statusInCanada === EStatusInCanada.PR ||
      statusInCanada === EStatusInCanada.Citizenship
    ) {
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
  }, [
    filteredPreQualificationQuestions,
    effectiveCountry,
    statusInCanada,
    watchAllFields.hasFASTCard,
  ]);

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
      } else if (
        statusInCanada === EStatusInCanada.PR ||
        statusInCanada === EStatusInCanada.Citizenship
      ) {
        // Clear both FAST card fields when switching to PR/Citizen (user must make fresh choice)
        setValue("hasFASTCard", "");
        setValue("eligibleForFASTCard", "");
      }
      setPreviousStatus(statusInCanada);
    }
  }, [statusInCanada, setValue, previousStatus]);

  const allAnswered = Object.keys(watchAllFields).every((key) => {
    // Only enforce answered state for fields currently shown on screen
    const isFieldRendered = [
      ...finalFilteredQuestions,
      ...categoryQuestions,
    ].some((q) => q.name === key);
    // Answered if non-empty (booleans: "form.yes"/"form.no"; categories: enum value)
    return !isFieldRendered || watchAllFields[key] !== "";
  });

  // Submit handler (PATCH):
  // - Convert RHF string values to IPreQualifications
  // - Send PATCH to backend
  // - Navigate using onboardingContext.nextUrl from the server response
  const onSubmit = async (data: FormValues) => {
    // If nothing changed vs defaults → no-op continue (GET-only navigation)
    const isChanged = hasDeepChanges<FormValues>(
      data,
      (defaultValues ?? {}) as Partial<FormValues>,
      { nullAsUndefined: true, emptyStringAsUndefined: true }
    );
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
      experienceDrivingTractorTrailer:
        data.experienceDrivingTractorTrailer === "form.yes",
      faultAccidentIn3Years: data.faultAccidentIn3Years === "form.yes",
      zeroPointsOnAbstract: data.zeroPointsOnAbstract === "form.yes",
      noUnpardonedCriminalRecord:
        data.noUnpardonedCriminalRecord === "form.yes",
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
    if (effectiveCountry !== ECountryCode.US) {
      transformed.canCrossBorderUSA = data.canCrossBorderUSA === "form.yes";
      transformed.statusInCanada = data.statusInCanada as EStatusInCanada;

      // Only include FAST card fields if they were shown
      if (data.hasFASTCard !== undefined) {
        transformed.hasFASTCard = data.hasFASTCard === "form.yes";
      }
      if (data.eligibleForFASTCard !== undefined) {
        transformed.eligibleForFASTCard =
          data.eligibleForFASTCard === "form.yes";
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
      const response = await apiClient.patch(
        `/api/v1/onboarding/${trackerId}/prequalifications`,
        transformed
      );

      // Clear retry callback after response
      errorManager.clearRetryCallback();

      if (!response.success) {
        // Error handling is now managed by the API client and ErrorManager
        hide();
        return;
      }

      // Expect onboardingContext.nextUrl to be returned for navigation
      const onboardingContext: IOnboardingTrackerContext = (
        response.data as any
      )?.onboardingContext;
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

  return (
    <>
      <div className="space-y-6">
        {locked && (
          <p id={lockedDescId} className="text-sm font-semibold text-red-600 text-center bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {lockedMessage}
          </p>
        )}
        {/* Eligibility questions (mostly booleans) */}
        <div
          className="space-y-4"
          aria-describedby={locked ? lockedDescId : undefined}
          title={locked ? lockedMessage : undefined}
        >
          {finalFilteredQuestions.map((q) => (
            <Controller
              key={q.name}
              control={control}
              name={q.name}
              render={({ field }) => {
                // Intercept changes to trigger the flatbed popup
                const handleChange = (val: string) => {
                  field.onChange(val);
                  if (q.name === "flatbedExperience") {
                    if (val === "form.yes") setShowFlatbedPopup("yes");
                    else if (val === "form.no") setShowFlatbedPopup("no");
                    else setShowFlatbedPopup(null);
                  }
                };

                return (
                  <QuestionGroup
                    // For US companies, substitute the label for the legal-work question
                    question={
                      q.name === "legalRightToWorkCanada" && effectiveCountry === ECountryCode.US
                        ? t("form.step1.questions.legalRightToWorkUS")
                        : t(q.label)
                    }
                    options={q.options} // Centralized options (Yes/No or single-Yes)
                    value={field.value} // Controlled value
                    onChange={handleChange} // Controlled onChange
                    disabled={locked}
                  />
                );
              }}
            />
          ))}
        </div>

        {/* Category questions (enums) */}
        <h2 className="text-xl text-center font-bold text-gray-800">
          {t("form.step1.questions.categories")}
        </h2>

        <div
          className="space-y-4"
          aria-describedby={locked ? lockedDescId : undefined}
          title={locked ? lockedMessage : undefined}
        >
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
                  onChange={field.onChange}
                  disabled={locked}
                />
              )}
            />
          ))}
        </div>

        {/* Next button – enabled only when all visible questions are answered */}
        <div className="flex justify-center">
          <button
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

      {/* Flatbed informational popup – content driven by i18n */}
      {showFlatbedPopup && (
        <FlatbedPopup
          type={showFlatbedPopup}
          onClose={() => setShowFlatbedPopup(null)}
        />
      )}
    </>
  );
}
