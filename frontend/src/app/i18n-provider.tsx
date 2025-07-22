"use client";

import { useEffect } from "react";
import i18next from "@/lib/i18n"; 
import { useLanguageStore } from "@/hooks/useLanguageStore";

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguageStore();

  useEffect(() => {
    if (!i18next.isInitialized) return;

    const preferredLang = language || localStorage.getItem("drivedock_lang") || "en";

    if (i18next.language !== preferredLang) {
      i18next.changeLanguage(preferredLang);
    }
  }, [language]);

  return <>{children}</>;
}
