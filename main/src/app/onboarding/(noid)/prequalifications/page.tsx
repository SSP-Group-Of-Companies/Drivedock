"use client";

/**
 * =============================================================================
 * DriveDock — PreQualificationPage (Step 1)
 * =============================================================================
 * File: main/src/app/onboarding/prequalifications/page.tsx
 * Owner: SSP Tech Team — Faruq Adebayo Atanda
 *
 * Purpose
 * - Render the Pre-Qualification step of the onboarding wizard.
 * - Collect strictly-typed answers that determine eligibility/preferences.
 * - Persist answers locally (Zustand) until Step 2 posts them with Page 1.
 *
 * Key Behaviors
 * - Single source of truth for field names/types via IPreQualifications.
 * - i18n labels under "form.step1.questions.*" (no hardcoded strings).
 * - US/CA conditional questions (e.g., FAST card, cross-border).
 * - Category answers are actual ENUM values; booleans use "form.yes"/"form.no".
 * - Shows an informative popup when the user answers the flatbed question.
 * - No API call here; navigation proceeds to Step 2 (Page 1) on success.
 *
 * Data Flow
 * - RHF manages UI state; values are normalized before persisting to Zustand.
 * - On submit: transform RHF values → IPreQualifications → store → route.
 * - On reload: Zustand content is transformed back for RHF hydration.
 *
 * Why this structure
 * - Keeps frontend/backed strictly aligned (types/enums).
 * - Avoids premature backend writes; minimizes partial submissions.
 * - Simplifies resume flow (Step 2 POST clears this store after success).
 *
 * Accessibility & UX
 * - Radio-like button groups for clear choices (QuestionGroup).
 * - Next button only enabled when all visible fields are answered.
 * - Popup messaging for flatbed experience expectations.
 * =============================================================================
 */

import { useForm, Controller, useWatch } from "react-hook-form";
import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProtectedRouter } from "@/hooks/onboarding/useProtectedRouter";
import { ArrowRight } from "lucide-react";

// components, hooks, and types
import { EDriverType, EHaulPreference, ETeamStatus, EStatusInCanada, IPreQualifications } from "@/types/preQualifications.types";
import QuestionGroup from "@/app/onboarding/components/QuestionGroup";
import FlatbedPopup from "@/app/onboarding/components/FlatbedPopup";
import { usePrequalificationStore } from "@/store/usePrequalificationStore";
import { useCompanySelection } from "@/hooks/frontendHooks/useCompanySelection";
import { preQualificationQuestions, categoryQuestions } from "@/constants/form-questions/preQualification";
import useMounted from "@/hooks/useMounted";

/**
 * RHF form state type:
 * - We keep RHF values as strings for simplicity.
 * - Boolean questions use "form.yes"/"form.no".
 * - Category questions use enum string values (e.g., "Company", "Short Haul").
 */
type FormValues = Record<string, string>;

export default function PreQualificationPage() {
  const mounted = useMounted(); // Prevent hydration mismatch by rendering only after mount
  const { t } = useTranslation("common"); // i18n translator (namespace: common)
  const router = useProtectedRouter(); // Protected router for navigation

  // Zustand store providing persisted prequalification data
  const { data: prequalData, setData } = usePrequalificationStore();

  // Currently selected company (determines US/CA question visibility)
  const { selectedCompany } = useCompanySelection();

  // Local UI state controlling the flatbed info popup (null → hidden)
  const [showFlatbedPopup, setShowFlatbedPopup] = useState<null | "yes" | "no">(null);

  /**
   * Derive the list of questions to show based on company country.
   * - If US: hide Canada-specific questions (FAST card, cross-border).
   * - Otherwise: show all pre-qualification questions.
   */
  const filteredPreQualificationQuestions = useMemo(() => {
    if (!selectedCompany) return preQualificationQuestions;
    if (selectedCompany.countryCode === "US") {
      return preQualificationQuestions.filter((q) => 
        q.name !== "canCrossBorderUSA" && 
        q.name !== "hasFASTCard" && 
        q.name !== "statusInCanada" &&
        q.name !== "eligibleForFASTCard"
      );
    }
    return preQualificationQuestions;
  }, [selectedCompany]);

  /**
   * Compute initial RHF values:
   * - When store is empty: initialize keys to "" so validation can detect blanks.
   * - When store has data: transform typed store values to RHF strings/enums.
   */
  const defaultValues: FormValues = useMemo(() => {
    if (!prequalData) {
      return Object.fromEntries([...filteredPreQualificationQuestions, ...categoryQuestions].map((q) => [q.name, ""]));
    }
    return transformToFormValues(prequalData);
  }, [prequalData, filteredPreQualificationQuestions]);

  /**
   * Initialize RHF.
   * - mode: "onChange" → live validation & Next button enablement.
   * - defaultValues: from memo above.
   */
  const { control, handleSubmit, watch, reset, setValue } = useForm<FormValues>({
    mode: "onChange",
    defaultValues,
  });

  /**
   * Keep the form in sync with persisted store data:
   * - If prequalData changes (e.g., reload), rehydrate RHF with transformed values.
   */
  useEffect(() => {
    if (prequalData) reset(transformToFormValues(prequalData));
  }, [prequalData, reset]);

  /**
   * Watch the flatbed answer to trigger contextual popup:
   * - "form.yes" → reassure test will cover skill.
   * - "form.no"  → inform about 2-week training after drive test.
   */
  const flatbedExperience = useWatch({ control, name: "flatbedExperience" });
  useEffect(() => {
    if (flatbedExperience === "form.yes") setShowFlatbedPopup("yes");
    else if (flatbedExperience === "form.no") setShowFlatbedPopup("no");
    else setShowFlatbedPopup(null);
  }, [flatbedExperience]);

  /**
   * Enable the Next button only if all currently rendered fields are answered:
   * - We check every watched key and ensure non-empty values.
   * - Fields not rendered (filtered out) are ignored.
   */
  const watchAllFields = watch();
  
  // Get the status in Canada value for conditional logic
  const statusInCanada = watchAllFields.statusInCanada;
  
  // Apply conditional filtering based on status in Canada
  const finalFilteredQuestions = useMemo(() => {
    if (!selectedCompany || selectedCompany.countryCode === "US") {
      return filteredPreQualificationQuestions;
    }
    
    // For Canadian companies, apply conditional logic
    let questions = [...filteredPreQualificationQuestions];
    
    // Only show FAST card question if user has selected PR or Citizenship
    if (statusInCanada !== EStatusInCanada.PR && statusInCanada !== EStatusInCanada.Citizenship) {
      questions = questions.filter(q => q.name !== "hasFASTCard");
    }
    
    // Only show eligible for FAST card question if user is PR/Citizen AND answered "no" to FAST card
    if (statusInCanada === EStatusInCanada.PR || statusInCanada === EStatusInCanada.Citizenship) {
      if (watchAllFields.hasFASTCard === "form.no") {
        // Keep eligibleForFASTCard question
      } else {
        // Remove eligibleForFASTCard question
        questions = questions.filter(q => q.name !== "eligibleForFASTCard");
      }
    } else {
      // Remove eligibleForFASTCard question if not PR/Citizen
      questions = questions.filter(q => q.name !== "eligibleForFASTCard");
    }
    
    return questions;
  }, [filteredPreQualificationQuestions, selectedCompany, statusInCanada, watchAllFields.hasFASTCard]);

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
  
  const allAnswered = Object.keys(watchAllFields).every((key) => {
    const isFieldRendered = [...finalFilteredQuestions, ...categoryQuestions].some((q) => q.name === key);
    return !isFieldRendered || watchAllFields[key] !== "";
  });

  /**
   * Submit handler:
   * - Convert RHF values → typed IPreQualifications.
   * - Persist to Zustand (local only).
   * - Navigate to Step 2 (Application Form Page 1).
   * - Canada-only fields are conditionally included.
   */
  const onSubmit = (data: FormValues) => {
    const typedPrequal: IPreQualifications = {
      // Booleans are normalized from "form.yes"/"form.no"
      over23Local: data.over23Local === "form.yes",
      over25CrossBorder: data.over25CrossBorder === "form.yes",
      canDriveManual: data.canDriveManual === "form.yes",
      experienceDrivingTractorTrailer: data.experienceDrivingTractorTrailer === "form.yes",
      faultAccidentIn3Years: data.faultAccidentIn3Years === "form.yes",
      zeroPointsOnAbstract: data.zeroPointsOnAbstract === "form.yes",
      noUnpardonedCriminalRecord: data.noUnpardonedCriminalRecord === "form.yes",
      legalRightToWorkCanada: data.legalRightToWorkCanada === "form.yes",

      // Categories are saved as ENUM values (already in RHF state)
      driverType: data.driverType as EDriverType,
      haulPreference: data.haulPreference as EHaulPreference,
      teamStatus: data.teamStatus as ETeamStatus,

      // More booleans
      preferLocalDriving: data.preferLocalDriving === "form.yes",
      preferSwitching: data.preferSwitching === "form.yes",
      flatbedExperience: data.flatbedExperience === "form.yes",

      // Completion acknowledgment for Step 1
      completed: true,
    };

    // Canada-specific fields (only attach for non-US companies)
    if (selectedCompany?.countryCode !== "US") {
      typedPrequal.canCrossBorderUSA = data.canCrossBorderUSA === "form.yes";
      typedPrequal.statusInCanada = data.statusInCanada as EStatusInCanada;
      
      // Only include FAST card fields if they were shown
      if (data.hasFASTCard !== undefined) {
        typedPrequal.hasFASTCard = data.hasFASTCard === "form.yes";
      }
      if (data.eligibleForFASTCard !== undefined) {
        typedPrequal.eligibleForFASTCard = data.eligibleForFASTCard === "form.yes";
      }
    }

    // Persist locally (will be posted together with Page 1)
    setData(typedPrequal);

    // Move to Step 2 (first page of the main application form)
    router.push("/onboarding/application-form");
  };

  // Avoid hydration mismatch by not rendering UI until mounted on client
  if (!mounted) return null;

  return (
    <>
      <div className="space-y-6">
        {/* Eligibility questions */}
        <div className="space-y-4">
          {finalFilteredQuestions.map((q) => (
            <Controller
              key={q.name}
              control={control}
              name={q.name}
              render={({ field }) => (
                <QuestionGroup
                  question={
                    // If user is in the US company context, swap the label to the US variant
                    q.name === "legalRightToWorkCanada" && selectedCompany?.countryCode === "US" ? t("form.step1.questions.legalRightToWorkUS") : t(q.label)
                  }
                  options={q.options} // Options come from constants (typed; i18n labelKeys)
                  value={field.value} // Current RHF value for this field
                  onChange={field.onChange} // Update RHF state
                />
              )}
            />
          ))}
        </div>

        {/* Categories */}
        <h2 className="text-xl text-center font-bold text-gray-800">{t("form.step1.questions.categories")}</h2>

        <div className="space-y-4">
          {categoryQuestions.map((q) => (
            <Controller
              key={q.name}
              control={control}
              name={q.name}
              render={({ field }) => (
                <QuestionGroup
                  question={t(q.label)} // Category label (i18n)
                  options={q.options} // Category options (enum values)
                  value={field.value} // Current enum string in RHF state
                  onChange={field.onChange}
                />
              )}
            />
          ))}
        </div>

        {/* Next */}
        <div className="flex justify-center">
          <button
            disabled={!allAnswered} // Guard until all visible fields have answers
            onClick={handleSubmit(onSubmit)} // RHF submit pipeline
            className={`px-8 py-2 mt-4 rounded-full font-semibold transition-colors shadow-md flex items-center gap-2 ${
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

      {/* Flatbed popup */}
      {showFlatbedPopup && (
        <FlatbedPopup
          type={showFlatbedPopup} // "yes" or "no" determines content
          onClose={() => setShowFlatbedPopup(null)} // Dismiss handler
        />
      )}
    </>
  );
}

/**
 * Transform typed store data → RHF-friendly values.
 * - Booleans become "form.yes"/"form.no" for button groups.
 * - Categories remain enum values (e.g., "Company", "Short Haul").
 * This keeps RHF rendering simple while preserving strict typing in the store.
 */
function transformToFormValues(data: IPreQualifications): FormValues {
  return {
    over23Local: data.over23Local ? "form.yes" : "form.no",
    over25CrossBorder: data.over25CrossBorder ? "form.yes" : "form.no",
    canDriveManual: data.canDriveManual ? "form.yes" : "form.no",
    experienceDrivingTractorTrailer: data.experienceDrivingTractorTrailer ? "form.yes" : "form.no",
    faultAccidentIn3Years: data.faultAccidentIn3Years ? "form.yes" : "form.no",
    zeroPointsOnAbstract: data.zeroPointsOnAbstract ? "form.yes" : "form.no",
    noUnpardonedCriminalRecord: data.noUnpardonedCriminalRecord ? "form.yes" : "form.no",
    legalRightToWorkCanada: data.legalRightToWorkCanada ? "form.yes" : "form.no",
    canCrossBorderUSA: data.canCrossBorderUSA ? "form.yes" : "form.no",
    hasFASTCard: data.hasFASTCard !== undefined ? (data.hasFASTCard ? "form.yes" : "form.no") : "",
    statusInCanada: data.statusInCanada || "",
    eligibleForFASTCard: data.eligibleForFASTCard !== undefined ? (data.eligibleForFASTCard ? "form.yes" : "form.no") : "",

    // Category enums are preserved as their enum string values
    driverType: data.driverType,
    haulPreference: data.haulPreference,
    teamStatus: data.teamStatus,

    // More booleans
    preferLocalDriving: data.preferLocalDriving ? "form.yes" : "form.no",
    preferSwitching: data.preferSwitching ? "form.yes" : "form.no",
    flatbedExperience: data.flatbedExperience ? "form.yes" : "form.no",
  };
}
