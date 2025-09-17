"use client";

import React from "react";
import { CheckCircle, XCircle } from "lucide-react";

interface QuizSummaryCardProps {
  score: number;
  totalQuestions: number;
  percentage: number | null;
  acknowledgedFaults: boolean;
  dateOfCompletion: Date;
}

export default function QuizSummaryCard({ score, totalQuestions, percentage, acknowledgedFaults, dateOfCompletion }: QuizSummaryCardProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <div
      className="p-4 sm:p-6 rounded-2xl shadow-sm border w-full lg:w-72"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-outline)",
      }}
    >
      <h3 className="text-base font-bold mb-3 text-center" style={{ color: "var(--color-on-surface)" }}>
        Quiz Results Summary
      </h3>

      <div className="space-y-3">
        {/* Score */}
        <div className="text-center">
          <div className="text-3xl font-bold mb-1" style={{ color: "var(--color-on-surface)" }}>
            {score} / {totalQuestions}
          </div>
          {percentage !== null && (
            <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              {percentage}% Score
            </div>
          )}
        </div>

        {/* Acknowledged Faults */}
        <div className="flex items-center justify-center gap-2">
          {acknowledgedFaults ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
          <span className="text-sm" style={{ color: "var(--color-on-surface)" }}>
            Acknowledged faults: {acknowledgedFaults ? "Yes" : "No"}
          </span>
        </div>

        {/* Date of Completion */}
        <div className="text-center">
          <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Date of Completion:
          </div>
          <div className="font-medium" style={{ color: "var(--color-on-surface)" }}>
            {formatDate(dateOfCompletion)}
          </div>
        </div>
      </div>
    </div>
  );
}
