// src/lib/pdf/road-test-certificate/mappers/road-test-certificate.mapper.ts
import type { PDFForm } from "pdf-lib";
import { ERoadTestCertificateFillableFormFields as F, type RoadTestCertificatePayload } from "./road-test-certificate.types";
import path from "node:path";
import { ECompanyId } from "@/constants/companies";

/* ------------------------------- helpers ------------------------------- */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function asDate(d?: Date | string): Date | undefined {
  if (!d) return undefined;
  const v = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(v.getTime()) ? undefined : v;
}

/** YYYY-MM-DD */
function fmtYMD(d?: Date | string): string {
  const v = asDate(d);
  if (!v) return "";
  return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
}

/** e.g., "March 12" */
function fmtMonthDayText(d?: Date | string): string {
  const v = asDate(d);
  if (!v) return "";
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[v.getMonth()]} ${v.getDate()}`;
}

/** last two digits of year, e.g., "24" for 2024 */
function fmtTwoDigitYear(d?: Date | string): string {
  const v = asDate(d);
  if (!v) return "";
  return String(v.getFullYear()).slice(-2);
}

/* -------------------------------- types -------------------------------- */

export type BuildRoadTestCertificateArgs = {
  // From application form
  driverName: string;
  sin?: string;

  // From application form (license)
  cdlNumber?: string;
  cdlStateProvince?: string;

  // From DriveTest wrapper
  powerUnitType?: string;
  trailerType?: string;

  // From On-Road assessment
  assessedAt?: Date | string;
  milesKmsDriven?: number | string;

  // Signature date (usually same as assessedAt; route can override)
  examinerDate?: Date | string;
};

/* ------------------------------- builder ------------------------------- */

export function buildRoadTestCertificatePayload({
  driverName,
  sin,
  cdlNumber,
  cdlStateProvince,
  powerUnitType,
  trailerType,
  assessedAt,
  milesKmsDriven,
  examinerDate,
}: BuildRoadTestCertificateArgs): RoadTestCertificatePayload {
  const payload: RoadTestCertificatePayload = {};

  // Header / identity
  payload[F.DRIVER_NAME] = driverName || "";
  payload[F.SOCIAL_INSURANCE_NUMBER] = sin || "";

  // License
  payload[F.CDL_NUMBER] = cdlNumber || "";
  payload[F.CDL_STATE_PROVINCE] = cdlStateProvince || "";

  // Equipment
  payload[F.POWER_UNIT_TYPE] = powerUnitType || "";
  payload[F.TRAILER_TYPE] = trailerType || "";

  // Body (date + distance)
  payload[F.TEST_DATE_MONTH_DAY_TEXT] = fmtMonthDayText(assessedAt);
  payload[F.TEST_DATE_YEAR] = fmtTwoDigitYear(assessedAt);
  payload[F.DRIVING_DISTANCE_MILES_KM] = milesKmsDriven == null ? "" : String(milesKmsDriven);

  // Footer date (defaults to assessedAt)
  payload[F.EXAMINER_DATE] = fmtYMD(examinerDate) || fmtYMD(assessedAt);

  return payload;
}

/* ------------------------------- applier ------------------------------- */

export function applyRoadTestCertificatePayloadToForm(form: PDFForm, payload: RoadTestCertificatePayload): void {
  for (const [name, value] of Object.entries(payload)) {
    try {
      const tf = form.getTextField(name);
      tf.setText(value == null ? "" : String(value));
    } catch {
      // Field missing/type mismatch — keep resilient
    }
  }
}

/* -------------------------- template resolver -------------------------- */

/**
 * Resolve the correct Road Test Certificate PDF template for a company.
 * Falls back to SSP-CA if the company is unknown.
 */
export function resolveRoadTestCertificateTemplate(companyId?: string): string {
  const base = path.join(process.cwd(), "src/lib/pdf/road-test-certificate/templates");

  switch (companyId as ECompanyId | undefined) {
    case ECompanyId.SSP_CA:
      return path.join(base, "road-test-certificate-ssp-ca-fillable.pdf");
    case ECompanyId.SSP_US:
      return path.join(base, "road-test-certificate-ssp-us-fillable.pdf");
    case ECompanyId.FELLOW_TRANS:
      return path.join(base, "road-test-certificate-fellows-fillable.pdf");
    case ECompanyId.NESH:
      return path.join(base, "road-test-certificate-new-england-fillable.pdf");
    case ECompanyId.WEB_FREIGHT:
      return path.join(base, "road-test-certificate-webfreight-fillable.pdf");
    default:
      return path.join(base, "road-test-certificate-ssp-ca-fillable.pdf");
  }
}
