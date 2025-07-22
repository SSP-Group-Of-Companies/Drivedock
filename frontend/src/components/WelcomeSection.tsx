"use client";

import CTAButtons from "./CTAButtons";
import { useTranslation } from "react-i18next";

export default function WelcomeSection() {
  const { t } = useTranslation("common");

  return (
    <section className="flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 max-w-2xl mx-auto">
      <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-gray-900 leading-tight">
        {t("welcome.heading")}
      </h1>

      <p className="mt-4 text-base sm:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
        {t("welcome.description")}
      </p>

      <div className="mt-6 sm:mt-10">
        <CTAButtons />
      </div>
    </section>
  );
}
