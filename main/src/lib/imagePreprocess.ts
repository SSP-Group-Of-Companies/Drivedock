import { loadOpenCV } from "@/lib/opencvLoader";
import { loadJscanify } from "@/lib/jscanifyLoader";

/** File -> HTMLCanvasElement */
export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const img = document.createElement("img");
  img.decoding = "async";
  const url = URL.createObjectURL(file);
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = rej;
    img.src = url;
  });
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  return c;
}

/** Canvas -> JPEG Blob */
export function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality = 0.9
): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/jpeg", quality);
  });
}

/**
 * Main entry: preprocess a user-picked File to a cleaned JPEG File.
 * - Tries jscanify.extractPaper (auto-crop/deskew)
 * - Falls back to simple JPEG compress if edges not found or any error occurs
 * - Optional aspectHint, e.g. 1.6 for ID-like cards
 */
export async function preprocessWithJscanify(
  file: File,
  aspectHint?: number
): Promise<File> {
  await loadOpenCV();
  await loadJscanify(); // <-- NEW

  const srcCanvas = await fileToCanvas(file);
  const targetW = 1600;
  const targetH = aspectHint ? Math.round(targetW / aspectHint) : 1000;

  let outBlob: Blob;
  try {
    // Verify Jscanify is available before using it
    if (!window.Jscanify) {
      throw new Error("Jscanify not available on window object");
    }
    
    const scanner: any = new window.Jscanify();
    const out = scanner.extractPaper(srcCanvas, targetW, targetH);
    outBlob = await canvasToJpegBlob(out, 0.9);
  } catch (error) {
    console.warn("Jscanify preprocessing failed, falling back to compression:", error);
    // graceful fallback: just compress the original
    outBlob = await canvasToJpegBlob(srcCanvas, 0.9);
  }

  const safeName =
    file.name?.toLowerCase().endsWith(".jpg") ||
    file.name?.toLowerCase().endsWith(".jpeg")
      ? file.name
      : (file.name?.split(".")[0] || "upload") + "-scanned.jpg";

  return new File([outBlob], safeName, { type: "image/jpeg" });
}
