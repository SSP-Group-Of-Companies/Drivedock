// utils/scrollToFirstError.ts
import type { FieldErrors } from "react-hook-form";

const CSS_ESCAPE = (window.CSS && (CSS as any).escape) || ((s: string) => s.replace(/"/g, '\\"'));

function findAnchorForKey(key: string): HTMLElement | null {
  const escaped = CSS_ESCAPE(key);

  // Try exact field anchors first
  let el = document.querySelector<HTMLElement>(`[data-field="${escaped}"]`) || document.querySelector<HTMLElement>(`[name="${escaped}"]`);

  // If not found, try a parent anchor (e.g., we only added data-field="fastCard")
  if (!el) {
    const root = key.split(".")[0]; // "fastCard.fastCardNumber" -> "fastCard"
    const escapedRoot = CSS_ESCAPE(root);
    el = document.querySelector<HTMLElement>(`[data-field="${escapedRoot}"]`) || document.querySelector<HTMLElement>(`[name="${escapedRoot}"]`);
  }

  // As a last resort, try a prefix match on data-field for array items
  if (!el) {
    el = document.querySelector<HTMLElement>(`[data-field^="${escaped}."]`);
  }

  return el;
}

export function scrollToFirstError(errors: FieldErrors, offset = 90) {
  // Collect all error keys (flatten nested FieldErrors → dot paths)
  const keys: string[] = [];
  const walk = (obj: any, prefix = "") => {
    Object.entries(obj || {}).forEach(([k, v]) => {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && ("type" in v === false || v.type === undefined)) {
        // nested object/array
        walk(v as any, path);
      } else {
        keys.push(path);
      }
    });
  };
  walk(errors);

  // Build candidates that exist in the DOM
  const candidates = keys.map((k) => ({ key: k, el: findAnchorForKey(k) })).filter((c) => !!c.el) as { key: string; el: HTMLElement }[];

  if (!candidates.length) return;

  // Pick the one that is visually highest on the page
  const topmost = candidates.reduce((best, cur) => {
    const y = cur.el.getBoundingClientRect().top + window.scrollY;
    const bestY = best.el.getBoundingClientRect().top + window.scrollY;
    return y < bestY ? cur : best;
  });

  const y = topmost.el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });

  // Try to focus an interactive control inside
  const focusable = topmost.el.matches("input,select,textarea,button,a,[tabindex]") ? topmost.el : topmost.el.querySelector<HTMLElement>("input,select,textarea,button,[tabindex]");
  focusable?.focus({ preventScroll: true });
}
