// main/src/hooks/useLanguageStore.ts
import { create } from "zustand";

interface LanguageStore {
  language: string;
  setLanguage: (lang: string) => void;
}

const SUPPORTED_LANGUAGES = ["en", "fr", "es"]; // Updated

const getInitialLanguage = (): string => {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("drivedock_lang") || "en";
  return SUPPORTED_LANGUAGES.includes(stored) ? stored : "en";
};

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: getInitialLanguage(),
  setLanguage: (lang: string) => {
    if (typeof window !== "undefined" && SUPPORTED_LANGUAGES.includes(lang)) {
      localStorage.setItem("drivedock_lang", lang);
      set({ language: lang });
    }
  },
}));
