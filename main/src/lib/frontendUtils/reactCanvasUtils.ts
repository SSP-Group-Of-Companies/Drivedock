"ue client";

import type ReactSignatureCanvas from "react-signature-canvas";

/**
 * Robust trimming that avoids react-canvas's getTrimmedCanvas()
 * 1) Read the visible canvas
 * 2) Scan pixels for non-transparent bounds
 * 3) Copy onto a white-backed canvas (no alpha)
 */
export async function getBlobFromCanvas(sig: ReactSignatureCanvas): Promise<Blob> {
  const source = sig.getCanvas(); // the raw drawing canvas
  const w = source.width;
  const h = source.height;

  const ctx = source.getContext("2d");
  if (!ctx) {
    // Fallback: export the raw canvas without trimming
    return await new Promise<Blob>((resolve) => source.toBlob((b) => resolve(b as Blob), "image/png")!);
  }

  // Read pixel data
  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(0, 0, w, h);
  } catch {
    // Some browsers/security contexts can throw; fallback to raw
    return await new Promise<Blob>((resolve) => source.toBlob((b) => resolve(b as Blob), "image/png")!);
  }

  const data = imgData.data;

  // Find bounds of non-transparent pixels
  let top = -1,
    left = -1,
    right = -1,
    bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const alpha = data[idx + 3];
      if (alpha !== 0) {
        if (top === -1) top = y;
        if (left === -1 || x < left) left = x;
        if (right === -1 || x > right) right = x;
        bottom = y;
      }
    }
  }

  // If canvas is empty or all transparent, just export a small white image to signal "empty"
  if (top === -1) {
    const empty = document.createElement("canvas");
    empty.width = 300;
    empty.height = 120;
    const ectx = empty.getContext("2d")!;
    ectx.fillStyle = "#ffffff";
    ectx.fillRect(0, 0, empty.width, empty.height);
    return await new Promise<Blob>((resolve) => empty.toBlob((b) => resolve(b as Blob), "image/png")!);
  }

  const trimW = right - left + 1;
  const trimH = bottom - top + 1;

  // Create output canvas with white background (no transparency)
  const out = document.createElement("canvas");
  out.width = trimW;
  out.height = trimH;

  const octx = out.getContext("2d")!;
  octx.fillStyle = "#ffffff";
  octx.fillRect(0, 0, trimW, trimH);
  octx.drawImage(source, left, top, trimW, trimH, 0, 0, trimW, trimH);

  return await new Promise<Blob>((resolve) => out.toBlob((b) => resolve(b as Blob), "image/png")!);
}
