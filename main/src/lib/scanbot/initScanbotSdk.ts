// src/lib/scanbot/initScanbotSdk.ts
"use client";

import ScanbotSDK from "scanbot-web-sdk/ui";

let sdkPromise: Promise<any> | null = null;

/**
 * Singleton initializer – Scanbot recommends initializing once per session.
 */
export function initScanbotSdk() {
  if (!sdkPromise) {
    sdkPromise = ScanbotSDK.initialize({
      // empty string = 60s trial; we pass your real key from env
      licenseKey: process.env.NEXT_PUBLIC_SCANBOT_LICENSE_KEY ?? "",
      // For now we use CDN engine binaries – perfect for a trial.
      // Later we can host these files ourselves for production.
      enginePath:
        "https://cdn.jsdelivr.net/npm/scanbot-web-sdk@latest/bundle/bin/complete/",
    });
  }
  return sdkPromise;
}

export default ScanbotSDK;
