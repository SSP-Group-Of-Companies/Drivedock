"use client";

import React from "react";
import { ICompetencyQuestion } from "@/types/applicationForm.types";
import { CheckCircle, XCircle } from "lucide-react";

interface QuizQuestionCardProps {
  question: ICompetencyQuestion;
  userAnswer: string | undefined;
  isCorrect: boolean;
  questionNumber: number;
}

export default function QuizQuestionCard({
  question,
  userAnswer,
  isCorrect,
  questionNumber,
}: QuizQuestionCardProps) {
  return (
    <div
      className="p-4 sm:p-6 rounded-2xl shadow-sm border w-full max-w-3xl"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-outline)",
      }}
    >
      {/* Question Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-4">
        <h3
          className="text-base sm:text-lg font-medium flex-1"
          style={{ color: "var(--color-on-surface)" }}
        >
          {question.questionText}
        </h3>

        {/* Question Number and Result Indicator */}
        <div className="flex items-center gap-2 sm:ml-4">
          <span
            className="text-sm font-medium px-2 py-1 rounded-full"
            style={{
              background: "var(--color-surface-variant)",
              color: "var(--color-on-surface-variant)",
            }}
          >
            Q{questionNumber}
          </span>

          {userAnswer && (
            <div className="flex items-center gap-1">
              {isCorrect ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Answer Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {question.options.map((option) => {
          const isUserAnswer = userAnswer === option.id;
          const isCorrectAnswer = option.id === question.correctAnswerId;

          let optionStyle = {
            background: "var(--color-surface)",
            borderColor: "var(--color-outline)",
            color: "var(--color-on-surface)",
          };

          // Highlight correct answer
          if (isCorrectAnswer) {
            optionStyle = {
              ...optionStyle,
              background: "var(--color-success)",
              color: "var(--color-on-success)",
              borderColor: "var(--color-success)",
            };
          }
          // Highlight user's incorrect answer
          else if (isUserAnswer && !isCorrect) {
            optionStyle = {
              ...optionStyle,
              background: "var(--color-error)",
              color: "var(--color-on-error)",
              borderColor: "var(--color-error)",
            };
          }

          return (
            <div
              key={option.id}
              className="border rounded-md p-2 sm:p-3 text-left transition-colors"
              style={optionStyle}
            >
              <div className="flex items-center gap-2">
                <span className="uppercase font-medium">{option.id}.</span>
                <span>{option.value}</span>

                {/* Show indicators for correct and user answers */}
                {isCorrectAnswer && (
                  <CheckCircle className="h-4 w-4 ml-auto text-green-500" />
                )}
                {isUserAnswer && !isCorrect && (
                  <XCircle className="h-4 w-4 ml-auto text-red-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Result Summary */}
      {userAnswer && (
        <div className="mt-4 p-2 sm:p-3 rounded-lg text-xs sm:text-sm">
          {isCorrect ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span>Correct answer!</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 text-red-700"
              style={{ background: "var(--color-error-container)" }}
            >
              <XCircle className="h-4 w-4" />
              <span>
                Incorrect. Driver answer:{" "}
                <strong>{userAnswer.toUpperCase()}</strong>. Correct answer:{" "}
                <strong>{question.correctAnswerId.toUpperCase()}</strong>.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
