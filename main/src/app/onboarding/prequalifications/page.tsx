"use client";

import { useForm, Controller, useWatch } from "react-hook-form";
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
import { usePrequalificationStore } from "@/store/usePrequalificationStore";
import { useCompanySelection } from "@/hooks/useCompanySelection";
import {
  EDriverType,
  EHaulPreference,
  ETeamStatus,
  IPreQualifications,
} from "@/types/preQualifications.types";

export default function PreQualificationPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { data: prequalData, setData } = usePrequalificationStore();
  const { selectedCompany } = useCompanySelection();
  const [showFlatbedPopup, setShowFlatbedPopup] = useState<null | "yes" | "no">(
    null
  );

  const filteredPreQualificationQuestions = useMemo(() => {
    if (!selectedCompany) return preQualificationQuestions;
    if (selectedCompany.countryCode === "US") {
      return preQualificationQuestions.filter(
        (q) => q.name !== "canCrossBorderUSA" && q.name !== "hasFASTCard"
      );
    }
    return preQualificationQuestions;
  }, [selectedCompany]);

  const defaultValues = useMemo(() => {
    if (!prequalData) {
      return Object.fromEntries(
        [...filteredPreQualificationQuestions, ...categoryQuestions].map(
          (q) => [q.name, ""]
        )
      );
    }
    return transformToFormValues(prequalData);
  }, [prequalData, filteredPreQualificationQuestions]);

  const { control, handleSubmit, watch, reset } = useForm({
    mode: "onChange",
    defaultValues,
  });

  // 🚀 Hydrate from Zustand
  useEffect(() => {
    if (prequalData) {
      reset(transformToFormValues(prequalData));
    }
  }, [prequalData, reset]);

  const flatbedExperience = useWatch({ control, name: "flatbedExperience" });

  useEffect(() => {
    if (flatbedExperience === "form.yes") setShowFlatbedPopup("yes");
    else if (flatbedExperience === "form.no") setShowFlatbedPopup("no");
  }, [flatbedExperience]);

  const watchAllFields = watch();
  const allAnswered = Object.keys(watchAllFields).every((key) => {
    const value = watchAllFields[key];
    const isFieldRendered = [
      ...filteredPreQualificationQuestions,
      ...categoryQuestions,
    ].some((q) => q.name === key);
    return !isFieldRendered || value !== "";
  });

  const onSubmit = (data: Record<string, string>) => {
    const prequalData: IPreQualifications = {
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
      prequalData.canCrossBorderUSA = data.canCrossBorderUSA === "form.yes";
      prequalData.hasFASTCard = data.hasFASTCard === "form.yes";
    }

    setData(prequalData);
    router.push("/onboarding/application-form");
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
              render={({ field }) => (
                <QuestionGroup
                  question={
                    q.name === "legalRightToWorkCanada"
                      ? selectedCompany?.countryCode === "US"
                        ? t("form.legalRightToWorkUS")
                        : t(q.label)
                      : t(q.label)
                  }
                  options={q.options.map((opt) => t(opt))}
                  {...field}
                />
              )}
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
                  options={q.options.map((opt) =>
                    ["Yes", "No"].includes(opt)
                      ? `form.${opt.toLowerCase()}`
                      : `form.${opt.replace(" ", "").toLowerCase()}`
                  )}
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

function transformToFormValues(
  data: IPreQualifications
): Record<string, string> {
  const prefix = (val: string) =>
    val.startsWith("form.") ? val : `form.${val.toLowerCase()}`;

  return {
    over23Local: data.over23Local ? "form.yes" : "form.no",
    over25CrossBorder: data.over25CrossBorder ? "form.yes" : "form.no",
    canDriveManual: data.canDriveManual ? "form.yes" : "form.no",
    experienceDrivingTractorTrailer: data.experienceDrivingTractorTrailer
      ? "form.yes"
      : "form.no",
    faultAccidentIn3Years: data.faultAccidentIn3Years ? "form.yes" : "form.no",
    zeroPointsOnAbstract: data.zeroPointsOnAbstract ? "form.yes" : "form.no",
    noUnpardonedCriminalRecord: data.noUnpardonedCriminalRecord
      ? "form.yes"
      : "form.no",
    legalRightToWorkCanada: data.legalRightToWorkCanada
      ? "form.yes"
      : "form.no",
    canCrossBorderUSA: data.canCrossBorderUSA ? "form.yes" : "form.no",
    hasFASTCard: data.hasFASTCard ? "form.yes" : "form.no",
    driverType: prefix(data.driverType.replace(/\s/g, "")),
    haulPreference: prefix(data.haulPreference.replace(/\s/g, "")),
    teamStatus: prefix(data.teamStatus),
    preferLocalDriving: data.preferLocalDriving ? "form.yes" : "form.no",
    preferSwitching: data.preferSwitching ? "form.yes" : "form.no",
    flatbedExperience: data.flatbedExperience ? "form.yes" : "form.no",
  };
}
