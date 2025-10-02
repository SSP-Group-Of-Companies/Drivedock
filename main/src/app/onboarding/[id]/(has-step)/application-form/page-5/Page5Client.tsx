"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApplicationFormPage5Schema, applicationFormPage5Schema } from "@/lib/zodSchemas/applicationFormPage5.schema";
import CompetencyQuestionList from "./components/CompetencyQuestionList";
import useMounted from "@/hooks/useMounted";
import { IApplicationFormPage5 } from "@/types/applicationForm.types";
import { getCompetencyQuestions } from "@/constants/competencyTestQuestions";
import { useEffect, useMemo, useState } from "react";
import CompetencyStepButton from "./components/CompetencyStepButton";
import { useTranslation } from "react-i18next";

type Page5ClientProps = {
  data: IApplicationFormPage5;
  trackerId: string;
};

export default function Page5Client({ data, trackerId }: Page5ClientProps) {
  const { t } = useTranslation("common");
  const mounted = useMounted();

  // Score & locked state (locked when score !== null)
  const [score, setScore] = useState<number | null>(data.score ?? null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [highlightError, setHighlightError] = useState(false);

  const competencyQuestions = getCompetencyQuestions(t);

  // Persist the final submitted answers so we can render correct/incorrect UI like admin
  const [finalAnswers, setFinalAnswers] = useState<{ questionId: string; answerId: string }[] | null>(data.answers?.length ? data.answers : null);

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

  const totalQuestions = competencyQuestions.length;
  const percentage = score !== null ? Math.round((score / totalQuestions) * 100) : null;

  // Build a quick lookup map for results (used by the list to render admin-like highlights)
  const resultsMap = useMemo(() => {
    const m = new Map<string, string>();
    (finalAnswers ?? []).forEach((a) => m.set(a.questionId, a.answerId));
    return m;
  }, [finalAnswers]);

  const showResults = (finalAnswers?.length ?? 0) > 0 && score !== null;

  // Smoothly scroll to top after a *fresh* successful submission
  useEffect(() => {
    if (justSubmitted && score !== null && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [justSubmitted, score]);

  if (!mounted) return null;

  return (
    <FormProvider {...methods}>
      <h2 className="text-lg text-center font-semibold">{t("form.step2.page5.title")}</h2>

      {/* Instruction / Lock banners */}
      {score !== null && (
        <div className="mt-3 text-sm text-center text-gray-700 bg-blue-50 border border-blue-200 rounded-md py-2 px-4 max-w-3xl mx-auto">
          {/* If just submitted now, show explicit “review then checkbox+continue” message */}
          {justSubmitted ? (
            <span className="font-medium">{t("form.step2.page5.reviewInstruction")}</span>
          ) : (
            // Existing locked note (when re-opening an already-completed page)
            <span>{t("form.step2.page5.lockedNote")}</span>
          )}
        </div>
      )}

      {/* Score summary */}
      {score !== null && (
        <p className="mt-3 text-center text-green-700 font-semibold">
          {t("form.step2.page5.scoreLabel")} {score}/{totalQuestions} {percentage !== null ? `(${percentage}%)` : ""}
        </p>
      )}

      <form className="space-y-8" noValidate>
        <CompetencyQuestionList disabled={score !== null} showResults={showResults} resultsMap={resultsMap} />

        {/* Acknowledgement box after just-submitted (kept from your original flow) */}
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
              {/* Keep your localized text */}
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
          // Capture final answers on success so the UI can render results like admin
          onSuccessfulSubmit={(answersFromServerOrForm) => {
            setFinalAnswers(answersFromServerOrForm);
          }}
        />
      </form>
    </FormProvider>
  );
}
