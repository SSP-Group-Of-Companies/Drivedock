"use client";

import { useForm, Controller, useWatch } from "react-hook-form";
import { useEffect, useState } from "react";
import QuestionGroup from "@/components/form/QuestionGroup";
import FlatbedPopup from "@/components/form/FlatbedPopup";
import {
  preQualificationQuestions,
  categoryQuestions,
} from "@/constants/form-questions/preQualification";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { usePrequalificationStore } from "@/store/usePrequalificationStore";
import {
  EDriverType,
  EHaulPreference,
  ETeamStatus,
} from "@/types/preQualifications.types";

export default function PreQualificationPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { setData } = usePrequalificationStore();
  const [showFlatbedPopup, setShowFlatbedPopup] = useState<null | "yes" | "no">(
    null
  );

  const { control, handleSubmit, watch } = useForm({
    mode: "onChange",
    defaultValues: Object.fromEntries(
      [...preQualificationQuestions, ...categoryQuestions].map((q) => [
        q.name,
        "",
      ])
    ),
  });

  const flatbedExperience = useWatch({ control, name: "flatbedExperience" });

  useEffect(() => {
    if (flatbedExperience === "form.yes") setShowFlatbedPopup("yes");
    else if (flatbedExperience === "form.no") setShowFlatbedPopup("no");
  }, [flatbedExperience]);

  const watchAllFields = watch();
  const allAnswered = Object.values(watchAllFields).every((val) => val !== "");

  const onSubmit = (data: Record<string, string>) => {
    setData({
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
      canCrossBorderUSA: data.canCrossBorderUSA === "form.yes",
      hasFASTCard: data.hasFASTCard === "form.yes",
      driverType:
        data.driverType.replace("form.", "") === "ownerDriver"
          ? EDriverType.OwnerDriver
          : data.driverType.replace("form.", "") === "ownerOperator"
          ? EDriverType.OwnerOperator
          : EDriverType.Company,
      haulPreference:
        data.haulPreference.replace("form.", "") === "shortHaul"
          ? EHaulPreference.ShortHaul
          : EHaulPreference.LongHaul,
      teamStatus:
        data.teamStatus.replace("form.", "") === "single"
          ? ETeamStatus.Single
          : ETeamStatus.Team,
      preferLocalDriving: data.preferLocalDriving === "form.yes",
      preferSwitching: data.preferSwitching === "form.yes",
      flatbedExperience: data.flatbedExperience === "form.yes",
      completed: true,
    });

    router.push("/form/application-form/page-1");
  };

  return (
    <>
      <div className="space-y-6">
        {/* Pre-Qualification Questions */}
        <div className="space-y-4">
          {preQualificationQuestions.map((q) => (
            <Controller
              key={q.name}
              control={control}
              name={q.name}
              render={({ field }) => (
                <QuestionGroup
                  question={t(q.label)}
                  options={q.options}
                  {...field}
                />
              )}
            />
          ))}
        </div>

        {/* Categories */}
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
                  options={q.options}
                  {...field}
                />
              )}
            />
          ))}
        </div>

        {/* Next Button */}
        <div className="flex justify-center">
          <button
            disabled={!allAnswered}
            onClick={() => {
              // Call handleSubmit directly with the onSubmit function
              handleSubmit(onSubmit)();
            }}
            className={`px-8 py-2 mt-4 rounded-full font-semibold transition-colors shadow-md flex items-center gap-2
              ${
                allAnswered
                  ? "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }
            `}
          >
            {t("form.next")}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Flatbed experience notice popup */}
      {showFlatbedPopup && (
        <FlatbedPopup
          type={showFlatbedPopup}
          onClose={() => setShowFlatbedPopup(null)}
        />
      )}
    </>
  );
}
