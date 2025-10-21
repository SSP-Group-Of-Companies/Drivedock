"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";

type Props = {
  open: boolean;
  imageSrc: string;            // data URL or https URL
  aspect?: number | null;      // e.g., 1.6 for ID, null for freeform
  onCancel: () => void;
  onCropped: (blob: Blob) => void | Promise<void>;
  targetWidth?: number;        // default 1600
  jpegQuality?: number;        // default 0.9
};

export default function ImageCropModal({
  open,
  imageSrc,
  aspect,
  onCancel,
  onCropped,
  targetWidth = 1600,
  jpegQuality = 0.9
}: Props) {
  const titleId = useId();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMediaDimensionsRef = useRef<{ naturalWidth: number; naturalHeight: number } | null>(null);

  // focus the dialog for a11y
  useEffect(() => {
    if (open) containerRef.current?.focus();
  }, [open]);

  // prevent background scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { 
      document.body.style.overflow = original; 
    };
  }, [open]);

  // reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setIsSaving(false);
      setZoom(1);
      setMinZoom(1);
      setCrop({ x: 0, y: 0 });
      setRotation(0);
      lastMediaDimensionsRef.current = null;
    }
  }, [open, imageSrc]);

  // helper: compute fit zoom
  function getFitZoom({
    containerW,
    containerH,
    naturalW,
    naturalH,
  }: {
    containerW: number; 
    containerH: number;
    naturalW: number; 
    naturalH: number;
  }) {
    if (!containerW || !containerH || !naturalW || !naturalH) return 1;
    return Math.min(containerW / naturalW, containerH / naturalH);
  }

  // called by react-easy-crop when media is ready
  const handleMediaLoaded = useCallback((m: {
    naturalWidth: number; 
    naturalHeight: number;
    width: number; 
    height: number; // rendered size
  }) => {
    if (!containerRef.current) return;

    // Store dimensions for resize recomputation
    lastMediaDimensionsRef.current = {
      naturalWidth: m.naturalWidth,
      naturalHeight: m.naturalHeight
    };

    // FREE aspect only: auto-fit
    if (aspect == null) {
      const rect = containerRef.current.getBoundingClientRect();
      const fit = getFitZoom({
        containerW: rect.width,
        containerH: rect.height,
        naturalW: m.naturalWidth,
        naturalH: m.naturalHeight,
      });

      setMinZoom(Math.min(1, fit)); // let user zoom out slightly if fit>1 case
      setZoom(fit);
      setCrop({ x: 0, y: 0 }); // center
    }
  }, [aspect]);

  // re-fit on resize/orientation (FREE only)
  useEffect(() => {
    if (aspect != null) return; // fixed aspects keep normal behavior
    
    const onResize = () => {
      if (!lastMediaDimensionsRef.current || !containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const fit = getFitZoom({
        containerW: rect.width,
        containerH: rect.height,
        naturalW: lastMediaDimensionsRef.current.naturalWidth,
        naturalH: lastMediaDimensionsRef.current.naturalHeight,
      });
      
      setMinZoom(Math.min(1, fit));
      setZoom(fit);
    };
    
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [aspect]);

  // When aspect changes, re-fit if moving into FREE
  useEffect(() => {
    if (aspect == null && lastMediaDimensionsRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const fit = getFitZoom({
        containerW: rect.width,
        containerH: rect.height,
        naturalW: lastMediaDimensionsRef.current.naturalWidth,
        naturalH: lastMediaDimensionsRef.current.naturalHeight,
      });
      
      setMinZoom(Math.min(1, fit));
      setZoom(fit);
      setCrop({ x: 0, y: 0 });
    } else if (aspect != null) {
      // Reset to defaults for fixed aspects
      setMinZoom(1);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    }
  }, [aspect]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedPixels(croppedAreaPixels);
  }, []);

  async function handleDone() {
    if (!croppedPixels || isSaving) return;
    setIsSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedPixels, rotation, targetWidth, jpegQuality);
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
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-50 grid grid-rows-[1fr_auto] bg-black/70"
      onKeyDown={onKeyDown}
    >
      <div className="relative h-[90dvh]">
        <h2 id={titleId} className="sr-only">Crop image</h2>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          minZoom={minZoom}
          maxZoom={8}
          rotation={rotation}
          aspect={aspect ?? undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          onMediaLoaded={handleMediaLoaded}
          restrictPosition
          objectFit="contain"
          showGrid
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
            onChange={(e) => setRotation(parseInt(e.target.value))}
            className="w-full"
          />

          {/* Zoom */}
          <label className="text-xs text-gray-600">Zoom</label>
          <input
            type="range"
            min={minZoom}
            max={8}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
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
            Tip: pinch to zoom, drag to position, rotate if needed. Aim to fill the frame and remove background.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------ Helpers (canvas crop + rotate + export) ------------- */

function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function degToRad(degree: number) {
  return (degree * Math.PI) / 180;
}

async function getCroppedBlob(
  imageSrc: string,
  cropPx: Area,
  rotationDeg: number,
  targetWidth = 1600,
  jpegQuality = 0.9
): Promise<Blob> {
  const img = await createImage(imageSrc);

  // 1) draw the rotated image to an intermediate canvas
  const rot = document.createElement("canvas");
  const rctx = rot.getContext("2d")!;
  const rad = degToRad(rotationDeg);
  const bbW = Math.abs(Math.cos(rad) * img.width) + Math.abs(Math.sin(rad) * img.height);
  const bbH = Math.abs(Math.sin(rad) * img.width) + Math.abs(Math.cos(rad) * img.height);
  rot.width = Math.round(bbW);
  rot.height = Math.round(bbH);

  rctx.translate(rot.width / 2, rot.height / 2);
  rctx.rotate(rad);
  rctx.drawImage(img, -img.width / 2, -img.height / 2);

  // 2) scale so the cropped width becomes targetWidth
  const scale = targetWidth / cropPx.width;
  const out = document.createElement("canvas");
  out.width = Math.round(cropPx.width * scale);
  out.height = Math.round(cropPx.height * scale);
  const octx = out.getContext("2d")!;

  // 3) crop from the rotated canvas directly with high-quality sampling
  //    (source: rot, sx,sy,sw,sh → dest: 0,0,outW,outH)
  const sx = Math.max(0, Math.floor(cropPx.x));
  const sy = Math.max(0, Math.floor(cropPx.y));
  const sw = Math.max(1, Math.floor(cropPx.width));
  const sh = Math.max(1, Math.floor(cropPx.height));
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(rot, sx, sy, sw, sh, 0, 0, out.width, out.height);

  // 4) subtle contrast lift
  boostContrast(out, 1.12);

  return new Promise<Blob>((resolve) => {
    out.toBlob((b) => resolve(b!), "image/jpeg", jpegQuality);
  });
}

function boostContrast(canvas: HTMLCanvasElement, factor = 1.12) {
  const ctx = canvas.getContext("2d")!;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, d[i] * factor);
    d[i + 1] = Math.min(255, d[i + 1] * factor);
    d[i + 2] = Math.min(255, d[i + 2] * factor);
  }
  ctx.putImageData(img, 0, 0);
}
