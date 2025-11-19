// src/mongoose/schemas/sharedValidators.ts
import { EFileMimeType, isImageMime } from "@/types/shared.types";

type FileLike = { mimeType?: string | null } | null | undefined;

/**
 * Shared PDF validator:
 * - Allows undefined/null (so "required" can handle presence separately).
 * - If object exists but mimeType is missing -> "mimeType is missing in <field>".
 * - If mimeType exists but is not PDF -> "<field> must be a PDF file."
 */
export const pdfFieldValidator = {
  validator(v: FileLike) {
    if (!v) return true; // let "required" handle absence where applicable
    if (!v.mimeType) return false; // triggers message → mimeType missing
    return String(v.mimeType).toLowerCase() === EFileMimeType.PDF;
  },
  message(props: any) {
    const v = props?.value as FileLike;
    const path = String(props?.path ?? "file");

    if (v && !v.mimeType) return `mimeType is missing in ${path}.`;
    return `${path} must be a PDF file.`;
  },
};

/**
 * Shared image-only validator (kept for reuse elsewhere):
 * - Allows undefined/null.
 * - Requires mimeType.
 * - Accepts only image/*.
 */
export const imageFieldValidator = {
  validator(v: FileLike) {
    if (!v) return true;
    if (!v.mimeType) return false;
    return isImageMime(String(v.mimeType));
  },
  message(props: any) {
    const v = props?.value as FileLike;
    const path = String(props?.path ?? "file");

    if (v && !v.mimeType) return `mimeType is missing in ${path}.`;
    return `${path} must be an image.`;
  },
};

/**
 * Shared image-or-PDF validator:
 * - Allows undefined/null.
 * - Requires mimeType if object exists.
 * - Accepts image/* or application/pdf.
 */
export const imageOrPdfFieldValidator = {
  validator(v: FileLike) {
    if (!v) return true; // let "required" handle absence where applicable
    if (!v.mimeType) return false; // triggers message → mimeType missing

    const mime = String(v.mimeType).toLowerCase();
    return isImageMime(mime) || mime === EFileMimeType.PDF;
  },
  message(props: any) {
    const v = props?.value as FileLike;
    const path = String(props?.path ?? "file");

    if (v && !v.mimeType) return `mimeType is missing in ${path}.`;
    return `${path} must be an image or a PDF file.`;
  },
};
