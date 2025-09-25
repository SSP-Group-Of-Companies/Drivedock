/**
 * Feature Cards Component — DriveDock
 *
 * Description:
 * Displays a set of cards highlighting the key features and benefits
 * of the DriveDock onboarding process. Each card contains an icon,
 * title, and description, all fully translatable.
 *
 * Key Features Displayed:
 * 1. Steps — Overview of the guided onboarding process.
 * 2. Multi-language — Support for English, Punjabi, and French.
 * 3. Security — Assurance of enterprise-grade data protection.
 *
 * Functionality:
 * - Uses `react-i18next` for multilingual text rendering.
 * - Uses `useMounted` to prevent hydration mismatches in Next.js.
 * - Dynamically generates cards from a `features` array.
 * - Adjusts layout for responsiveness, including special sizing for the last card.
 *
 * Routing:
 * This component is used on the public Home (`/`) page and is not interactive.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

import { FileText, Languages, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import useMounted from "@/hooks/useMounted";

export default function FeatureCards() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  // Prevent hydration mismatch by only rendering after client mount
  if (!mounted) return null;

  // List of feature items with icon, translated title, and translated description
  const features = [
    {
      icon: <FileText className="w-6 h-6 text-blue-700" />,
      title: t("welcome.features.steps.title"),
      description: t("welcome.features.steps.description"),
    },
    {
      icon: <Languages className="w-6 h-6 text-blue-700" />,
      title: t("welcome.features.language.title"),
      description: t("welcome.features.language.description"),
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-blue-700" />,
      title: t("welcome.features.security.title"),
      description: t("welcome.features.security.description"),
    },
  ];

  return (
    <section className="w-full py-12 sm:py-16 px-4">
      <div className="max-w-6xl mx-auto text-center">
        {/* Responsive grid layout for feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`rounded-xl bg-white shadow-md hover:shadow-lg transition p-6 flex flex-col items-center text-center
                ${
                  index === 2
                    ? "sm:col-span-2 sm:mx-auto sm:w-2/3 lg:col-span-1 lg:mx-0 lg:w-full"
                    : ""
                }`}
            >
              {/* Feature icon */}
              <div className="mb-3">{feature.icon}</div>

              {/* Feature title */}
              <h3 className="font-semibold text-lg text-gray-900">
                {feature.title}
              </h3>

              {/* Feature description */}
              <p className="text-sm text-gray-600 mt-1">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
