"use client";

import React from "react";
import { QuizResultsData } from "@/app/api/v1/admin/onboarding/[id]/quiz-results/types";
import { getCompetencyQuestions } from "@/constants/competencyTestQuestions";
import { useTranslation } from "react-i18next";
import QuizSummaryCard from "./QuizSummaryCard";
import QuizQuestionCard from "./QuizQuestionCard";

interface QuizResultsContentProps {
  data: QuizResultsData;
  onRefresh: () => void;
}

export default function QuizResultsContent({ data, onRefresh: _onRefresh }: QuizResultsContentProps) {
  const { t } = useTranslation("common");
  const { quizResults, lastUpdated } = data;
  const { answers, score } = quizResults;

  // Ensure lastUpdated is a proper Date object
  const completionDate = lastUpdated ? new Date(lastUpdated) : new Date();
  const competencyQuestions = getCompetencyQuestions(t);

  // Calculate percentage
  const percentage = score !== null ? Math.round((score / 21) * 100) : null;

  // Create a map of answers for easy lookup
  const answersMap = new Map(answers.map((answer) => [answer.questionId, answer.answerId]));

  return (
    <div className="space-y-6">
      {/* Quiz Results Section Header */}
      <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: "var(--color-outline)" }}>
        <div className="w-1 h-8 rounded-full" style={{ background: "var(--color-info)" }} />
        <h2 className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>
          Quiz Results Summary
        </h2>
      </div>

      {/* Responsive Layout: Stack on mobile, side-by-side on larger screens */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
        {/* Quiz Summary Card - First on mobile, left side on desktop */}
        <div className="w-full lg:w-72 lg:flex-shrink-0 order-1 lg:order-1">
          <QuizSummaryCard
            score={score}
            percentage={percentage}
            acknowledgedFaults={true} // This would come from the data if available
            dateOfCompletion={completionDate} // Use properly converted Date object
          />
        </div>

        {/* Quiz Questions - Second on mobile, right side on desktop */}
        <div className="w-full lg:flex-1 space-y-4 lg:space-y-6 order-2 lg:order-2">
          {competencyQuestions.map((question, index) => {
            const userAnswer = answersMap.get(question.questionId);
            const isCorrect = userAnswer === question.correctAnswerId;

            return <QuizQuestionCard key={question.questionId} question={question} userAnswer={userAnswer} isCorrect={isCorrect} questionNumber={index + 1} />;
          })}
        </div>
      </div>
    </div>
  );
}
