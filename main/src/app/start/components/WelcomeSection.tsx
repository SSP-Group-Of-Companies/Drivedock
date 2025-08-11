/**
 * Welcome Section Component — DriveDock
 *
 * Description:
 * This hero section is displayed on the landing page and introduces
 * applicants to the SSP Group of Companies' onboarding process.
 * It features a headline, descriptive text, and call-to-action buttons.
 *
 * Key Components:
 * - CTAButtons: Interactive buttons to start the application or learn more.
 *
 * Functionality:
 * - Uses `react-i18next` for multilingual text rendering.
 * - Uses `useMounted` to ensure rendering only occurs after client-side mount.
 * - Displays a skeleton loader until translations are loaded and the component is mounted.
 *
 * Routing:
 * This component is used within the `/` (Home) route and is public.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

import CTAButtons from "./CTAButtons";
import { useTranslation } from "react-i18next";
import useMounted from "@/hooks/useMounted";

export default function WelcomeSection() {
  const { t } = useTranslation("common");
  const mounted = useMounted();

  // Prevent hydration mismatch by only rendering after client mount
  if (!mounted) return null;

  return (
    <section className="flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 max-w-2xl mx-auto">
      {/* Translated hero heading */}
      <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-gray-900 leading-tight">
        {t("welcome.heading")}
      </h1>

      {/* Translated description text */}
      <p className="mt-4 text-base sm:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
        {t("welcome.description")}
      </p>

      {/* Call-to-action buttons */}
      <div className="mt-6 sm:mt-10">
        <CTAButtons />
      </div>
    </section>
  );
}
