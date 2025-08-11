"use client";

/**
 * ========================================================================
 * DriveDock – PreQualificationClient (Resume/Edit Path)
 * ------------------------------------------------------------------------
 * WHAT THIS IS
 *   Client-side UI for Step 1 (Pre-Qualification) when a driver returns to
 *   the flow using a tracker ID: /onboarding/[id]/prequalifications.
 *   This page lets the driver review/update their prequalification answers.
 *
 * HOW IT WORKS
 *   - Receives `defaultValues` (already transformed for RHF) and `trackerId`
 *     from the server route. Optionally receives latest `trackerContext`.
 *   - Hydrates the Onboarding tracker in Zustand so other pages know where
 *     the user is in the wizard.
 *   - Renders questions defined in central constants:
 *       preQualificationQuestions (booleans, sometimes single-Yes)
 *       categoryQuestions (enums: driverType, haulPreference, teamStatus)
 *   - Hides Canada-only questions for US companies.
 *   - When the "Next" button is clicked, it:
 *       1) Validates that every visible question has a value.
 *       2) Transforms string values into IPreQualifications (booleans + enums).
 *       3) PATCHes to /api/v1/onboarding/[trackerId]/prequalifications.
 *       4) Navigates using server-provided nextUrl from onboarding context.
 *
 * KEY POINTS
 *   - Values for boolean questions are the i18n keys "form.yes"/"form.no".
 *   - Values for category questions are enum values (EDriverType, etc.),
 *     not i18n keys. (The labels are translated; the values are typed.)
 *   - Flatbed popup appears when the user selects "yes" or "no" on
 *     `flatbedExperience`, per business rules.
 *   - Uses `useMounted()` to avoid hydration mismatches in Next.js.
 *
 * OWNER
 *   SSP Tech Team – Faruq Adebayo Atanda
 * ========================================================================
 */

import { useForm, Controller } from "react-hook-form";
import { useEffect, useState, useMemo } from "react";

import {
  preQualificationQuestions,
  categoryQuestions,
} from "@/constants/form-questions/preQualification";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

//components, hooks, and types
import useMounted from "@/hooks/useMounted";
import QuestionGroup from "@/app/onboarding/components/QuestionGroup";
import FlatbedPopup from "@/app/onboarding/components/FlatbedPopup";
import { useCompanySelection } from "@/hooks/frontendHooks/useCompanySelection";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import {
  EDriverType,
  EHaulPreference,
  ETeamStatus,
  IPreQualifications,
} from "@/types/preQualifications.types";
import { ITrackerContext } from "@/types/onboardingTracker.type";

/**
 * RHF form shape used on this page.
 * - Keys correspond to question `name`s.
 * - Values are strings:
 *    • For booleans: "form.yes" | "form.no"
 *    • For categories: enum values (e.g., EDriverType.Company)
 */
type FormValues = Record<string, string>;

/**
 * Props expected from the server parent page ([id]/prequalifications/page.tsx)
 * - defaultValues: RHF-ready values (already transformed)
 * - trackerId: Onboarding tracker ID from the URL
 * - trackerContext: (optional) Latest context to hydrate Zustand
 */
type Props = {
  defaultValues: FormValues;
  trackerId: string;
  trackerContext?: ITrackerContext;
};

export default function PreQualificationClient({
  defaultValues,
  trackerId,
  trackerContext,
}: Props) {
  const mounted = useMounted(); // Prevent SSR/CSR mismatch
  const { t } = useTranslation("common");
  const router = useRouter();
  const { selectedCompany } = useCompanySelection(); // Determines US/CA behavior
  const { setTracker } = useOnboardingTracker(); // Hydrate tracker into Zustand

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
    if (!selectedCompany) return preQualificationQuestions;
    if (selectedCompany.countryCode === "US") {
      // Hide "canCrossBorderUSA" and "hasFASTCard" for US company
      return preQualificationQuestions.filter(
        (q) => q.name !== "canCrossBorderUSA" && q.name !== "hasFASTCard"
      );
    }
    return preQualificationQuestions;
  }, [selectedCompany]);

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
    if (selectedCompany?.countryCode !== "US") {
      transformed.canCrossBorderUSA = data.canCrossBorderUSA === "form.yes";
      transformed.hasFASTCard = data.hasFASTCard === "form.yes";
    }

    try {
      // PATCH to backend for this tracker
      const res = await fetch(
        `/api/v1/onboarding/${trackerId}/prequalifications`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transformed),
        }
      );

      if (!res.ok) throw new Error("Failed to update prequalifications");

      // Expect onboardingContext.nextUrl to be returned for navigation
      const result = await res.json();
      const nextUrl: string | undefined =
        result?.data?.onboardingContext?.nextUrl;
      if (!nextUrl) throw new Error("nextUrl missing from onboardingContext");

      // Navigate to the next step in the wizard
      router.push(nextUrl);
    } catch (err) {
      // Log for debugging; show a basic alert for the MVP
      console.error("Prequalification submit error:", err);
      alert(
        t("form.errors.saveFailed") ||
          "Failed to save your answers. Please try again."
      );
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
                      selectedCompany?.countryCode === "US"
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
