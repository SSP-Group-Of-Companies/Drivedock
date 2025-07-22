"use client";

import { useTranslation } from "react-i18next";

export default function ProcessSteps() {
  const { t } = useTranslation("common");

  const steps = [
    t("steps.personal"),
    t("steps.employment"),
    t("steps.driving"),
    t("steps.medical"),
    t("steps.references"),
    t("steps.review")
  ];

  return (
    <section className="w-full px-4 py-12 sm:py-16">
      <div className="max-w-6xl mx-auto text-center">
        <div className="rounded-xl bg-white shadow p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-blue-800 mb-6">
            {t("steps.title")}
          </h2>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-6">
            {steps.map((label, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center space-y-2 transition hover:scale-105"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-700 text-white flex items-center justify-center text-base sm:text-lg font-bold shadow-md">
                  {idx + 1}
                </div>
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
