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
        // 1) Initialize Scanbot SDK
        await initScanbotSdk();
        if (cancelled) return;

        // 2) Configure ready-to-use document scanning UI
        const config = new ScanbotSDK.UI.Config.DocumentScanningFlow();

        // 3) Start scanner
        const result = await ScanbotSDK.UI.createDocumentScanner(config);
        if (cancelled) return;

        const document = result?.document;
        const pages = document?.pages ?? [];

        // User cancelled / no pages
        if (!document || pages.length === 0) {
          onResult(null);
          return;
        }

        const firstPage = pages[0];

        // 4) Load processed (cropped + deskewed) image
        const image = await firstPage.loadDocumentImage();
        if (!image) {
          onResult(null);
          return;
        }

        // 5) Convert Scanbot image → JPEG bytes
        // Scanbot typings are generic; at runtime this is a byte buffer.
        const jpegBytes = await image.toJpeg(90);

        // 6) Wrap into Blob/File – treat jpegBytes as a BlobPart
        const blobPart = jpegBytes as unknown as BlobPart;

        const blob = new Blob([blobPart], { type: "image/jpeg" });

        const file = new File([blob], `sin-scan-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        onResult(file);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-white text-sm">
      Starting document scanner...
    </div>
  );
}
