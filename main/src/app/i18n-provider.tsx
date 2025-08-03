"use client";

import { useEffect } from "react";
import i18next from "@/lib/i18n";
import { useLanguageStore } from "@/hooks/useLanguageStore";
import useMounted from "@/hooks/useMounted";

export default function I18nProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language } = useLanguageStore();
  const mounted = useMounted();

  useEffect(() => {
    if (!i18next.isInitialized || !mounted) return;

    const preferredLang =
      language || localStorage.getItem("drivedock_lang") || "en";

    if (i18next.language !== preferredLang) {
      i18next.changeLanguage(preferredLang);
    }
  }, [language, mounted]);

  return <>{children}</>;
}
