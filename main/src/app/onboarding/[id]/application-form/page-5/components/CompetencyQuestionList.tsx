"use client";

import { useFormContext } from "react-hook-form";
import { getCompetencyQuestions } from "@/constants/competencyTestQuestions";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle } from "lucide-react";
import clsx from "clsx";

type Props = {
  disabled?: boolean;
  showResults?: boolean;
  resultsMap?: Map<string, string>;
};

export default function CompetencyQuestionList({ disabled, showResults, resultsMap }: Props) {
  const { t } = useTranslation("common");
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext();

  const answers = watch("answers");
  const answerErrors = errors.answers as any[] | undefined;
  const competencyQuestions = getCompetencyQuestions(t);

  return (
    <div className="space-y-8">
      {competencyQuestions.map((question, index) => {
        const inputName = `answers.${index}.answerId` as const;

        const watchedAnswerId: string = answers?.[index]?.answerId || "";
        const submittedAnswerId: string | undefined = resultsMap?.get(question.questionId);
        const currentAnswerId = showResults ? submittedAnswerId || "" : watchedAnswerId;

        const isAnswered = !!currentAnswerId;
        const isCorrect = !!currentAnswerId && currentAnswerId === question.correctAnswerId;

        const errorMessage = answerErrors?.[index]?.answerId?.message as string | undefined;

        return (
          <div key={question.questionId} className="p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200 bg-white">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <h3 className="text-base sm:text-lg font-medium flex-1">{question.questionText}</h3>

              <div className="flex items-center gap-2 sm:ml-4">
                <span className="text-sm font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">Q{index + 1}</span>
                {showResults && isAnswered && (isCorrect ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />)}
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {question.options.map((option) => {
                const isUserAnswer = currentAnswerId === option.id;
                const isCorrectAnswer = option.id === question.correctAnswerId;

                let containerClass = "rounded-md p-3 text-left transition-colors border";

                if (showResults) {
                  if (isCorrectAnswer) {
                    containerClass = clsx(containerClass, "bg-green-50 border-green-200");
                  } else if (isUserAnswer && !isCorrect) {
                    containerClass = clsx(containerClass, "bg-red-50 border-red-200");
                  } else {
                    containerClass = clsx(containerClass, "border-gray-200");
                  }
                } else {
                  containerClass = clsx(containerClass, isUserAnswer ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50");
                }

                return (
                  <label key={option.id} className={containerClass}>
                    <input type="radio" value={option.id} {...register(inputName)} className="sr-only" disabled={disabled} />
                    <div className="flex items-start gap-2">
                      <span className="uppercase font-medium flex-shrink-0 leading-5">{option.id}.</span>

                      <span className="flex-1 leading-5 break-words">{option.value}</span>

                      {showResults && (
                        <span className="ml-2 flex-shrink-0 self-start">
                          {isCorrectAnswer ? (
                            <CheckCircle className="h-5 w-5 min-w-[1.25rem] min-h-[1.25rem] text-green-600" />
                          ) : isUserAnswer && !isCorrect ? (
                            <XCircle className="h-5 w-5 min-w-[1.25rem] min-h-[1.25rem] text-red-600" />
                          ) : null}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Error */}
            {!showResults && errorMessage && <p className="mt-2 text-sm text-red-600 font-medium">{errorMessage}</p>}

            <input type="hidden" value={question.questionId} {...register(`answers.${index}.questionId`)} />
          </div>
        );
      })}
    </div>
  );
}
