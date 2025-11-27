// src/lib/pdf/psp-authorization/mappers/psp-authorization.mapper.ts
import type { PDFForm } from "pdf-lib";
import { EPspAuthorizationFillableFormFields as F } from "./psp-authorization.types";

/** FieldName -> value used by the PDF filler */
export type PspAuthorizationPayload = Partial<Record<F, string>>;

/** Format date to YYYY-MM-DD (UTC, date-only) */
function fmt(date?: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export type BuildPspAuthorizationArgs = {
  companyName: string; // header + authorization paragraph
  applicantFullName: string; // footer (Name - Please Print)
  footerDate?: Date | string; // footer date (usually policiesConsents.signedAt)
};

/** Build payload for the PSP Authorization template */
export function buildPspAuthorizationPayload(args: BuildPspAuthorizationArgs): PspAuthorizationPayload {
  const { companyName, applicantFullName, footerDate } = args;

  const payload: PspAuthorizationPayload = {};
  payload[F.HEADER_COMPANY_NAME] = companyName || "";
  payload[F.AUTH_COMPANY_NAME] = companyName || "";

  payload[F.FOOTER_NAME_PRINT] = applicantFullName || "";
  payload[F.FOOTER_DATE] = fmt(footerDate);

  return payload;
}

/** Apply payload to pdf-lib form */
export function applyPspAuthorizationPayloadToForm(form: PDFForm, payload: PspAuthorizationPayload): void {
  for (const [name, value] of Object.entries(payload)) {
    try {
      const tf = form.getTextField(name);
      tf.setText(value == null ? "" : String(value));
    } catch {
      // Field missing/type mismatch — keep resilient
    }
  }
}
