declare global {
  interface Window {
    Jscanify?: any; // UMD global exposed by the browser build
    jscanify?: any; // Alternative global name
  }
}

let promise: Promise<void> | null = null;

/**
 * Lazy-load the jscanify browser UMD build.
 * Resolves when window.Jscanify is available.
 */
export function loadJscanify(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Jscanify || window.jscanify) return Promise.resolve();
  if (promise) return promise;

  promise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jscanify/1.4.0/jscanify.min.js";
    s.async = true;
    
    const checkForJscanify = () => {
      // Check multiple possible global variable names
      if (window.Jscanify) {
        resolve();
      } else if (window.jscanify) {
        // If it's lowercase, copy it to uppercase for consistency
        (window as any).Jscanify = window.jscanify;
        resolve();
      } else {
        // Give it a bit more time, some UMD builds take a moment
        setTimeout(() => {
          if (window.Jscanify || window.jscanify) {
            if (window.jscanify && !window.Jscanify) {
              (window as any).Jscanify = window.jscanify;
            }
            resolve();
          } else {
            // Log what's actually available for debugging
            const globals = Object.keys(window).filter(key => 
              key.toLowerCase().includes('scan') || 
              key.toLowerCase() === 'jscanify'
            );
            console.log('Available globals after jscanify load:', globals);
            reject(new Error("Jscanify failed to load properly - window.Jscanify not available"));
          }
        }, 100);
      }
    };

    s.onload = () => {
      // Wait a bit for UMD to initialize
      setTimeout(checkForJscanify, 50);
    };
    
    s.onerror = (e) => {
      console.error("Failed to load jscanify script:", e);
      reject(new Error("Failed to load jscanify script from CDN"));
    };
    
    document.body.appendChild(s);
  });

  return promise;
}
