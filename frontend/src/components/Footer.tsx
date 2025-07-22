"use client";

import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation("common");

  return (
    <footer className="w-full bg-gray-900 text-gray-400 py-6">
      <div className="max-w-4xl mx-auto px-4 text-center text-sm">
        <p className="font-medium text-white">
          © 2024 SSP Truck Line. {t("footer.rights")}
        </p>
        <p className="mt-1">{t("footer.tagline")}</p>
      </div>
    </footer>
  );
}
