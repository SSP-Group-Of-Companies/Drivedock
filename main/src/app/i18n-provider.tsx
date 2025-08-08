/**
 * I18n Provider Component — DriveDock
 *
 * Description:
 * A wrapper that ensures the correct language is set for the `i18next` instance
 * based on the user's preference from `useLanguageStore` or from `localStorage`.
 * This component is placed in the root layout so all pages inherit the correct language.
 *
 * Key Components & Hooks:
 * - `i18next`: The internationalization library configured in `@/lib/i18n`.
 * - `useLanguageStore`: Zustand store for persisting the user's language choice.
 * - `useMounted`: Ensures the component only runs its logic after client mount
 *   to avoid hydration mismatches and `localStorage` access errors.
 *
 * Constants:
 * - `SUPPORTED_LANGUAGES`: Explicit whitelist of allowed languages (`en`, `fr`, `es`).
 *
 * Functionality:
 * - On mount, determines the preferred language:
 *   1. First tries the language from `useLanguageStore`.
 *   2. Falls back to `localStorage` (`drivedock_lang`).
 *   3. Defaults to `"en"` if neither is set.
 * - Validates the preferred language against `SUPPORTED_LANGUAGES`.
 * - If valid and different from the current `i18next` language, calls `changeLanguage`.
 *
 * Routing:
 * - Used at the root layout level to wrap all pages in the application.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

import { useEffect } from "react";
import i18next from "@/lib/i18n";
import { useLanguageStore } from "@/hooks/useLanguageStore";
import useMounted from "@/hooks/useMounted";

// Explicitly declare allowed languages here
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

    // Retrieve stored language preference or default to English
    const storedLang = localStorage.getItem("drivedock_lang") || "en";
    const preferredLang = language || storedLang;

    // Validate against supported languages
    const isValid = SUPPORTED_LANGUAGES.includes(
      preferredLang as (typeof SUPPORTED_LANGUAGES)[number]
    );

    // Update language if valid and different from current
    if (isValid && i18next.language !== preferredLang) {
      i18next.changeLanguage(preferredLang);
    }
  }, [language, mounted]);

  // Render children once the provider has mounted
  return <>{children}</>;
}
