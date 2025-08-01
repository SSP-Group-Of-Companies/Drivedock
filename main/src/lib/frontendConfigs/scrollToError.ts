import { FieldErrors } from "react-hook-form";

// Scrolls to the first available DOM node with an error
export function scrollToError<T extends Record<string, unknown>>(
  errors: FieldErrors<T>
) {
  const fieldPaths = findAllFieldPaths(errors);

  for (const path of fieldPaths) {
    const el = document.querySelector(`[data-field="${path}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement).focus?.();
      return;
    } else {
      console.warn("scrollToError: target not found in DOM:", path);
    }
  }
}

// Recursively gathers all error field paths like licenses.0.licenseBackPhoto
function findAllFieldPaths<T extends Record<string, unknown>>(
  errors: FieldErrors<T>,
  parentPath = ""
): string[] {
  const paths: string[] = [];

  for (const key in errors) {
    if (!Object.prototype.hasOwnProperty.call(errors, key)) continue;

    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    const value = errors[key];

    if (value && typeof value === "object") {
      if ("message" in value) {
        paths.push(currentPath);
      } else {
        paths.push(...findAllFieldPaths(value as FieldErrors, currentPath));
      }
    }
  }

  return paths;
}
