"use client";

import React from "react";
import Link from "next/link";
import { Settings, ArrowRight } from "lucide-react";

interface FlatbedNotApplicableMessageProps {
  trackerId: string;
}

export default function FlatbedNotApplicableMessage({
  trackerId,
}: FlatbedNotApplicableMessageProps) {
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
            background: "var(--color-info-container)",
          }}
        >
          <Settings
            className="w-8 h-8"
            style={{ color: "var(--color-info)" }}
          />
        </div>

        {/* Title */}
        <div>
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: "var(--color-on-surface)" }}
          >
            Flatbed Training Not Enabled
          </h2>
          <p
            className="text-base"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            This driver doesn&apos;t have <strong>Flatbed Training</strong> enabled in their onboarding process.
          </p>
        </div>

        {/* Description */}
        <div className="max-w-md">
          <p
            className="text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            To add Flatbed Training (Step 7) to this driver&apos;s onboarding process, 
            you need to enable it in the Drive Test page settings.
          </p>
        </div>

        {/* Action Button */}
        <Link
          href={`/dashboard/contract/${trackerId}/appraisal/drive-test`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-colors hover:opacity-90"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-on-primary)",
          }}
        >
          Go to Drive Test Settings
          <ArrowRight className="w-4 h-4" />
        </Link>

        {/* Info Box */}
        <div
          className="flex items-start gap-3 p-4 rounded-lg max-w-md"
          style={{
            background: "var(--color-info-container)",
            border: "1px solid var(--color-info)",
          }}
        >
          <Settings
            className="w-5 h-5 mt-0.5 flex-shrink-0"
            style={{ color: "var(--color-info)" }}
          />
          <p
            className="text-sm text-left"
            style={{ color: "var(--color-on-info-container)" }}
          >
            Once enabled, the driver will be able to access the Flatbed Training step 
            after completing their Drive Test assessment.
          </p>
        </div>
      </div>
    </div>
  );
}
