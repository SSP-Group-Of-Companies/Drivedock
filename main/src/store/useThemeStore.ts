import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
  setResolvedTheme: (theme: "light" | "dark") => void;
}

const getInitialResolvedTheme = (theme: Theme): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
};

// Theme application function - single source of truth
const applyThemeToDOM = (theme: "light" | "dark") => {
  if (typeof document === "undefined") return;
  
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  
  // Update meta theme-color for mobile browsers
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      "content",
      theme === "dark" ? "#000000" : "#ffffff"
    );
  }
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "system",
      resolvedTheme: "light",
      setTheme: (theme: Theme) => {
        const resolvedTheme = getInitialResolvedTheme(theme);
        set({ theme, resolvedTheme });
        applyThemeToDOM(resolvedTheme);
      },
      setResolvedTheme: (resolvedTheme: "light" | "dark") => {
        set({ resolvedTheme });
        applyThemeToDOM(resolvedTheme);
      },
    }),
    {
      name: "drivedock_theme",
      partialize: (state) => ({
        theme: state.theme,
        resolvedTheme: state.resolvedTheme,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Recalculate resolved theme when rehydrating
          const resolvedTheme = getInitialResolvedTheme(state.theme);
          state.resolvedTheme = resolvedTheme;
          // Apply theme immediately after rehydration
          applyThemeToDOM(resolvedTheme);
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== "undefined") {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  mediaQuery.addEventListener("change", (e) => {
    const store = useThemeStore.getState();
    if (store.theme === "system") {
      const newResolvedTheme = e.matches ? "dark" : "light";
      store.setResolvedTheme(newResolvedTheme);
    }
  });
}
