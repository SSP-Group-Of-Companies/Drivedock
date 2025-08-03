"use client";

import CTAButtons from "./CTAButtons";
import { useTranslation } from "react-i18next";
import useMounted from "@/hooks/useMounted";

export default function WelcomeSection() {
  const { t, ready } = useTranslation("common");
  const mounted = useMounted();

  // Don't render until translation is ready and component is mounted
  if (!mounted || !ready) {
    return (
      <section className="flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-12 sm:h-16 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 sm:h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 sm:h-6 bg-gray-200 rounded mb-4"></div>
        </div>
      </section>
    );
  }

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
