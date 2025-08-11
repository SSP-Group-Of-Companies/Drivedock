/**
 * ===============================================================
 * DriveDock - Application Form Types (Shared)
 * ---------------------------------------------------------------
 * Single source of truth for the multi-page Driver Application form.
 *
 * Scope:
 *  - Shared by frontend (typing form payloads) and backend (validation & DB).
 *  - Page 1 collects identity, contact, licenses, and address history.
 *  - Later pages cover employment, incidents, education, documents, etc.
 *
 * Notes:
 *  - Date-like fields are modeled as `string | Date` to accommodate
 *    JSON payloads (`YYYY-MM-DD`) and server-side parsed Date objects.
 *  - `sinEncrypted` is produced on the server. The client should send
 *    plain `sin` on Page 1 POST; the backend will compute and store
 *    `sinEncrypted` and strip `sin` prior to persistence.
 *  - `IPhoto` represents an uploaded image reference (S3 key, etc.).
 * ===============================================================
 */

import { Document } from "mongoose";
import { ELicenseType, IPhoto } from "./shared.types";

/* =========================
 * Page 1
 * ========================= */

/**
 * Physical address entry for 5-year coverage validation.
 * `from`/`to` should use `YYYY-MM-DD` in requests (client), while
 * the server may coerce to Date on persistence.
 */
export interface Iaddress {
  address: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  from: string | Date; // Format: YYYY-MM-DD (client) or Date (server)
  to: string | Date; // Format: YYYY-MM-DD (client) or Date (server)
}

/**
 * Driver license entry. The first entry MUST be AZ (business rule),
 * and must include both front and back photos.
 */
export interface ILicenseEntry {
  licenseNumber: string;
  licenseStateOrProvince: string;
  licenseType: ELicenseType; // e.g., AZ, DZ, etc.
  licenseExpiry: string | Date; // YYYY-MM-DD (client) or Date (server)
  licenseFrontPhoto: IPhoto; // S3 temp ref on POST; finalized by server
  licenseBackPhoto: IPhoto; // S3 temp ref on POST; finalized by server
}

/**
 * Application - Page 1
 * Personal details, place of birth, license(s), and address history.
 *
 * IMPORTANT:
 * - Client sends `sin` (plain). Server computes `sinEncrypted` and removes `sin`
 *   before saving. `sinEncrypted` appears in server-side data.
 * - `sinPhoto` and license photos should be uploaded to TEMP S3 first; the
 *   returned `IPhoto` objects are included in the JSON payload. The server
 *   will finalize/move them after a successful save.
 */
export interface IApplicationFormPage1 {
  // Personal
  firstName: string;
  lastName: string;
  sin?: string; // Client-provided on POST only
  sinEncrypted: string; // Server-computed; client should omit
  sinPhoto: IPhoto;
  dob: string | Date; // YYYY-MM-DD (client) or Date (server)
  phoneHome: string;
  phoneCell: string;
  canProvideProofOfAge: boolean;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;

  // Place of Birth
  birthCity: string;
  birthCountry: string;
  birthStateOrProvince: string;

  // Licenses
  licenses: Array<ILicenseEntry>;

  // Address (must cover at least 5 years)
  addresses: Array<Iaddress>;
}

/* =========================
 * Page 2
 * ========================= */

/**
 * Prior employment entry with optional gap explanation if there is a
 * >1 month gap before this job.
 *
 * NOTE: `salary` typed as `string | Date` in the original schema. If this is
 * actually monetary, consider switching to `string` (or a numeric cents field).
 */
export interface IEmploymentEntry {
  employerName: string;
  supervisorName: string;
  address: string;
  postalCode: string;
  city: string;
  stateOrProvince: string;
  phone1: string;
  phone2?: string;
  email: string;
  positionHeld: string;
  from: string | Date; // YYYY-MM-DD or Date
  to: string | Date; // YYYY-MM-DD or Date
  salary: string | Date; // TODO: confirm business intent for this field
  reasonForLeaving: string;
  subjectToFMCSR: boolean; // Yes/No
  safetySensitiveFunction: boolean; // Yes/No

  /**
   * Optional explanation for a gap in employment **before** this job.
   * Used if there is >1 month gap between the previous job's `to`
   * and this job's `from`.
   */
  gapExplanationBefore?: string;
}

export interface IApplicationFormPage2 {
  employments: IEmploymentEntry[];
}

/* =========================
 * Page 3
 * ========================= */

export interface IAccidentEntry {
  date: string | Date; // YYYY-MM-DD or Date
  natureOfAccident: string; // e.g., "Rear end", "Head-On"
  fatalities: number;
  injuries: number;
}

export interface ITrafficConvictionEntry {
  date: string | Date; // YYYY-MM-DD or Date
  location: string;
  charge: string;
  penalty: string;
}

export interface IEducation {
  gradeSchool: number; // Years completed
  college: number; // Years completed
  postGraduate: number; // Years completed
}

export interface ICanadianDailyHours {
  day: number;
  hours: number;
}

export interface ICanadianHoursOfService {
  dayOneDate: string | Date; // YYYY-MM-DD or Date
  dailyHours: ICanadianDailyHours[];
  totalHours?: number; // Computed/virtual on server
}
export interface IApplicationFormPage3 {
  accidentHistory: IAccidentEntry[];
  trafficConvictions: ITrafficConvictionEntry[];
  education: IEducation;
  canadianHoursOfService: ICanadianHoursOfService;
  // dateDayOne intentionally removed in favor of canadianHoursOfService.dayOneDate
}

/* =========================
 * Page 4
 * ========================= */

export interface ICriminalRecordEntry {
  offense: string;
  dateOfSentence: string | Date; // YYYY-MM-DD or Date
  courtLocation: string;
}

export interface IFastCard {
  fastCardNumber: string;
  fastCardExpiry: string | Date; // YYYY-MM-DD or Date
  fastCardFrontPhoto?: IPhoto;
  fastCardBackPhoto?: IPhoto;
}

/**
 * File-heavy page with conditional document requirements by country:
 * - Canadian applicants: health card; Fast Card optional; etc.
 * - US applicants: medical certification photos; either passport OR PR/citizenship.
 */
export interface IApplicationFormPage4 {
  // Criminal Record Table
  criminalRecords: ICriminalRecordEntry[];

  // Incorporation / Business Details (if any of these provided, enforce all)
  employeeNumber?: string;
  hstNumber?: string;
  businessNumber?: string;
  incorporatePhotos?: IPhoto[];
  hstPhotos?: IPhoto[];
  bankingInfoPhotos?: IPhoto[];

  // Medical / Identity (country-specific)
  healthCardPhotos?: IPhoto[]; // Canada
  medicalCertificationPhotos?: IPhoto[]; // US

  passportPhotos?: IPhoto[]; // Optional for US
  prPermitCitizenshipPhotos?: IPhoto[]; // Optional for US
  usVisaPhotos?: IPhoto[]; // Not needed for US citizens
  fastCard?: IFastCard; // Optional; typically Canada

  // Additional Info
  deniedLicenseOrPermit: boolean;
  suspendedOrRevoked: boolean;
  suspensionNotes?: string;

  testedPositiveOrRefused: boolean;
  completedDOTRequirements: boolean;
  hasAccidentalInsurance: boolean;
}

/* =========================
 * Page 5
 * ========================= */

export interface ICompetencyQuestionOption {
  id: string; // e.g., "a", "b", "c" or "1","2","3"
  value: string; // Display text, e.g., "30 km/h"
}

export interface ICompetencyQuestion {
  questionId: string;
  questionText: string;
  options: ICompetencyQuestionOption[];
  correctAnswerId: string; // e.g., "a"
}

export interface ICompetencyAnswer {
  questionId: string;
  answerId: string;
}

export interface IApplicationFormPage5 {
  answers: ICompetencyAnswer[];
  score: number;
}

/* =========================
 * Aggregate & Doc Types
 * ========================= */

export interface IApplicationForm {
  page1: IApplicationFormPage1;
  page2: IApplicationFormPage2;
  page3: IApplicationFormPage3;
  page4: IApplicationFormPage4;
  page5: IApplicationFormPage5;

  // Placeholders for future pages (6–12)
  page6: Record<string, string>;
  page7: Record<string, string>;
  page8: Record<string, string>;
  page9: Record<string, string>;
  page10: Record<string, string>;
  page11: Record<string, string>;
  page12: Record<string, string>;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * MongoDB hydrated document shape for ApplicationForm.
 */
export interface IApplicationFormDoc extends IApplicationForm, Document {}
