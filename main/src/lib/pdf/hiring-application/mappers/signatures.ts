import path from "path";
import { readFile } from "fs/promises";
import { PDFDocument } from "pdf-lib";
import { IPhoto } from "@/types/shared.types";
import { ESafetyAdminId, getSafetyAdminById } from "@/constants/safetyAdmins";
import { loadImageBytesFromPhoto } from "@/lib/utils/s3Upload";

export async function getDriverSignatureBytes(signaturePhoto?: IPhoto): Promise<Uint8Array | undefined> {
  if (!signaturePhoto) return;
  try {
    return await loadImageBytesFromPhoto(signaturePhoto);
  } catch (e) {
    console.warn("Driver signature load failed:", e);
    return;
  }
}

export async function getSafetyAdminSignatureBytes(safetyAdminId?: ESafetyAdminId): Promise<{ bytes?: Uint8Array; name?: string }> {
  if (!safetyAdminId) return {};
  const admin = getSafetyAdminById(safetyAdminId);
  if (!admin?.signature) return {};
  try {
    const abs = path.join(process.cwd(), "src", admin.signature);
    const bytes = await readFile(abs);
    return { bytes: new Uint8Array(bytes), name: admin.name };
  } catch (e) {
    console.warn("Safety admin signature load failed:", e);
    return {};
  }
}

/** Generic drawer used by the route */
export async function drawSignatureImage(opts: { pdfDoc: PDFDocument; pageIndex: number; fieldName: string; imageBytes?: Uint8Array; width?: number; height?: number; yOffset?: number }) {
  const { pdfDoc, pageIndex, fieldName, imageBytes, width = 90, height = 28, yOffset = 0 } = opts;
  if (!imageBytes) return;
  const form = pdfDoc.getForm();
  const page = pdfDoc.getPages()[pageIndex];
  // reuse your existing util if you prefer:
  const { drawPdfImage } = await import("@/lib/pdf/utils/drawPdfImage");
  await drawPdfImage({ pdfDoc, form, page, fieldName, imageBytes, width, height, yOffset });
}
