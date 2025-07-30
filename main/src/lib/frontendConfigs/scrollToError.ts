import { FieldErrors } from "react-hook-form";

// Scrolls to the first field with error, including nested (e.g., licenses.0.licenseFrontPhoto)
export function scrollToError<T extends Record<string, unknown>>(
  errors: FieldErrors<T>
) {
  const fieldPath = findFirstFieldPath(errors);
  if (!fieldPath) return;

  const el = document.querySelector(`[data-field="${fieldPath}"]`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    (el as HTMLElement).focus?.();
  } else {
    console.warn("scrollToError: target not found:", fieldPath);
  }
}

// Recursively walks the error object and returns the first path like "licenses.0.licenseBackPhoto"
function findFirstFieldPath<T extends Record<string, unknown>>(
  errors: FieldErrors<T>,
  parentPath = ""
): string | null {
  for (const key in errors) {
    if (!Object.prototype.hasOwnProperty.call(errors, key)) continue;

    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    const value = errors[key];

    if (value && typeof value === "object") {
      if ("message" in value) {
        return currentPath;
      }

      const childPath = findFirstFieldPath(value as FieldErrors, currentPath);
      if (childPath) return childPath;
    }
  }

  return null;
}
