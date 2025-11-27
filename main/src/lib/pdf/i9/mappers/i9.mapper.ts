import type { PDFForm } from "pdf-lib";
import { EI9FillableFormFields as F, type I9Payload } from "./i9.types";

type MaybeDate = Date | string | undefined | null;

type AddressBits = {
  street?: string;
  apt?: string;
  city?: string;
  state?: string;
  zip?: string;
};

type SimpleDoc = {
  title: string;
  issuer?: string;
  number?: string;
  expiry?: MaybeDate;
};

export type BuildI9PayloadArgs = {
  // Section 1 – name / contact
  lastName: string;
  firstName: string;
  middleInitial?: string;
  otherLastNames?: string;
  address?: AddressBits;

  dob?: MaybeDate;
  ssn?: string;
  email?: string;
  phone?: string;

  // Citizenship / immigration status checkboxes
  statusUsCitizen?: boolean;
  statusNonCitizenNational?: boolean;
  statusLpr?: boolean;
  statusAlienAuthorized?: boolean;

  // For status #4 – “Foreign Passport Number and Country of Issuance”
  foreignPassportInfo?: string;

  // Section 1 signature
  employeeSignedDate?: MaybeDate;

  // Section 2 – documents
  listADoc1?: SimpleDoc;
  listADoc2?: SimpleDoc;
  listBDoc?: SimpleDoc;
  listCDoc?: SimpleDoc;

  // Employer / representative
  employerRepNameTitle?: string;
  employerRepSignedDate?: MaybeDate;
  firstDayOfEmployment?: MaybeDate;

  employerBusinessName?: string;
  employerBusinessAddress?: string;

  // Supplement A name row
  supALastName?: string;
  supAFirstName?: string;
  supAMiddleInitial?: string;
};

/* ------------------------------- helpers ------------------------------- */

function fmtDateMDY(date: MaybeDate): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";

  // Use UTC date to avoid timezone shifting the day
  const iso = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
  const [y, m, day] = iso.split("-");
  return `${m}/${day}/${y}`;
}

function getSsnDigits(raw?: string): string {
  if (!raw) return "";
  return raw.replace(/\D+/g, "").slice(0, 9); // max 9 digits
}

/* ------------------------------- builder ------------------------------- */

export function buildI9Payload(args: BuildI9PayloadArgs): I9Payload {
  const {
    lastName,
    firstName,
    middleInitial,
    otherLastNames,
    address,
    dob,
    ssn,
    email,
    phone,
    statusUsCitizen,
    statusNonCitizenNational,
    statusLpr,
    statusAlienAuthorized,
    foreignPassportInfo,
    employeeSignedDate,
    listADoc1,
    listADoc2,
    listBDoc,
    listCDoc,
    employerRepNameTitle,
    employerRepSignedDate,
    firstDayOfEmployment,
    employerBusinessName,
    employerBusinessAddress,
    supALastName,
    supAFirstName,
    supAMiddleInitial,
  } = args;

  const payload: I9Payload = {};

  /* ----------------------- Section 1 – Employee ----------------------- */

  payload[F.S1_LAST_NAME] = (lastName || "").trim();
  payload[F.S1_FIRST_NAME] = (firstName || "").trim();
  payload[F.S1_MIDDLE_INITIAL] = (middleInitial || "").trim();
  payload[F.S1_OTHER_LAST_NAMES] = (otherLastNames || "").trim();

  if (address) {
    payload[F.S1_ADDRESS_STREET] = address.street || "";
    payload[F.S1_ADDRESS_APT] = address.apt || "";
    payload[F.S1_ADDRESS_CITY] = address.city || "";
    payload[F.S1_ADDRESS_STATE] = address.state || "";
    payload[F.S1_ADDRESS_ZIP] = address.zip || "";
  }

  payload[F.S1_DOB] = fmtDateMDY(dob);

  const ssnDigits = getSsnDigits(ssn);
  payload[F.S1_SSN_DIGIT1] = ssnDigits[0] ?? "";
  payload[F.S1_SSN_DIGIT2] = ssnDigits[1] ?? "";
  payload[F.S1_SSN_DIGIT3] = ssnDigits[2] ?? "";
  payload[F.S1_SSN_DIGIT4] = ssnDigits[3] ?? "";
  payload[F.S1_SSN_DIGIT5] = ssnDigits[4] ?? "";
  payload[F.S1_SSN_DIGIT6] = ssnDigits[5] ?? "";
  payload[F.S1_SSN_DIGIT7] = ssnDigits[6] ?? "";
  payload[F.S1_SSN_DIGIT8] = ssnDigits[7] ?? "";
  payload[F.S1_SSN_DIGIT9] = ssnDigits[8] ?? "";

  payload[F.S1_EMAIL] = (email || "").trim();
  payload[F.S1_PHONE] = (phone || "").trim();

  // Status checkboxes
  payload[F.S1_STATUS_1_US_CITIZEN] = !!statusUsCitizen;
  payload[F.S1_STATUS_2_NONCITIZEN_NATIONAL] = !!statusNonCitizenNational;
  payload[F.S1_STATUS_3_LPR] = !!statusLpr;
  payload[F.S1_STATUS_4_ALIEN_AUTHORIZED] = !!statusAlienAuthorized;

  if (foreignPassportInfo && statusAlienAuthorized) {
    payload[F.S1_STATUS_4_FOREIGN_PASSPORT] = foreignPassportInfo;
  }

  payload[F.S1_EMPLOYEE_DATE] = fmtDateMDY(employeeSignedDate);

  /* ----------------------- Section 2 – Employer ----------------------- */

  if (listADoc1) {
    payload[F.S2_LISTA_DOC1_TITLE] = (listADoc1.title || "").trim();
    payload[F.S2_LISTA_DOC1_ISSUER] = (listADoc1.issuer || "").trim();
    payload[F.S2_LISTA_DOC1_NUMBER] = (listADoc1.number || "").trim();
    payload[F.S2_LISTA_DOC1_EXPIRY] = fmtDateMDY(listADoc1.expiry);
  }

  if (listADoc2) {
    payload[F.S2_LISTA_DOC2_TITLE] = (listADoc2.title || "").trim();
    payload[F.S2_LISTA_DOC2_ISSUER] = (listADoc2.issuer || "").trim();
    payload[F.S2_LISTA_DOC2_NUMBER] = (listADoc2.number || "").trim();
    payload[F.S2_LISTA_DOC2_EXPIRY] = fmtDateMDY(listADoc2.expiry);
  }

  if (listBDoc) {
    payload[F.S2_LISTB_DOC_TITLE] = (listBDoc.title || "").trim();
    payload[F.S2_LISTB_DOC_ISSUER] = (listBDoc.issuer || "").trim();
    payload[F.S2_LISTB_DOC_NUMBER] = (listBDoc.number || "").trim();
    payload[F.S2_LISTB_DOC_EXPIRY] = fmtDateMDY(listBDoc.expiry);
  }

  if (listCDoc) {
    payload[F.S2_LISTC_DOC_TITLE] = (listCDoc.title || "").trim();
    payload[F.S2_LISTC_DOC_ISSUER] = (listCDoc.issuer || "").trim();
    payload[F.S2_LISTC_DOC_NUMBER] = (listCDoc.number || "").trim();
    payload[F.S2_LISTC_DOC_EXPIRY] = fmtDateMDY(listCDoc.expiry);
  }

  payload[F.S2_EMPLOYER_REP_NAME_TITLE] = (employerRepNameTitle || "").trim();
  payload[F.S2_EMPLOYER_REP_DATE] = fmtDateMDY(employerRepSignedDate);
  payload[F.S2_FIRST_DAY_OF_EMPLOYMENT] = fmtDateMDY(firstDayOfEmployment);

  payload[F.S2_EMPLOYER_BUSINESS_NAME] = (employerBusinessName || "").trim();
  payload[F.S2_EMPLOYER_BUSINESS_ADDRESS] = (employerBusinessAddress || "").trim();

  /* ------------------ Supplement A – employee name only ---------------- */

  payload[F.SUPA_LAST_NAME] = (supALastName || "").trim();
  payload[F.SUPA_FIRST_NAME] = (supAFirstName || "").trim();
  payload[F.SUPA_MIDDLE_INITIAL] = (supAMiddleInitial || "").trim();

  return payload;
}

/**
 * Apply I-9 payload to pdf-lib form.
 * Booleans → checkboxes; strings → text fields.
 */
export function applyI9PayloadToForm(form: PDFForm, payload: I9Payload): void {
  for (const [name, value] of Object.entries(payload)) {
    if (value == null) continue;

    try {
      if (typeof value === "boolean") {
        try {
          const cb = form.getCheckBox(name);
          if (value) cb.check();
          else cb.uncheck();
          cb.updateAppearances();
          continue;
        } catch {
          // field isn't a checkbox, fall through to text
        }
      }

      const tf = form.getTextField(name);
      tf.setText(String(value));
    } catch {
      // ignore missing/mismatched fields
    }
  }
}
