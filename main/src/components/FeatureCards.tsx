"use client";

import { FileText, Languages, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import useMounted from "@/hooks/useMounted";

export default function FeatureCards() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  if (!mounted) return null;

  const features = [
    {
      icon: <FileText className="w-6 h-6 text-blue-700" />,
      title: t("features.steps.title"),
      description: t("features.steps.description"),
    },
    {
      icon: <Languages className="w-6 h-6 text-blue-700" />,
      title: t("features.language.title"),
      description: t("features.language.description"),
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-blue-700" />,
      title: t("features.security.title"),
      description: t("features.security.description"),
    },
  ];

  return (
    <section className="w-full py-12 sm:py-16 px-4">
      <div className="max-w-6xl mx-auto text-center">
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
              <div className="mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-lg text-gray-900">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
