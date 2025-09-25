// src/lib/pdf/personal-consent-cfroi/mappers/personal-consent-cfroi.mapper.ts
import type { PDFForm } from "pdf-lib";
import { EPersonalConsentCfroiFillableFormFields as F, type PersonalConsentCfroiPayload } from "./personal-consent-cfroi.types";

/** Format date to YYYY-MM-DD */
function fmt(date?: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export type BuildPersonalConsentCfroiArgs = {
  // Header
  applicantFullName: string;
  companyName: string;

  // Footer
  applicantFirstName: string;
  applicantLastName: string;
  applicantDob?: Date | string;

  // Footer date (usually PoliciesConsents.signedAt)
  footerDate?: Date | string;
};

/** Build payload for the Personal Consent (CFROI) template */
export function buildPersonalConsentCfroiPayload(args: BuildPersonalConsentCfroiArgs): PersonalConsentCfroiPayload {
  const { applicantFullName, companyName, applicantFirstName, applicantLastName, applicantDob, footerDate } = args;

  const payload: PersonalConsentCfroiPayload = {};

  // Header
  payload[F.HEADER_APPLICANT_NAME] = applicantFullName || "";
  payload[F.HEADER_COMPANY_NAME] = companyName || "";

  // Footer (names + DOB)
  payload[F.FOOTER_APPLICANT_FIRST_NAME] = applicantFirstName || "";
  payload[F.FOOTER_APPLICANT_LAST_NAME] = applicantLastName || "";
  payload[F.FOOTER_DATE_OF_BIRTH] = fmt(applicantDob);

  // Footer Date
  payload[F.FOOTER_DATE] = fmt(footerDate);

  return payload;
}

/** Apply payload to pdf-lib form */
export function applyPersonalConsentCfroiPayloadToForm(form: PDFForm, payload: PersonalConsentCfroiPayload): void {
  for (const [name, value] of Object.entries(payload)) {
    try {
      const tf = form.getTextField(name);
      tf.setText(value == null ? "" : String(value));
    } catch {
      // field not found or not a text field — ignore to keep route resilient
    }
  }
}
