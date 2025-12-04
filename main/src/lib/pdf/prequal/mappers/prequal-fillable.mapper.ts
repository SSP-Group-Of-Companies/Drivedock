import type { PDFForm } from "pdf-lib";
import { EPrequalFillableFields as F, type PrequalPayload } from "./prequal-fillable.types";

import { EDriverType, EHaulPreference, ETeamStatus, IPreQualifications } from "@/types/preQualifications.types";
import { IApplicationFormPage1 } from "@/types/applicationForm.types";
import { IOnboardingTracker } from "@/types/onboardingTracker.types";
import { ECompanyId } from "@/constants/companies";
import path from "node:path";

/* ------------------------------- helpers ------------------------------- */

// resolve which Pre-Qualification template to load (same fields across all)
export function resolvePrequalTemplate(companyId: string) {
  const base = path.join(process.cwd(), "src/lib/pdf/prequal/templates");

  switch (companyId as ECompanyId) {
    case ECompanyId.SSP_CA:
    case ECompanyId.SSP_US:
      // SSP Canada + SSP US share the same prequal template
      return path.join(base, "ssp-prequal-fillable.pdf");

    case ECompanyId.FELLOW_TRANS:
      return path.join(base, "fellows-prequal-fillable.pdf");

    case ECompanyId.WEB_FREIGHT:
      return path.join(base, "webfreight-prequal-fillable.pdf");

    case ECompanyId.NESH:
      return path.join(base, "new-england-prequal-fillable.pdf");

    default:
      // Safe fallback – SSP prequal
      return path.join(base, "ssp-prequal-fillable.pdf");
  }
}

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

function splitPhone3(p?: string | null) {
  const out = { p1: "", p2: "", p3: "" };
  if (!p) return out;

  // Keep digits only; handle formats like "+1 (416) 555-1234"
  const digits = String(p).replace(/\D+/g, "");
  // If it starts with country code 1 and 11 digits, drop leading '1'
  const d = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (d.length >= 10) {
    out.p1 = d.slice(0, 3);
    out.p2 = d.slice(3, 6);
    out.p3 = d.slice(6, 10);
  } else if (d.length > 0) {
    // Best-effort partial fill
    out.p1 = d.slice(0, 3);
    out.p2 = d.slice(3, 6);
    out.p3 = d.slice(6);
  }
  return out;
}

/* --------------------------- category mapping -------------------------- */

function mapCategory(payload: PrequalPayload, preq: IPreQualifications) {
  // Driver type
  payload[F.CAT_COMPANY_DRIVER_CHECKED] = preq.driverType === EDriverType.Company;
  payload[F.CAT_OWNER_OPERATOR_CHECKED] = preq.driverType === EDriverType.OwnerOperator;
  payload[F.CAT_OWNER_OPERATOR_DRIVER_CHECKED] = preq.driverType === EDriverType.OwnerDriver;

  // Haul preference
  const isShort = preq.haulPreference === EHaulPreference.ShortHaul;
  const isLong = preq.haulPreference === EHaulPreference.LongHaul;

  payload[F.CAT_SHORT_HAUL_CHECKED] = isShort;
  payload[F.CAT_LONG_HAUL_CHECKED] = isLong;

  // "Local" is a reasonable derivative of Short Haul
  payload[F.CAT_LOCAL_CHECKED] = isShort;

  // "Switches" not inferable — leave false
  payload[F.CAT_SWITCHES_CHECKED] = false;

  // Team / Single
  payload[F.CAT_TEAM_CHECKED] = preq.teamStatus === ETeamStatus.Team;
  payload[F.CAT_SINGLE_CHECKED] = preq.teamStatus === ETeamStatus.Single;
}

/* ------------------------ qualification mapping ------------------------ */

function yesNo(payload: PrequalPayload, yesField: F, noField: F, val?: boolean) {
  if (val === undefined) return; // leave both unchecked if truly unknown
  payload[yesField] = !!val;
  payload[noField] = !val;
}

/**
 * Build payload from three sources:
 *  - tracker: for createdAt and approval logic
 *  - page1: name + phone
 *  - preq: all qualification booleans and categories
 */
export function buildPrequalPayload(opts: {
  tracker: Pick<IOnboardingTracker, "createdAt" | "status" | "terminated">;
  page1: Pick<IApplicationFormPage1, "firstName" | "lastName" | "phoneCell" | "phoneHome">;
  preq: IPreQualifications;
  safetyAdminName?: string; // filled only if approved
}) {
  const { tracker, page1, preq, safetyAdminName } = opts;

  const fullName = [page1.firstName, page1.lastName].filter(Boolean).join(" ").trim();
  const phone = page1.phoneCell || page1.phoneHome || "";
  const p3 = splitPhone3(phone);
  const appDate = fmt(tracker.createdAt);
  const completionDate = fmt(tracker.status?.completionDate); // APPROVED_BY_DATE (only if approved)

  const payload: PrequalPayload = {
    [F.DRIVER_NAME]: fullName,
    [F.PHONE_1]: p3.p1,
    [F.PHONE_2]: p3.p2,
    [F.PHONE_3]: p3.p3,
    [F.DATE]: appDate,

    [F.NOTES]: "",
    [F.WAIVER_FOR]: "",
    [F.REASON_FOR_WAIVER]: "",
  };

  // Category
  mapCategory(payload, preq);

  // Qualifications (YES/NO pairs)
  yesNo(payload, F.Q_OVER_23_LOCAL_YES, F.Q_OVER_23_LOCAL_NO, preq.over23Local);
  yesNo(payload, F.Q_OVER_25_XBORDER_YES, F.Q_OVER_25_XBORDER_NO, preq.over25CrossBorder);
  yesNo(payload, F.Q_DRIVE_MANUAL_YES, F.Q_DRIVE_MANUAL_NO, preq.canDriveManual);

  // "at least 2 years verifiable experience driving tractor/trailer"
  yesNo(payload, F.Q_EXP_2Y_TT_YES, F.Q_EXP_2Y_TT_NO, preq.experienceDrivingTractorTrailer);

  // "any at-fault accident in past 3 years" → our boolean is positive presence
  yesNo(payload, F.Q_AT_FAULT_3Y_YES, F.Q_AT_FAULT_3Y_NO, preq.faultAccidentIn3Years);

  // "more than 2 points on abstract" ⇄ our value is "zeroPointsOnAbstract"
  if (typeof preq.zeroPointsOnAbstract === "boolean") {
    const hasMoreThan2 = preq.zeroPointsOnAbstract; // invert
    yesNo(payload, F.Q_MORE_THAN_2PTS_YES, F.Q_MORE_THAN_2PTS_NO, hasMoreThan2);
  }

  // "any criminal record for which pardon has not been granted"
  if (typeof preq.noUnpardonedCriminalRecord === "boolean") {
    const hasUnpardoned = preq.noUnpardonedCriminalRecord;
    yesNo(payload, F.Q_UNPARDONED_RECORD_YES, F.Q_UNPARDONED_RECORD_NO, hasUnpardoned);
  }

  yesNo(payload, F.Q_LEGAL_RIGHT_WORK_CA_YES, F.Q_LEGAL_RIGHT_WORK_CA_NO, preq.legalRightToWorkCanada);

  // Country-specific optionals
  if (typeof preq.canCrossBorderUSA === "boolean") {
    yesNo(payload, F.Q_CROSS_BORDER_USA_YES, F.Q_CROSS_BORDER_USA_NO, preq.canCrossBorderUSA);
  }
  if (typeof preq.hasFASTCard === "boolean") {
    yesNo(payload, F.Q_HAS_FAST_YES, F.Q_HAS_FAST_NO, preq.hasFASTCard);
  }

  // Office Use Only — approval
  const approved = !!(tracker.status?.completed && !tracker.terminated);
  const denied = !!tracker.terminated;

  payload[F.APPROVED_TO_JOIN_YES] = approved;
  payload[F.APPROVED_TO_JOIN_NO] = denied;

  // Approved By (ONLY when approved)
  if (approved) {
    payload[F.APPROVED_BY_NAME] = safetyAdminName || "";
    payload[F.APPROVED_BY_DATE] = completionDate;
  } else {
    payload[F.APPROVED_BY_NAME] = "";
    payload[F.APPROVED_BY_DATE] = "";
  }

  // By (ALWAYS filled)
  payload[F.BY_NAME] = safetyAdminName || "";
  payload[F.BY_DATE] = appDate;

  return payload;
}

/** Apply payload to pdf-lib form */
export function applyPrequalPayloadToForm(form: PDFForm, payload: PrequalPayload) {
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
          continue;
        }
      }
      const tf = form.getTextField(name);
      tf.setText(value as string);
    } catch {
      // ignore missing fields
    }
  }
}
