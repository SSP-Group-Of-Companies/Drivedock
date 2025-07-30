// /hooks/useLanguageStore.ts
import { create } from "zustand";

interface LanguageStore {
  language: string;
  setLanguage: (lang: string) => void;
}

// Helper function to safely get language from localStorage
const getInitialLanguage = (): string => {
  if (typeof window === "undefined") return "en";
  return localStorage.getItem("drivedock_lang") || "en";
};

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: getInitialLanguage(),
  setLanguage: (lang: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("drivedock_lang", lang);
    }
    set({ language: lang });
  },
}));
