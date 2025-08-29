/**
 * Cookie-based theme store for DriveDock
 * 
 * This store manages theme preferences using cookies for persistence.
 * It handles system theme detection and provides a clean API for theme switching.
 */

import { create } from "zustand";
import { Theme, getResolvedTheme, setThemeInCookies, isThemeSupported } from "@/lib/theme-client";

interface CookieThemeStore {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  setResolvedTheme: (theme: "light" | "dark") => void;
  isInitialized: boolean;
}

export const useCookieThemeStore = create<CookieThemeStore>((set, _get) => ({
  theme: "system",
  resolvedTheme: "light",
  isInitialized: false,
  
  setTheme: (theme: Theme) => {
    try {
      const resolvedTheme = getResolvedTheme(theme);
      
      // Only save to cookies if we're in a browser environment
      if (isThemeSupported()) {
        setThemeInCookies(theme);
      }
      
      set({ theme, resolvedTheme, isInitialized: true });
    } catch (error) {
      console.error("Failed to set theme:", error);
      // Fallback to system theme on error
      const fallbackTheme: Theme = "system";
      const fallbackResolvedTheme = getResolvedTheme(fallbackTheme);
      set({ theme: fallbackTheme, resolvedTheme: fallbackResolvedTheme, isInitialized: true });
    }
  },
  
  setResolvedTheme: (resolvedTheme: "light" | "dark") => {
    set({ resolvedTheme });
  },
}));

// Initialize theme from cookies on store creation
if (isThemeSupported()) {
  try {
    import("@/lib/theme-client").then(({ getThemeFromCookiesClient }) => {
      const cookieTheme = getThemeFromCookiesClient();
      const store = useCookieThemeStore.getState();
      
      if (cookieTheme !== store.theme) {
        store.setTheme(cookieTheme);
      } else {
        // Mark as initialized even if theme is already correct
        store.setResolvedTheme(getResolvedTheme(cookieTheme));
        useCookieThemeStore.setState({ isInitialized: true });
      }
    }).catch((error) => {
      console.warn("Failed to initialize theme from cookies:", error);
      useCookieThemeStore.setState({ isInitialized: true });
    });
  } catch (error) {
    console.warn("Failed to initialize theme from cookies:", error);
    useCookieThemeStore.setState({ isInitialized: true });
  }
}

// Listen for system theme changes
if (isThemeSupported()) {
  try {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const store = useCookieThemeStore.getState();
      if (store.theme === "system") {
        const newResolvedTheme = e.matches ? "dark" : "light";
        store.setResolvedTheme(newResolvedTheme);
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    // Cleanup function (though this will rarely be called in practice)
    const cleanup = () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };

    // Store cleanup function for potential future use
    (useCookieThemeStore as any).cleanup = cleanup;
  } catch (error) {
    console.warn("Failed to set up system theme listener:", error);
  }
}
