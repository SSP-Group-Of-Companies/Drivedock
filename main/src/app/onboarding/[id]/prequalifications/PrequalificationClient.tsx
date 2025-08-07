/**
 * PreQualificationClient.tsx
 *
 * - Client-side rendering of the Pre-Qualification form
 * - Integrates RHF + Zustand tracker hydration
 * - Handles Flatbed popup and conditional questions
 * - Submits PATCH request to backend
 *
 * Owner: SSP Tech Team – Faruq Adebayo Atanda
 */

"use client";

import { useForm, Controller } from "react-hook-form";
import { useEffect, useState, useMemo } from "react";
import QuestionGroup from "@/app/onboarding/components/QuestionGroup";
import FlatbedPopup from "@/app/onboarding/components/FlatbedPopup";
import {
  preQualificationQuestions,
  categoryQuestions,
} from "@/constants/form-questions/preQualification";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { useCompanySelection } from "@/hooks/useCompanySelection";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import {
  EDriverType,
  EHaulPreference,
  ETeamStatus,
  IPreQualifications,
} from "@/types/preQualifications.types";
import { ITrackerContext } from "@/types/onboardingTracker.type";

type Props = {
  defaultValues: Record<string, string>;
  trackerId: string;
  trackerContext?: ITrackerContext;
};

export default function PreQualificationClient({
  defaultValues,
  trackerId,
  trackerContext,
}: Props) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { selectedCompany } = useCompanySelection();
  const { setTracker } = useOnboardingTracker();

  const [showFlatbedPopup, setShowFlatbedPopup] = useState<null | "yes" | "no">(
    null
  );

  // Hydrate Zustand tracker
  useEffect(() => {
    if (trackerContext?.id) setTracker(trackerContext);
  }, [trackerContext, setTracker]);

  const filteredPreQualificationQuestions = useMemo(() => {
    if (!selectedCompany) return preQualificationQuestions;
    if (selectedCompany.countryCode === "US") {
      return preQualificationQuestions.filter(
        (q) => q.name !== "canCrossBorderUSA" && q.name !== "hasFASTCard"
      );
    }
    return preQualificationQuestions;
  }, [selectedCompany]);

  const { control, handleSubmit, watch } = useForm({
    mode: "onChange",
    defaultValues,
  });

  const watchAllFields = watch();
  const allAnswered = Object.keys(watchAllFields).every((key) => {
    const value = watchAllFields[key];
    const isFieldRendered = [
      ...filteredPreQualificationQuestions,
      ...categoryQuestions,
    ].some((q) => q.name === key);
    return !isFieldRendered || value !== "";
  });

  const onSubmit = async (data: Record<string, string>) => {
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
      driverType: (() => {
        const val = data.driverType?.replace("form.", "");
        if (val === "ownerdriver") return EDriverType.OwnerDriver;
        if (val === "owneroperator") return EDriverType.OwnerOperator;
        return EDriverType.Company;
      })(),
      haulPreference:
        data.haulPreference?.replace("form.", "") === "shorthaul"
          ? EHaulPreference.ShortHaul
          : EHaulPreference.LongHaul,
      teamStatus:
        data.teamStatus?.replace("form.", "") === "single"
          ? ETeamStatus.Single
          : ETeamStatus.Team,
      preferLocalDriving: data.preferLocalDriving === "form.yes",
      preferSwitching: data.preferSwitching === "form.yes",
      flatbedExperience: data.flatbedExperience === "form.yes",
      completed: true,
    };

    if (selectedCompany?.countryCode !== "US") {
      transformed.canCrossBorderUSA = data.canCrossBorderUSA === "form.yes";
      transformed.hasFASTCard = data.hasFASTCard === "form.yes";
    }

    try {
      const res = await fetch(
        `/api/v1/onboarding/${trackerId}/prequalifications`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transformed),
        }
      );

      if (!res.ok) throw new Error("Failed to update prequalifications");

      const result = await res.json();
      const nextUrl = result?.data?.onboardingContext?.nextUrl;

      if (!nextUrl) throw new Error("nextUrl missing from onboardingContext");

      router.push(nextUrl);
    } catch (err) {
      console.error("Prequalification submit error:", err);
      alert("Failed to save your answers. Please try again.");
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-4">
          {filteredPreQualificationQuestions.map((q) => (
            <Controller
              key={q.name}
              control={control}
              name={q.name}
              render={({ field }) => {
                const handleChange = (val: string) => {
                  field.onChange(val);
                  if (q.name === "flatbedExperience") {
                    if (val === "form.yes") setShowFlatbedPopup("yes");
                    else if (val === "form.no") setShowFlatbedPopup("no");
                  }
                };

                return (
                  <QuestionGroup
                    question={
                      q.name === "legalRightToWorkCanada"
                        ? selectedCompany?.countryCode === "US"
                          ? t("form.legalRightToWorkUS")
                          : t(q.label)
                        : t(q.label)
                    }
                    options={q.options}
                    value={field.value}
                    onChange={handleChange}
                  />
                );
              }}
            />
          ))}
        </div>

        <h2 className="text-xl text-center font-bold text-gray-800">
          {t("form.categories")}
        </h2>

        <div className="space-y-4">
          {categoryQuestions.map((q) => (
            <Controller
              key={q.name}
              control={control}
              name={q.name}
              render={({ field }) => (
                <QuestionGroup
                  question={t(q.label)}
                  options={
                    q.options.every((opt) => ["Yes", "No"].includes(opt))
                      ? ["form.yes", "form.no"]
                      : q.options.map(
                          (opt) => `form.${opt.replace(" ", "").toLowerCase()}`
                        )
                  }
                  {...field}
                />
              )}
            />
          ))}
        </div>

        <div className="flex justify-center">
          <button
            disabled={!allAnswered}
            onClick={() => handleSubmit(onSubmit)()}
            className={`px-8 py-2 mt-4 rounded-full font-semibold transition-colors shadow-md flex items-center gap-2 ${
              allAnswered
                ? "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-300"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {t("form.next")}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {showFlatbedPopup && (
        <FlatbedPopup
          type={showFlatbedPopup}
          onClose={() => setShowFlatbedPopup(null)}
        />
      )}
    </>
  );
}
