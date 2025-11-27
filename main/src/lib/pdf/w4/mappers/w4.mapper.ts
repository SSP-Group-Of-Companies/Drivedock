import type { PDFForm } from "pdf-lib";
import { EW4FillableFormFields as F, type W4Payload, type W4FilingStatus } from "./w4.types";

/* ------------------------------- helpers ------------------------------- */

type MaybeDate = Date | string | undefined | null;

type Address = {
  address?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  from?: MaybeDate;
  to?: MaybeDate;
};

/** US-style date: MM/DD/YYYY */
function fmtUsDate(date: MaybeDate): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/** Pick the “current” address (latest `to` date) */
function pickCurrentAddress(addresses?: Address[]): Address | undefined {
  if (!addresses || addresses.length === 0) return undefined;

  const sorted = [...addresses].sort((a, b) => {
    const ta = a.to ? new Date(a.to as any).getTime() : 0;
    const tb = b.to ? new Date(b.to as any).getTime() : 0;
    return ta - tb;
  });

  return sorted[sorted.length - 1];
}

/* ------------------------------- builder ------------------------------- */

export type BuildW4PayloadArgs = {
  // Applicant basic info (from ApplicationForm.page1)
  firstName: string;
  lastName: string;
  middleInitial?: string;
  ssn?: string; // US only – can be taken from page1.sin virtual for SSP_US if desired

  addresses?: Address[]; // ApplicationForm.page1.addresses

  // Filing status (if/when we start collecting it)
  filingStatus?: W4FilingStatus;

  // Employee signature + date (from PoliciesConsents)
  signedAt?: MaybeDate;

  // Employer info (from company + onboarding)
  employerName: string;
  employerAddressLine: string; // e.g. company.location
  firstDateOfEmployment?: MaybeDate;

  // Optional: EIN – we keep this in the types but do not currently fill it
  employerEin?: string;
};

export function buildW4Payload(args: BuildW4PayloadArgs): W4Payload {
  const { firstName, lastName, middleInitial, ssn, addresses, filingStatus, signedAt, employerName, employerAddressLine, firstDateOfEmployment, employerEin } = args;

  const payload: W4Payload = {};

  /* ------------------ Step 1 – Personal information ------------------ */

  payload[F.STEP1_FIRST_MIDDLE] = [firstName || "", (middleInitial || "").trim()].filter(Boolean).join(" ");

  payload[F.STEP1_LAST_NAME] = (lastName || "").trim();
  payload[F.STEP1_SSN] = (ssn || "").trim();

  const curr = pickCurrentAddress(addresses);
  if (curr) {
    payload[F.STEP1_ADDRESS] = curr.address || "";

    const cityStateZip = [curr.city, curr.stateOrProvince, curr.postalCode].filter(Boolean).join(", ");
    payload[F.STEP1_CITY_STATE_ZIP] = cityStateZip;
  } else {
    payload[F.STEP1_ADDRESS] = "";
    payload[F.STEP1_CITY_STATE_ZIP] = "";
  }

  // Filing status checkboxes
  payload[F.STEP1_STATUS_SINGLE_OR_MARRIED_SEPARATE] = filingStatus === "singleOrMarriedSeparately";
  payload[F.STEP1_STATUS_MARRIED_JOINT] = filingStatus === "marriedFilingJointly";
  payload[F.STEP1_STATUS_HEAD_OF_HOUSEHOLD] = filingStatus === "headOfHousehold";

  /* ---------------------- Step 5 – Sign here ------------------------ */

  payload[F.STEP5_DATE] = fmtUsDate(signedAt);

  /* ------------------------ Employers only -------------------------- */

  // Employer’s name and address – one combined line is usually enough
  payload[F.EMPLOYER_NAME_ADDRESS] = `${employerName || ""} – ${employerAddressLine || ""}`.trim();

  payload[F.FIRST_DATE_OF_EMPLOYMENT] = fmtUsDate(firstDateOfEmployment);

  if (employerEin) {
    payload[F.EMPLOYER_EIN] = employerEin;
  }

  return payload;
}

/** Apply payload to pdf-lib form (text fields + checkboxes) */
export function applyW4PayloadToForm(form: PDFForm, payload: W4Payload): void {
  for (const [name, value] of Object.entries(payload)) {
    if (value == null) continue;

    try {
      if (typeof value === "boolean") {
        // Checkbox
        try {
          const cb = form.getCheckBox(name);
          if (value) cb.check();
          else cb.uncheck();
          cb.updateAppearances();
          continue;
        } catch {
          // Not a checkbox – ignore
          continue;
        }
      }

      // Text field
      const tf = form.getTextField(name);
      tf.setText(value as string);
    } catch {
      // Field missing or wrong type – ignore
    }
  }
}
