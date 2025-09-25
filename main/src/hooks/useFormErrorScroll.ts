// src/hooks/useFormErrorScroll.ts
import { useCallback } from "react";
import type { FieldErrors, FieldValues } from "react-hook-form";

// Escape CSS attribute values safely
const cssEscape = (v: string) => v.replace(/["\\]/g, "\\$&");

// Flatten RHF errors into *leaf* paths only (skip parents if children exist)
function collectLeafPaths(errs: any, base = ""): string[] {
  if (!errs || typeof errs !== "object") return [];
  // RHF FieldError leaf: has "message" or "type"
  const isLeaf = ("message" in errs && typeof errs.message !== "undefined") || ("type" in errs && typeof errs.type !== "undefined");

  if (isLeaf) return [base].filter(Boolean) as string[];

  // Arrays & objects
  const paths: string[] = [];
  for (const key of Object.keys(errs)) {
    // RHF puts array indices as numeric keys; `_errors` can exist for Zod array errors
    if (key === "_errors") continue; // treat parent _errors as banner, not a leaf
    const child = errs[key];
    const next = base ? `${base}.${key}` : key;
    paths.push(...collectLeafPaths(child, next));
  }
  return paths;
}

function findElementForPath(path: string): HTMLElement | null {
  // Exact data-field match takes priority
  const exact = (document.querySelector(`[data-field="${cssEscape(path)}"]`) as HTMLElement | null) || (document.querySelector(`[name="${cssEscape(path)}"]`) as HTMLElement | null);
  if (exact) return exact;

  // Optional fallbacks for known section banners (kept for completeness)
  const sectionFallbackKey = path.startsWith("business")
    ? "business.root"
    : path.startsWith("eligibilityDocs")
    ? "eligibilityDocs.root"
    : path.startsWith("criminalRecords")
    ? "criminalRecords"
    : null;

  if (sectionFallbackKey) {
    return document.querySelector(`[data-field="${sectionFallbackKey}"]`) as HTMLElement | null;
  }
  return null;
}

function focusAndScroll(el: HTMLElement) {
  // Prefer focusing the actual input/select/textarea if container was matched
  const focusable = el.matches("input,textarea,select,[contenteditable]") ? el : (el.querySelector("input,textarea,select,[contenteditable]") as HTMLElement | null);

  if (focusable) {
    // Prevent double scroll jump: focus first, then scroll
    (focusable as HTMLInputElement).focus({ preventScroll: true });
  }

  // Center it in view; adjust if you have a sticky header
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function useFormErrorScroll<T extends FieldValues>() {
  const handleFormError = useCallback((errors: FieldErrors<T>) => {
    const leafPaths = collectLeafPaths(errors as any);

    // If we somehow have no leaf paths, try any top-level anchors in DOM order
    if (leafPaths.length === 0) {
      const anchors = ["business.root", "eligibilityDocs.root", "criminalRecords", "fastCard"]
        .map((k) => document.querySelector(`[data-field="${k}"]`) as HTMLElement | null)
        .filter(Boolean) as HTMLElement[];

      if (anchors.length) {
        // Pick the top-most anchor on the page
        const target = anchors.sort((a, b) => a.getBoundingClientRect().top + window.scrollY - (b.getBoundingClientRect().top + window.scrollY))[0];
        focusAndScroll(target);
      }
      return;
    }

    // Map leaf paths to actual elements; keep only the ones we can find
    const candidates = leafPaths.map((p) => ({ path: p, el: findElementForPath(p) })).filter((x): x is { path: string; el: HTMLElement } => !!x.el);

    if (candidates.length === 0) {
      return;
    }

    // Choose the top-most element on the page (not just the first error key)
    const target = candidates
      .map((c) => ({
        ...c,
        top: c.el.getBoundingClientRect().top + window.scrollY,
        depth: c.path.split(".").length,
      }))
      .sort((a, b) => a.top - b.top || b.depth - a.depth)[0];

    focusAndScroll(target.el);
  }, []);

  return { handleFormError };
}
