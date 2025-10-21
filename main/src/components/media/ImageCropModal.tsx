"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactCropperElement } from "react-cropper";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

// Custom CSS for better mobile touch targets
const customCropperStyles = `
  .cropper-container .cropper-crop-box {
    border: 3px solid #007bff !important;
  }
  
  .cropper-container .cropper-crop-box .cropper-view-box {
    border: 2px solid #007bff !important;
  }
  
  .cropper-container .cropper-crop-box .cropper-face {
    border: 2px solid #007bff !important;
  }
  
  .cropper-container .cropper-crop-box .cropper-line {
    background-color: #007bff !important;
    width: 4px !important;
    height: 4px !important;
  }
  
  .cropper-container .cropper-crop-box .cropper-point {
    background-color: #007bff !important;
    width: 12px !important;
    height: 12px !important;
    border: 2px solid #ffffff !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
  }
  
  .cropper-container .cropper-crop-box .cropper-point.point-se {
    background-color: #007bff !important;
  }
  
  .cropper-container .cropper-crop-box .cropper-point.point-sw {
    background-color: #007bff !important;
  }
  
  .cropper-container .cropper-crop-box .cropper-point.point-nw {
    background-color: #007bff !important;
  }
  
  .cropper-container .cropper-crop-box .cropper-point.point-ne {
    background-color: #007bff !important;
  }
  
  .cropper-container .cropper-crop-box .cropper-point.point-n {
    background-color: #007bff !important;
  }
  
  .cropper-container .cropper-crop-box .cropper-point.point-s {
    background-color: #007bff !important;
  }
  
  .cropper-container .cropper-crop-box .cropper-point.point-e {
    background-color: #007bff !important;
  }
  
  .cropper-container .cropper-crop-box .cropper-point.point-w {
    background-color: #007bff !important;
  }
  
  /* Responsive padding - more on mobile, less on desktop */
  .cropper-container {
    padding: 10px !important;
  }
  
  @media (max-width: 768px) {
    .cropper-container {
      padding: 20px !important;
    }
  }
  
  /* Make the crop box have more breathing room */
  .cropper-container .cropper-crop-box {
    margin: 5px !important;
  }
  
  @media (max-width: 768px) {
    .cropper-container .cropper-crop-box {
      margin: 10px !important;
    }
  }
  
  /* Ensure touch targets are large enough */
  .cropper-container .cropper-crop-box .cropper-point {
    min-width: 20px !important;
    min-height: 20px !important;
    touch-action: none !important;
  }
  
  /* Make lines more visible on mobile */
  .cropper-container .cropper-crop-box .cropper-line {
    min-width: 3px !important;
    min-height: 3px !important;
  }
`;

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

  // Inject custom CSS for better mobile touch targets
  useEffect(() => {
    if (!open) return;
    
    const styleId = 'cropper-custom-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = customCropperStyles;
      document.head.appendChild(styleElement);
    }
    
    return () => {
      // Don't remove styles immediately to avoid flash
      setTimeout(() => {
        const element = document.getElementById(styleId);
        if (element) element.remove();
      }, 100);
    };
  }, [open]);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 sm:p-6"
    >
      <div className="relative w-full max-w-4xl h-[80vh] sm:h-[85vh] bg-white rounded-lg shadow-2xl overflow-hidden">
        <h2 id={titleId} className="sr-only">Crop image</h2>
        
        {/* Close button for desktop */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
          aria-label="Close crop modal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="h-[calc(100%-120px)]">
          <Cropper
            ref={cropperRef}
            src={imageSrc}
            style={{ height: "100%", width: "100%" }}
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
            // Mobile-friendly padding
            cropstart={() => {
              // Add padding when crop starts
              const container = document.querySelector('.cropper-container') as HTMLElement;
              if (container) {
                container.style.padding = '20px';
              }
            }}
            // Events
            ready={handleReady}
          />
        </div>

        {/* Controls - positioned at bottom of modal */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t p-3 sm:p-4">
          <div className="grid gap-3">
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
    </div>
  );
}