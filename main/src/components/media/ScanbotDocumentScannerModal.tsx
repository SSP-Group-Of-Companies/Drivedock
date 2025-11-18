// src/components/media/ScanbotDocumentScannerModal.tsx
"use client";

import { useEffect } from "react";
import ScanbotSDK from "scanbot-web-sdk/ui";
import { initScanbotSdk } from "@/lib/scanbot/initScanbotSdk";

type Props = {
  open: boolean;
  onClose: () => void;
  onResult: (file: File | null) => void;
};

export function ScanbotDocumentScannerModal({
  open,
  onClose,
  onResult,
}: Props) {
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      try {
        // 1) Init SDK
        await initScanbotSdk();

        // 2) RTU UI config – no containerId needed
        const config = new ScanbotSDK.UI.Config.DocumentScanningFlow();

        // 3) Open scanner UI
        const result = await ScanbotSDK.UI.createDocumentScanner(config);
        if (cancelled) return;

        // 🔍 For now: just log what Scanbot returns
        console.log("Scanbot document scanner result:", result);

        // We’re not converting to File yet – just reporting “no file”
        onResult(null);
      } catch (err) {
        console.error("Scanbot scanner failed:", err);
        onResult(null);
      } finally {
        if (!cancelled) {
          onClose();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, onClose, onResult]);

  if (!open) return null;

  // Simple overlay while Scanbot’s own UI takes over the viewport
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-white text-sm">
      Starting document scanner...
    </div>
  );
}
