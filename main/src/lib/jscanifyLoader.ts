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
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jscanify/1.4.0/jscanify.min.js";
    s.async = true;
    s.onload = () => {
      // Check if Jscanify is actually available after loading
      if (window.Jscanify) {
        resolve();
      } else {
        reject(new Error("Jscanify failed to load properly - window.Jscanify not available"));
      }
    };
    s.onerror = (e) => {
      console.error("Failed to load jscanify script:", e);
      reject(new Error("Failed to load jscanify script from CDN"));
    };
    document.body.appendChild(s);
  });

  return promise;
}
