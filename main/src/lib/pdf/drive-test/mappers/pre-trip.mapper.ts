// src/lib/pdf/drive-test/mappers/pre-trip.mapper.ts
import type { PDFForm } from "pdf-lib";
import { IPreTripAssessment, EDriveTestOverall, EExpectedStandard } from "@/types/driveTest.types";
import { EPreTripFillableFormFields as F, type PreTripFillablePayload } from "./pre-trip.types";

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

type MapSectionArgs<K extends string> = {
  base: string; // e.g. "pretrip.under_hood"
  items: Array<{ key: K; checked: boolean }>;
};

/** Build key/value pairs for a section (checkboxes only). Dotless for Sejda. */
function mapSection<K extends string>({ base, items }: MapSectionArgs<K>): PreTripFillablePayload {
  const out: PreTripFillablePayload = {};
  for (const it of items) {
    // Build "pretrip.under_hood.<item>.checked" then strip all dots -> "pretripunder_hood<item>checked"
    const flatName = `${base}.${it.key}.checked`.replaceAll(".", "") as unknown as F;
    out[flatName] = Boolean(it.checked);
  }
  return out;
}

function overallToFlags(overall: EDriveTestOverall): {
  pass: boolean;
  conditional: boolean;
  fail: boolean;
} {
  return {
    pass: overall === "pass",
    conditional: overall === "conditional_pass",
    fail: overall === "fail",
  };
}

function expectedStandardToFlags(std: EExpectedStandard): {
  notSatisfactory: boolean;
  fair: boolean;
  satisfactory: boolean;
  veryGood: boolean;
} {
  return {
    notSatisfactory: std === EExpectedStandard.NOT_SATISFACTORY,
    fair: std === EExpectedStandard.FAIR,
    satisfactory: std === EExpectedStandard.SATISFACTORY,
    veryGood: std === EExpectedStandard.VERY_GOOD,
  };
}

export type BuildPreTripPayloadArgs = {
  preTrip: IPreTripAssessment;

  // header (from ApplicationForm / external)
  driverName: string;
  driverLicense: string;
  examinerName?: string;

  // optional: if your template includes them
  powerUnitType?: string;
  trailerType?: string;

  // footer dates; if omitted, both default to preTrip.assessedAt
  examinerDate?: Date | string;
  driverDate?: Date | string;
};

/**
 * Build a payload for the Pre-Trip template (dotless field names):
 * - Header: driver_name / driver_license / examiner_name
 * - Sections: only `.checked` fields (auto-flattened)
 * - Footer: expected standards (4), overall (3), comments, optional equipment, dates
 */
export function buildPreTripFillablePayload({
  preTrip,
  driverName,
  driverLicense,
  examinerName,
  powerUnitType,
  trailerType,
  examinerDate,
  driverDate,
}: BuildPreTripPayloadArgs): PreTripFillablePayload {
  const payload: PreTripFillablePayload = {};

  // Header
  payload[F.DRIVER_NAME] = driverName || "";
  payload[F.DRIVER_LICENSE] = driverLicense || "";
  if (examinerName) payload[F.EXAMINER_NAME] = examinerName;

  // Optional equipment
  if (powerUnitType) payload[F.POWER_UNIT_TYPE] = powerUnitType;
  if (trailerType) payload[F.TRAILER_TYPE] = trailerType;

  // Footer - Expected Standards (four checkboxes)
  const stdFlags = expectedStandardToFlags(preTrip.expectedStandard);
  payload[F.EXPECTED_1_NOT_SATISFACTORY] = stdFlags.notSatisfactory;
  payload[F.EXPECTED_2_FAIR] = stdFlags.fair;
  payload[F.EXPECTED_3_SATISFACTORY] = stdFlags.satisfactory;
  payload[F.EXPECTED_4_VERY_GOOD] = stdFlags.veryGood;

  // Footer - Overall (three explicit checkboxes)
  const flags = overallToFlags(preTrip.overallAssessment);
  payload[F.OVERALL_PASS] = flags.pass;
  payload[F.OVERALL_CONDITIONAL_PASS] = flags.conditional;
  payload[F.OVERALL_FAIL] = flags.fail;

  // Footer - Comments
  if (preTrip.comments != null) {
    payload[F.COMMENTS] = String(preTrip.comments);
  }

  // Dates
  const assessedStr = fmt(preTrip.assessedAt);
  payload[F.EXAMINER_DATE] = fmt(examinerDate) || assessedStr;
  payload[F.DRIVER_DATE] = fmt(driverDate) || assessedStr;

  // Sections (build dot notation then strip dots to match Sejda)
  const { sections } = preTrip;
  Object.assign(
    payload,
    mapSection({ base: "pretrip.under_hood", items: sections.underHood.items }),
    mapSection({ base: "pretrip.outside_inspection", items: sections.outside.items }),
    mapSection({ base: "pretrip.uncoupling", items: sections.uncoupling.items }),
    mapSection({ base: "pretrip.coupling", items: sections.coupling.items }),
    mapSection({ base: "pretrip.air_system", items: sections.airSystem.items }),
    mapSection({ base: "pretrip.in_cab", items: sections.inCab.items }),
    mapSection({ base: "pretrip.backing_up", items: sections.backingUp.items })
  );

  return payload;
}

/**
 * Apply payload to a pdf-lib form.
 * - Sets TextFields (string) and CheckBoxes (boolean).
 * - Safely ignores fields not present in the PDF.
 */
export function applyPreTripPayloadToForm(form: PDFForm, payload: PreTripFillablePayload): void {
  for (const [name, value] of Object.entries(payload)) {
    try {
      if (typeof value === "boolean") {
        const cb = form.getCheckBox(name);
        if (value) {
          cb.check();
        } else {
          if (typeof (cb as any).uncheck === "function") (cb as any).uncheck();
        }
        if (typeof (cb as any).updateAppearances === "function") (cb as any).updateAppearances();
        continue;
      }
      const tf = form.getTextField(name);
      tf.setText(value == null ? "" : String(value));
    } catch {
      // Field not found or type mismatch – ignore
    }
  }
}
