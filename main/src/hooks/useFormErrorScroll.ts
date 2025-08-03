// src/hooks/useFormErrorScroll.ts

import { useCallback } from "react";
import { FieldErrors, FieldValues } from "react-hook-form";
import { scrollToError } from "@/lib/frontendConfigs/scrollToError";

// Generic reusable hook with strong typing and compatibility
export function useFormErrorScroll<T extends FieldValues>() {
  const handleFormError = useCallback((errors: FieldErrors<T>) => {
    scrollToError(errors as FieldErrors<Record<string, unknown>>); // Safe cast for utility compatibility
  }, []);

  return { handleFormError };
}
