"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApplicationFormPage5Schema, applicationFormPage5Schema } from "@/lib/zodSchemas/applicationFormPage5.schema";
import CompetencyQuestionList from "./components/CompetencyQuestionList";
import useMounted from "@/hooks/useMounted";
import { IApplicationFormPage5 } from "@/types/applicationForm.types";
import { getCompetencyQuestions } from "@/constants/competencyTestQuestions";
import { useState } from "react";
import CompetencyStepButton from "./components/CompetencyStepButton";
import { useTranslation } from "react-i18next";

type Page5ClientProps = {
  data: IApplicationFormPage5;
  trackerId: string;
};

export default function Page5Client({ data, trackerId }: Page5ClientProps) {
  const { t } = useTranslation("common");
  const mounted = useMounted();
  const [score, setScore] = useState<number | null>(data.score ?? null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [highlightError, setHighlightError] = useState(false);

  const competencyQuestions = getCompetencyQuestions(t);
  
  const defaultValues: ApplicationFormPage5Schema = data.answers?.length
    ? {
        answers: data.answers.map((a) => ({
          questionId: a.questionId || "",
          answerId: a.answerId || "",
        })),
      }
    : {
        answers: competencyQuestions.map((q) => ({
          questionId: q.questionId,
          answerId: "",
        })),
      };

  const methods = useForm<ApplicationFormPage5Schema>({
    resolver: zodResolver(applicationFormPage5Schema),
    mode: "onChange",
    defaultValues,
  });

  const percentage = score !== null ? Math.round((score / 21) * 100) : null;

  if (!mounted) return null;

  return (
    <FormProvider {...methods}>
      <h2 className="text-lg text-center font-semibold">{t("form.step2.page5.title")}</h2>
      {score !== null && <div className="text-sm text-center text-gray-500 bg-gray-50 border border-gray-200 rounded-md py-2 px-4 max-w-xl mx-auto">{t("form.step2.page5.lockedNote")}</div>}
      <form className="space-y-8" noValidate>
        <CompetencyQuestionList disabled={score !== null} />

        {score !== null && (
          <p className="text-center text-green-700 font-semibold">
            {t("form.step2.page5.scoreLabel")} {score}/21 ({percentage}%)
          </p>
        )}

        {justSubmitted && score !== null && (
          <div className={`max-w-xl mx-auto border rounded-lg p-4 transition-colors ${highlightError ? "border-red-500 bg-red-50" : "border-gray-300 bg-gray-50"}`}>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={checkboxChecked}
                onChange={(e) => {
                  setCheckboxChecked(e.target.checked);
                  setHighlightError(false); // remove error on check
                }}
              />
              <span>{t("form.step2.page5.note")}</span>
            </label>
          </div>
        )}

        <CompetencyStepButton
          score={score}
          setScore={setScore}
          trackerId={trackerId}
          justSubmitted={justSubmitted}
          setJustSubmitted={setJustSubmitted}
          checkboxChecked={checkboxChecked}
          setHighlightError={setHighlightError}
        />
      </form>
    </FormProvider>
  );
}
