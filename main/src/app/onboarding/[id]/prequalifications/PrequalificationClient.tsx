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
import { useEffect, useState, useMemo } from "react";

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
import { useCompanySelection } from "@/hooks/frontendHooks/useCompanySelection";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import { useGlobalLoading } from "@/store/useGlobalLoading";
import { apiClient } from "@/lib/onboarding/apiClient";
import { ErrorManager } from "@/lib/onboarding/errorManager";
import {
  EDriverType,
  EHaulPreference,
  ETeamStatus,
  IPreQualifications,
} from "@/types/preQualifications.types";
import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { buildOnboardingStepPath } from "@/lib/utils/onboardingUtils";
import { getCompanyById } from "@/constants/companies";

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

  // 1) Pull currently selected company from UI (fallback)
  const { selectedCompany } = useCompanySelection();

  // 2) Prefer company from trackerContext if available; else fallback to UI selection
  //    This ensures the "resume" path uses the persisted company choice.
  const effectiveCompany = useMemo(() => {
    if (trackerContext?.companyId) {
      return (
        getCompanyById(trackerContext.companyId) ?? selectedCompany ?? null
      );
    }
    return selectedCompany ?? null;
  }, [trackerContext?.companyId, selectedCompany]);

  const { setTracker } = useOnboardingTracker(); // Hydrate tracker into Zustand
  const { show, hide } = useGlobalLoading();

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
    if (!effectiveCompany) return preQualificationQuestions;
    if (effectiveCompany.countryCode === "US") {
      // Hide "canCrossBorderUSA" and "hasFASTCard" for US company
      return preQualificationQuestions.filter(
        (q) => q.name !== "canCrossBorderUSA" && q.name !== "hasFASTCard"
      );
    }
    return preQualificationQuestions;
  }, [effectiveCompany]);

  // Initialize RHF with defaults; validate on change for button enablement
  const { control, handleSubmit, watch } = useForm<FormValues>({
    mode: "onChange",
    defaultValues,
  });

  // Watch all fields to determine whether the Next button should be enabled
  const watchAllFields = watch();
  const allAnswered = Object.keys(watchAllFields).every((key) => {
    // Only enforce answered state for fields currently shown on screen
    const isFieldRendered = [
      ...filteredPreQualificationQuestions,
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
    if (effectiveCompany?.countryCode !== "US") {
      transformed.canCrossBorderUSA = data.canCrossBorderUSA === "form.yes";
      transformed.hasFASTCard = data.hasFASTCard === "form.yes";
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
        {/* Eligibility questions (mostly booleans) */}
        <div className="space-y-4">
          {filteredPreQualificationQuestions.map((q) => (
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
                      q.name === "legalRightToWorkCanada" &&
                      effectiveCompany?.countryCode === "US"
                        ? t("form.step1.questions.legalRightToWorkUS")
                        : t(q.label)
                    }
                    options={q.options} // Centralized options (Yes/No or single-Yes)
                    value={field.value} // Controlled value
                    onChange={handleChange} // Controlled onChange
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

        <div className="space-y-4">
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
