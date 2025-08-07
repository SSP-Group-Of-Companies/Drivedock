"use client";

import { useEffect } from "react";
import i18next from "@/lib/i18n";
import { useLanguageStore } from "@/hooks/useLanguageStore";
import useMounted from "@/hooks/useMounted";

//  Explicitly declare allowed languages here
const SUPPORTED_LANGUAGES = ["en", "fr", "es"] as const;

export default function I18nProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language } = useLanguageStore();
  const mounted = useMounted();

  useEffect(() => {
    if (!i18next.isInitialized || !mounted) return;

    const storedLang = localStorage.getItem("drivedock_lang") || "en";
    const preferredLang = language || storedLang;

    const isValid = SUPPORTED_LANGUAGES.includes(
      preferredLang as (typeof SUPPORTED_LANGUAGES)[number]
    );

    if (isValid && i18next.language !== preferredLang) {
      i18next.changeLanguage(preferredLang);
    }
  }, [language, mounted]);

  return <>{children}</>;
}
