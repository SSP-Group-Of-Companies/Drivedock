"use client";

import { useTranslation } from "react-i18next";
import useMounted from "@/hooks/useMounted";

export default function Footer() {
  const mounted = useMounted();
  const { t } = useTranslation("common");
  if (!mounted) return null;

  return (
    <footer className="w-full bg-gray-900 text-gray-400 py-3">
      <div className="max-w-4xl mx-auto px-4 text-center text-sm">
        <p className="font-medium text-white">
          © 2025 SSP Group of Companies. {t("footer.rights")}
        </p>
        <p className="mt-1">{t("footer.tagline")}</p>
      </div>
    </footer>
  );
}
