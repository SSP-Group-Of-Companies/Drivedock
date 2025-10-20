declare global {
  interface Window {
    Jscanify?: any; // UMD global exposed by the browser build
  }
}

let promise: Promise<void> | null = null;

/**
 * Lazy-load the jscanify browser UMD build.
 * Resolves when window.Jscanify is available.
 */
export function loadJscanify(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Jscanify) return Promise.resolve();
  if (promise) return promise;

  promise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    // Prefer a pinned version if you know it; otherwise latest is fine for now
    // You can switch to a specific version, e.g. .../1.2.3/dist/jscanify.min.js
    s.src = "https://unpkg.com/jscanify/dist/jscanify.min.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.body.appendChild(s);
  });

  return promise;
}
