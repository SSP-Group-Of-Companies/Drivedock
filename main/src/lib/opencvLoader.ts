let promise: Promise<void> | null = null;

/**
 * Lazy-load the OpenCV browser build once.
 * Resolves immediately if cv is already initialized.
 */
export function loadOpenCV(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const cvAny = (window as any).cv;
  // If cv is already ready (no onRuntimeInitialized or Mat exists), resolve.
  if (cvAny && (!cvAny.onRuntimeInitialized || cvAny.Mat)) return Promise.resolve();
  if (promise) return promise;

  promise = new Promise<void>((resolve) => {
    const s = document.createElement("script");
    s.src = "https://docs.opencv.org/4.7.0/opencv.js";
    s.async = true;
    s.onload = () => {
      const cv = (window as any).cv;
      if (cv && cv.onRuntimeInitialized) cv.onRuntimeInitialized = () => resolve();
      else resolve();
    };
    document.body.appendChild(s);
  });

  return promise;
}
