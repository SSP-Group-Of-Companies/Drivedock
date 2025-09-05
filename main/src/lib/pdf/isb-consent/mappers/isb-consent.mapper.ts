// src/lib/pdf/isb-consent/mappers/isb-consent.mapper.ts
import type { PDFForm } from "pdf-lib";
import { EIsbConsentFillableFormFields as F, type IsbConsentPayload } from "./isb-consent.types";

type MaybeDate = Date | string | undefined | null;

type Address = {
  address?: string; // free-form
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  from?: MaybeDate;
  to?: MaybeDate;
};

type CriminalRecord = {
  offense?: string;
  dateOfSentence?: MaybeDate;
  courtLocation?: string;
};

export type BuildIsbConsentArgs = {
  // Company
  companyName: string;
  companyCityCountry?: string; // e.g., "Toronto, Canada"

  // Applicant (page1)
  firstName: string;
  lastName: string;
  middleNames?: string;
  surnameAtBirth?: string;
  formerNames?: string;

  birthCity?: string;
  birthProvince?: string;
  birthCountry?: string;
  dob?: MaybeDate;

  phone?: string;
  email?: string;

  // Addresses (page1.addresses) — the most recent is current, 2 previous
  addresses?: Address[];

  // Consent date/signed-at (usually PoliciesConsents.signedAt)
  consentSignedAt?: MaybeDate;

  // Declaration rows (page4.criminalRecords)
  criminalRecords?: CriminalRecord[];

  // Signed-at city/province (use current address by default)
  signedAtCity?: string;
  signedAtProvince?: string;
};

/* ------------------------------- helpers ------------------------------- */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function fmt(date: MaybeDate): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function ymd(date: MaybeDate) {
  if (!date) return { y: "", m: "", d: "" };
  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return { y: "", m: "", d: "" };
  return { y: String(d.getFullYear()), m: pad2(d.getMonth() + 1), d: pad2(d.getDate()) };
}

/** naive split: "123 Main St Apt 4B" -> { number:"123", street:"Main St", apt:"Apt 4B" } */
function splitStreetLine(line?: string) {
  const out = { number: "", street: "", apt: "" };
  if (!line) return out;

  const match = line.match(/^\s*(\d+)\s+(.*)$/);
  if (!match) {
    out.street = line.trim();
    return out;
  }
  out.number = match[1];

  let rest = match[2].trim();
  const aptMatch = rest.match(/\b(?:Apt\.?|Apartment|Unit|Suite|#)\s*([A-Za-z0-9\-]+.*)$/i);
  if (aptMatch) {
    out.apt = aptMatch[0].trim();
    rest = rest.replace(aptMatch[0], "").trim();
  }
  out.street = rest;
  return out;
}

function currentPrevAddresses(addresses?: Address[]) {
  if (!addresses || addresses.length === 0) return { curr: undefined, prev1: undefined, prev2: undefined };

  const sorted = [...addresses].sort((a, b) => {
    const ta = a.to ? new Date(a.to as any).getTime() : 0;
    const tb = b.to ? new Date(b.to as any).getTime() : 0;
    return ta - tb;
  });

  const curr = sorted[sorted.length - 1];
  const prev1 = sorted.length > 1 ? sorted[sorted.length - 2] : undefined;
  const prev2 = sorted.length > 2 ? sorted[sorted.length - 3] : undefined;

  return { curr, prev1, prev2 };
}

/* ------------------------------- builder ------------------------------- */

export function buildIsbConsentPayload(args: BuildIsbConsentArgs): IsbConsentPayload {
  const {
    companyName,
    companyCityCountry,
    firstName,
    lastName,
    middleNames,
    surnameAtBirth,
    formerNames,
    birthCity,
    birthProvince,
    birthCountry,
    dob,
    phone,
    email,
    addresses,
    consentSignedAt,
    criminalRecords,
    signedAtCity,
    signedAtProvince,
  } = args;

  const payload: IsbConsentPayload = {};

  // Personal Info
  payload[F.PI_SURNAME] = (lastName || "").trim();
  payload[F.PI_GIVEN_NAMES] = (firstName || "").trim();
  payload[F.PI_MIDDLE_NAMES] = (middleNames || "").trim();
  payload[F.PI_SURNAME_AT_BIRTH] = (surnameAtBirth || "").trim();
  payload[F.PI_FORMER_NAMES] = (formerNames || "").trim();

  const placeOfBirth = [birthCity, birthProvince, birthCountry].filter(Boolean).join(", ");
  payload[F.PI_PLACE_OF_BIRTH] = placeOfBirth;
  payload[F.PI_DOB] = fmt(dob);

  payload[F.PI_PHONE] = (phone || "").trim();
  payload[F.PI_EMAIL] = (email || "").trim();

  // Address blocks
  const { curr, prev1, prev2 } = currentPrevAddresses(addresses);

  if (curr) {
    const parts = splitStreetLine(curr.address);
    payload[F.CURR_ADDR_NUMBER] = parts.number;
    payload[F.CURR_ADDR_STREET] = parts.street;
    payload[F.CURR_ADDR_APT] = parts.apt;
    payload[F.CURR_ADDR_CITY] = curr.city || "";
    payload[F.CURR_ADDR_PROVINCE] = curr.stateOrProvince || "";
    payload[F.CURR_ADDR_POSTAL] = curr.postalCode || "";
  }

  if (prev1) {
    const p = splitStreetLine(prev1.address);
    payload[F.PREV1_ADDR_NUMBER] = p.number;
    payload[F.PREV1_ADDR_STREET] = p.street;
    payload[F.PREV1_ADDR_APT] = p.apt;
    payload[F.PREV1_ADDR_CITY] = prev1.city || "";
    payload[F.PREV1_ADDR_PROVINCE] = prev1.stateOrProvince || "";
    payload[F.PREV1_ADDR_POSTAL] = prev1.postalCode || "";
  }

  if (prev2) {
    const p = splitStreetLine(prev2.address);
    payload[F.PREV2_ADDR_NUMBER] = p.number;
    payload[F.PREV2_ADDR_STREET] = p.street;
    payload[F.PREV2_ADDR_APT] = p.apt;
    payload[F.PREV2_ADDR_CITY] = prev2.city || "";
    payload[F.PREV2_ADDR_PROVINCE] = prev2.stateOrProvince || "";
    payload[F.PREV2_ADDR_POSTAL] = prev2.postalCode || "";
  }

  // Consent block
  payload[F.AUTH_COMPANY_NAME] = companyName || "";
  payload[F.AUTH_COMPANY_CITY_COUNTRY] = companyCityCountry || "";

  const ymdSigned = ymd(consentSignedAt);
  payload[F.AUTH_DATE_YEAR] = ymdSigned.y;
  payload[F.AUTH_DATE_MONTH] = ymdSigned.m;
  payload[F.AUTH_DATE_DAY] = ymdSigned.d;

  payload[F.AUTH_SIGNED_AT_CITY] = signedAtCity || curr?.city || "";
  payload[F.AUTH_SIGNED_AT_PROVINCE] = signedAtProvince || curr?.stateOrProvince || "";

  // Declaration header
  payload[F.DECL_SURNAME] = payload[F.PI_SURNAME];
  payload[F.DECL_GIVEN_NAMES] = payload[F.PI_GIVEN_NAMES];
  payload[F.DECL_DOB] = payload[F.PI_DOB];

  // Declaration rows (up to 7)
  const rows = (criminalRecords || []).slice(0, 7);
  rows.forEach((row, idx) => {
    const i = idx + 1; // 1..7
    (payload as any)[`isbconsent_decl_row${i}_offence`] = (row.offense || "").trim();
    (payload as any)[`isbconsent_decl_row${i}_date`] = fmt(row.dateOfSentence);
    (payload as any)[`isbconsent_decl_row${i}_court`] = (row.courtLocation || "").trim();
  });

  // Declaration date (reuse signedAt for simplicity)
  payload[F.DECL_DATE] = fmt(consentSignedAt);

  return payload;
}

/** Apply payload to pdf-lib form (text fields only) */
export function applyIsbConsentPayloadToForm(form: PDFForm, payload: IsbConsentPayload): void {
  for (const [name, value] of Object.entries(payload)) {
    if (value == null) continue;
    try {
      const tf = form.getTextField(name);
      tf.setText(value);
    } catch {
      // ignore: field missing or not a text field
    }
  }
}
