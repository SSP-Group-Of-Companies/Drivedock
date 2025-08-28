"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/useThemeStore";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useThemeStore();

  // Theme is now handled entirely by the store
  // This component just ensures the store is initialized
  useEffect(() => {
    // Force a re-render when theme changes to ensure all components update
    // The actual DOM manipulation is handled by the store
  }, [resolvedTheme]);

  return <>{children}</>;
}
