"use client";

import React from "react";
import { Clock, AlertCircle } from "lucide-react";

interface StepNotCompletedMessageProps {
  stepName: string;
  stepDescription?: string;
}

export default function StepNotCompletedMessage({
  stepName,
  stepDescription,
}: StepNotCompletedMessageProps) {
  return (
    <div
      className="rounded-xl border p-8 shadow-sm dark:shadow-none"
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-outline)",
      }}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Icon */}
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full"
          style={{
            background: "var(--color-warning-container)",
          }}
        >
          <Clock
            className="w-8 h-8"
            style={{ color: "var(--color-warning)" }}
          />
        </div>

        {/* Title */}
        <div>
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: "var(--color-on-surface)" }}
          >
            Step Not Completed Yet
          </h2>
          <p
            className="text-base"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            The driver hasn&apos;t completed the <strong>{stepName}</strong>{" "}
            step yet.
          </p>
        </div>

        {/* Description */}
        {stepDescription && (
          <div className="max-w-md">
            <p
              className="text-sm"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              {stepDescription}
            </p>
          </div>
        )}

        {/* Info Box */}
        <div
          className="flex items-start gap-3 p-4 rounded-lg max-w-md"
          style={{
            background: "var(--color-info-container)",
            border: "1px solid var(--color-info)",
          }}
        >
          <AlertCircle
            className="w-5 h-5 mt-0.5 flex-shrink-0"
            style={{ color: "var(--color-info)" }}
          />
          <p
            className="text-sm text-left"
            style={{ color: "var(--color-on-info-container)" }}
          >
            This page will become available once the driver completes the
            required step in their onboarding process.
          </p>
        </div>
      </div>
    </div>
  );
}
