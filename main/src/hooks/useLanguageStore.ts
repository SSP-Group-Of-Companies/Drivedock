// /hooks/useLanguageStore.ts
import { create } from "zustand";

interface LanguageStore {
  language: string;
  setLanguage: (lang: string) => void;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: "en", // default
  setLanguage: (lang: string) => {
    localStorage.setItem("drivedock_lang", lang);
    set({ language: lang });
  }
}));
