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
  const [rotation, setRotation] = useState(0);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // focus the dialog for a11y
  useEffect(() => {
    if (open) containerRef.current?.focus();
  }, [open]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedPixels(croppedAreaPixels);
  }, []);

  async function handleDone() {
    if (!croppedPixels) return;
    const blob = await getCroppedBlob(imageSrc, croppedPixels, rotation, targetWidth, jpegQuality);
    await onCropped(blob);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter") void handleDone();
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
      <div className="relative">
        <h2 id={titleId} className="sr-only">Crop image</h2>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect ?? undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          restrictPosition
          objectFit="contain"
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
            min={1}
            max={3}
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
              className="flex-1 rounded-xl bg-black text-white px-4 py-2 text-sm"
              onClick={handleDone}
            >
              Done
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

function getRotaSize(width: number, height: number, rotation: number) {
  const rotRad = degToRad(rotation);
  const bBoxW = Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height);
  const bBoxH = Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height);
  return { width: bBoxW, height: bBoxH };
}

async function getCroppedBlob(
  imageSrc: string,
  cropPx: Area,
  rotationDeg: number,
  targetWidth = 1600,
  jpegQuality = 0.9
): Promise<Blob> {
  const img = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Create a canvas that can fit the rotated image
  const { width: bW, height: bH } = getRotaSize(img.width, img.height, rotationDeg);
  canvas.width = Math.round(bW);
  canvas.height = Math.round(bH);

  // Move to center and rotate
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(degToRad(rotationDeg));
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  // Now crop from the rotated image
  const data = ctx.getImageData(cropPx.x, cropPx.y, cropPx.width, cropPx.height);

  // Draw cropped to a new canvas and scale to target width
  const out = document.createElement("canvas");
  const scale = targetWidth / cropPx.width;
  out.width = Math.round(cropPx.width * scale);
  out.height = Math.round(cropPx.height * scale);
  const octx = out.getContext("2d")!;
  octx.putImageData(data, 0, 0);
  if (scale !== 1) {
    // scale with drawImage for better quality
    const tmp = document.createElement("canvas");
    tmp.width = cropPx.width;
    tmp.height = cropPx.height;
    tmp.getContext("2d")!.putImageData(data, 0, 0);
    octx.drawImage(tmp, 0, 0, tmp.width, tmp.height, 0, 0, out.width, out.height);
  }

  // Slight contrast lift for readability
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
