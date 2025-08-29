/**
 * Client-side theme utilities for DriveDock
 * 
 * This module provides functions for managing theme preferences using cookies.
 * All functions are safe to use in client components and handle SSR gracefully.
 */

export type Theme = "light" | "dark" | "system";

const THEME_COOKIE_NAME = "drivedock-theme";
const THEME_COOKIE_MAX_AGE = 31536000; // 1 year in seconds

/**
 * Set theme in cookies (client-side)
 * 
 * @param theme - The theme to save ("light", "dark", or "system")
 * @throws Will throw if called during SSR
 */
export function setThemeInCookies(theme: Theme): void {
  if (typeof document === "undefined") {
    throw new Error("setThemeInCookies cannot be called during SSR");
  }

  if (!["light", "dark", "system"].includes(theme)) {
    throw new Error(`Invalid theme: ${theme}. Must be "light", "dark", or "system"`);
  }

  const cookieValue = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
  document.cookie = cookieValue;
}

/**
 * Get theme from cookies (client-side)
 * 
 * @returns The stored theme preference, or "system" if not found
 */
export function getThemeFromCookiesClient(): Theme {
  if (typeof document === "undefined") {
    return "system"; // Safe SSR fallback
  }
  
  try {
    const cookies = document.cookie.split(";");
    const themeCookie = cookies.find(cookie => 
      cookie.trim().startsWith(`${THEME_COOKIE_NAME}=`)
    );
    
    if (themeCookie) {
      const value = themeCookie.split("=")[1]?.trim();
      if (value && ["light", "dark", "system"].includes(value)) {
        return value as Theme;
      }
    }
  } catch (error) {
    console.warn("Failed to read theme from cookies:", error);
  }
  
  return "system";
}

/**
 * Get resolved theme (light/dark) from theme preference
 * 
 * @param theme - The theme preference ("light", "dark", or "system")
 * @returns The resolved theme ("light" or "dark")
 */
export function getResolvedTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    if (typeof window === "undefined") {
      return "light"; // Safe SSR fallback
    }
    
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } catch (error) {
      console.warn("Failed to detect system theme preference:", error);
      return "light";
    }
  }
  
  return theme;
}

/**
 * Get initial resolved theme for SSR
 * 
 * This function provides a safe fallback for server-side rendering
 * where we can't detect the actual system preference.
 * 
 * @param theme - The theme preference
 * @returns The resolved theme for SSR
 */
export function getInitialResolvedTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    // Default to light for SSR, will be corrected on client
    return "light";
  }
  return theme;
}

/**
 * Check if the current environment supports theme switching
 * 
 * @returns True if theme switching is supported
 */
export function isThemeSupported(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}
