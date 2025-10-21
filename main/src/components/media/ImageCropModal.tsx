"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactCropperElement } from "react-cropper";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

type Props = {
  open: boolean;
  imageSrc: string;              // data URL or https URL
  aspect?: number | null;        // e.g., 1.6 fixed, null => FREE
  onCancel: () => void;
  onCropped: (blob: Blob) => void | Promise<void>;
  targetWidth?: number;          // default 1600
  jpegQuality?: number;          // default 0.9
};

export default function ImageCropModal({
  open,
  imageSrc,
  aspect,
  onCancel,
  onCropped,
  targetWidth = 1600,
  jpegQuality = 0.9,
}: Props) {
  const titleId = useId();
  const cropperRef = useRef<ReactCropperElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [rotation, setRotation] = useState(0);

  // we infer minZoom at "fit" time (image fully contained)
  const [minZoom, setMinZoom] = useState<number>(0.1);
  const [zoom, setZoom] = useState<number>(1);

  const isFree = useMemo(() => aspect == null, [aspect]);

  // a11y focus + prevent background scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reset state whenever we open a new image
  useEffect(() => {
    if (!open) {
      setIsSaving(false);
      setRotation(0);
      setZoom(1);
      setMinZoom(0.1);
    }
  }, [open, imageSrc]);

  // Ready handler: fit image + initialize crop box
  function handleReady() {
    const c = cropperRef.current?.cropper;
    if (!c) return;

    // Ensure initial "contain" fit
    c.reset(); // puts image fully inside the viewport
    // The current zoom ratio at this point is our min zoom (fit)
    const img = c.getImageData(); // has naturalWidth, naturalHeight, width, height
    const fitZoom = img.width / img.naturalWidth;
    setMinZoom(fitZoom);
    setZoom(fitZoom);        // reflect in the UI slider

    // FREE aspect: start with the crop box covering the whole visible image
    if (isFree) {
      c.setCropBoxData({
        left: img.left,
        top: img.top,
        width: img.width,
        height: img.height,
      });
    } else {
      // Fixed aspect: large centered crop that respects aspect
      // Try to maximize width while preserving aspect inside the image bounds.
      const a = aspect!;
      // Fit by width first
      let boxW = img.width;
      let boxH = boxW / a;
      if (boxH > img.height) {
        // too tall; fit by height
        boxH = img.height;
        boxW = boxH * a;
      }
      const left = img.left + (img.width - boxW) / 2;
      const top = img.top + (img.height - boxH) / 2;
      c.setCropBoxData({ left, top, width: boxW, height: boxH });
    }
  }

  // Keep slider changes in sync with cropper
  function handleZoomInput(next: number) {
    const c = cropperRef.current?.cropper;
    if (!c) return;
    c.zoomTo(next);
    setZoom(next);
  }

  // Keep rotation in sync
  function handleRotateInput(nextDeg: number) {
    const c = cropperRef.current?.cropper;
    if (!c) return;
    c.rotateTo(nextDeg);
    setRotation(nextDeg);
  }

  async function handleDone() {
    if (isSaving) return;
    const c = cropperRef.current?.cropper;
    if (!c) return;

    setIsSaving(true);
    try {
      // Export with high quality; cap long edge ~targetWidth
      const canvas = c.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high",
        // For documents and cards this is a good balance
        maxWidth: targetWidth,
        maxHeight: targetWidth,
        fillColor: "#fff", // avoid transparent edges when rotated
      });

      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b!), "image/jpeg", jpegQuality)
      );

      await onCropped(blob);
    } finally {
      setIsSaving(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter" && !isSaving) void handleDone();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 grid grid-rows-[1fr_auto] bg-black/70"
    >
      <div className="relative h-[90dvh]">
        <h2 id={titleId} className="sr-only">Crop image</h2>

        <Cropper
          ref={cropperRef}
          src={imageSrc}
          // Behavior
          viewMode={1}                    // crop stays inside image
          dragMode="move"                 // drag to move image
          autoCrop
          autoCropArea={1}                // start filled; we set exact box in ready()
          aspectRatio={isFree ? NaN : aspect!}
          checkOrientation                // obey EXIF
          background={false}
          guides
          responsive
          // Gestures
          zoomOnWheel={false}
          zoomOnTouch
          // UI polish
          movable
          cropBoxMovable
          cropBoxResizable
          minCropBoxWidth={120}
          minCropBoxHeight={120}
          // Events
          ready={handleReady}
        />
      </div>

      <div className="bg-white/95 backdrop-blur sticky bottom-0 w-full p-3 sm:p-4 shadow-2xl">
        <div className="mx-auto max-w-md grid gap-3">
          {/* Rotation */}
          <label className="text-xs text-gray-600">Rotation ({rotation}°)</label>
          <input
            type="range"
            min={-45}
            max={45}
            step={1}
            value={rotation}
            onChange={(e) => handleRotateInput(parseInt(e.target.value))}
            className="w-full"
          />

          {/* Zoom */}
          <label className="text-xs text-gray-600">Zoom</label>
          <input
            type="range"
            min={Math.max(0.05, Number.isFinite(minZoom) ? minZoom : 0.1)}
            max={8}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomInput(parseFloat(e.target.value))}
            className="w-full"
          />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="flex-1 rounded-xl border px-4 py-2 text-sm"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-black text-white px-4 py-2 text-sm disabled:opacity-50"
              onClick={handleDone}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Done"}
            </button>
          </div>

          <p className="text-[11px] text-gray-500 text-center">
            Tip: pinch to zoom, drag to position, rotate if needed. Adjust the corners to match the edges.
          </p>
        </div>
      </div>
    </div>
  );
}