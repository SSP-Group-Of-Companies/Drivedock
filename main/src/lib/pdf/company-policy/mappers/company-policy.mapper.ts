import path from "node:path";
import type { PDFForm } from "pdf-lib";
import { ECompanyId } from "@/constants/companies";
import { ECompanyPolicyFillableFormFields as F, type CompanyPolicyPayload } from "./company-policy.types";

/* ------------------------------- helpers ------------------------------- */

type MaybeDate = Date | string | null | undefined;

const pad2 = (n: number) => String(n).padStart(2, "0");

function asDate(d: MaybeDate): Date | undefined {
  if (!d) return undefined;
  const v = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(v.getTime()) ? undefined : v;
}

/** YYYY-MM-DD (UTC, date-only) */
function fmt(date: MaybeDate): string {
  const d = asDate(date);
  if (!d) return "";
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** resolve which template to load (same fields across all) */
export function resolveCompanyPolicyTemplate(companyId?: string): string {
  const base = path.join(process.cwd(), "src/lib/pdf/company-policy/templates");

  switch (companyId) {
    case ECompanyId.SSP_CA:
      return path.join(base, "company-policy-ssp-ca-fillable.pdf");
    case ECompanyId.SSP_US:
      return path.join(base, "company-policy-ssp-us-fillable.pdf");
    case ECompanyId.FELLOW_TRANS:
      return path.join(base, "company-policy-fellows-fillable.pdf");
    case ECompanyId.NESH:
      return path.join(base, "company-policy-new-england-fillable.pdf");
    case ECompanyId.WEB_FREIGHT:
      return path.join(base, "company-policy-webfreight-fillable.pdf");
    default:
      // fallback
      return path.join(base, "company-policy-ssp-ca-fillable.pdf");
  }
}

/* -------------------------------- types -------------------------------- */

export type BuildCompanyPolicyPayloadArgs = {
  // Core identity
  driverFullName: string;
  companyContactName?: string; // “inform ____ if my medical status changes”
  witnessName?: string; // safety admin name (printed on Pg2, Pg11, Pg22)
  isOwnerOperator?: boolean;

  // IPASS / Toll
  ipassDate?: MaybeDate;
  ipassTruckNumber?: string; // from applicationForm.page4.truckDetails.truckUnitNumber

  // Speed Locker policy
  speedTruckYear?: string; // from applicationForm.page4.truckDetails.year
  speedVIN?: string; // from applicationForm.page4.truckDetails.vin
  ownerOperatorName?: string;

  // Dates (driver + witness where applicable)
  acknowledgementDate?: MaybeDate; // pg 4 (driver)
  requirementsDate?: MaybeDate; // pg 11 (driver & witness)
  medicalWitnessDate?: MaybeDate; // pg 2 (witness)
  finalAckDate?: MaybeDate; // pg 22 (driver & witness)
};

/* ------------------------------- builder ------------------------------- */

export function buildCompanyPolicyPayload({
  driverFullName,
  companyContactName,
  witnessName,
  isOwnerOperator,
  ipassDate,
  ipassTruckNumber,
  speedTruckYear,
  speedVIN,
  ownerOperatorName,
  acknowledgementDate,
  requirementsDate,
  medicalWitnessDate,
  finalAckDate,
}: BuildCompanyPolicyPayloadArgs): CompanyPolicyPayload {
  const name = driverFullName || "";
  const payload: CompanyPolicyPayload = {};

  /* Pg 1 – Medical */
  payload[F.MD_DRIVER_NAME_TEXT] = name;
  payload[F.MD_INFORM_CONTACT_NAME] = companyContactName || "";
  payload[F.MD_DRIVER_NAME_PRINT] = name;
  // MD_DRIVER_SIGNATURE is drawn (image)

  /* Pg 2 – Medical Witness (name + date) */
  payload[F.MD_WITNESS_NAME] = witnessName || "";
  payload[F.MD_WITNESS_DATE] = fmt(medicalWitnessDate);

  /* Pg 4 – Policy Acknowledgement */
  payload[F.ACK_DRIVER_NAME_TEXT] = name;
  payload[F.ACK_DRIVER_NAME_PRINT] = name;
  payload[F.ACK_DATE] = fmt(acknowledgementDate);

  /* Pg 11 – Requirements Acknowledgement (driver + witness) */
  payload[F.REQ_ACK_DRIVER_NAME] = name;
  payload[F.REQ_ACK_DATE] = fmt(requirementsDate);
  payload[F.REQ_ACK_WITNESS_NAME] = witnessName || "";
  payload[F.REQ_ACK_WITNESS_DATE] = fmt(requirementsDate);

  /* Pg 16 – IPASS / Toll Transponder Agreement */
  payload[F.IPASS_DATE] = fmt(ipassDate);
  payload[F.IPASS_DRIVER_NAME] = name;
  payload[F.IPASS_TRUCK_NUMBER] = ipassTruckNumber || "";

  /* Pg 17 – Speed Locker Policy */
  if (isOwnerOperator) {
    payload[F.SPEED_DRIVER_NAME_TEXT] = name;
    payload[F.SPEED_TRUCK_YEAR] = speedTruckYear || "";
    payload[F.SPEED_VIN] = speedVIN || "";
    payload[F.SPEED_OWNER_OPERATOR_NAME] = ownerOperatorName || name;
  }

  /* Pg 22 – Final Acknowledgement (driver + witness) */
  payload[F.FINAL_DRIVER_NAME] = name;
  payload[F.FINAL_DRIVER_DATE] = fmt(finalAckDate);
  payload[F.FINAL_WITNESS_NAME] = witnessName || "";
  payload[F.FINAL_WITNESS_DATE] = fmt(finalAckDate);

  return payload;
}

/* ------------------------------- applier ------------------------------- */

export function applyCompanyPolicyPayloadToForm(form: PDFForm, payload: CompanyPolicyPayload): void {
  for (const [name, value] of Object.entries(payload)) {
    if (value == null) continue;
    try {
      form.getTextField(name).setText(value);
    } catch {
      // ignore missing / non-text fields
    }
  }
}
