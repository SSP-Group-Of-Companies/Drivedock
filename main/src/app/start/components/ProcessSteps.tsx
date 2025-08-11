/**
 * Process Steps Component — DriveDock
 *
 * Description:
 * Displays a visual, numbered representation of the onboarding steps
 * for new drivers. This acts as a quick, high-level guide to the
 * multi-step application process.
 *
 * Steps Displayed:
 * 1. Personal Information
 * 2. Employment History
 * 3. Driving Information
 * 4. Medical Information
 * 5. References
 * 6. Review & Submit
 *
 * Functionality:
 * - Uses `react-i18next` to support multilingual text for step labels and titles.
 * - Uses `useMounted` to prevent hydration mismatches in Next.js.
 * - Dynamically generates step numbers and labels from a translation-driven array.
 * - Includes hover animations for better user engagement on desktop.
 *
 * Routing:
 * This component is used on the public Home (`/`) page in the
 * desktop-only section of the layout.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

import { useTranslation } from "react-i18next";
import useMounted from "@/hooks/useMounted";

export default function ProcessSteps() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  // Step labels fetched from translations
  const steps = [
    t("welcome.steps.personal"),
    t("welcome.steps.employment"),
    t("welcome.steps.driving"),
    t("welcome.steps.medical"),
    t("welcome.steps.references"),
    t("welcome.steps.review"),
  ];

  // Avoid rendering until the component is mounted to prevent hydration mismatch
  if (!mounted) return null;

  return (
    <section className="w-full px-4 py-12 sm:py-16">
      <div className="max-w-6xl mx-auto text-center">
        <div className="rounded-xl bg-white shadow p-6 sm:p-8">
          {/* Section title */}
          <h2 className="text-xl font-semibold text-blue-800 mb-6">
            {t("welcome.steps.title")}
          </h2>

          {/* Step list */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-6">
            {steps.map((label, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center space-y-2 transition hover:scale-105"
              >
                {/* Step number in circular badge */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-700 text-white flex items-center justify-center text-base sm:text-lg font-bold shadow-md">
                  {idx + 1}
                </div>

                {/* Step label */}
                <span className="text-sm text-gray-700 w-24 sm:w-28 text-center">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
