// lib/pdf/drive-test/mappers/on-road.mapper.ts
import type { PDFForm } from "pdf-lib";
import { IOnRoadAssessment, EDriveTestOverall, EExpectedStandard } from "@/types/driveTest.types";
import { EOnRoadFillableFormFields as F, type OnRoadFillablePayload } from "./on-road.types";
import { EDriverType, EHaulPreference, ETeamStatus } from "@/types/preQualifications.types";

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

type MapSectionArgs<K extends string> = {
  base: string; // e.g., "onroad_inmotion"
  items: Array<{ key: K; checked: boolean }>;
};

function mapSection<K extends string>({ base, items }: MapSectionArgs<K>): OnRoadFillablePayload {
  const out: OnRoadFillablePayload = {};
  for (const it of items) {
    const key = `${base}_${it.key}_checked` as keyof typeof F;
    out[key as F] = Boolean(it.checked);
  }
  return out;
}

function overallFlags(v: EDriveTestOverall) {
  return {
    pass: v === "pass",
    conditional: v === "conditional_pass",
    fail: v === "fail",
  };
}

function expectedFlags(v: EExpectedStandard) {
  return {
    e1: v === EExpectedStandard.NOT_SATISFACTORY,
    e2: v === EExpectedStandard.FAIR,
    e3: v === EExpectedStandard.SATISFACTORY,
    e4: v === EExpectedStandard.VERY_GOOD,
  };
}

export type PreQualSummary = {
  driverType?: EDriverType;
  teamStatus?: ETeamStatus;
  preferLocalDriving?: boolean;
  haulPreference?: EHaulPreference;
};

export type BuildOnRoadPayloadArgs = {
  onRoad: IOnRoadAssessment;

  // Header
  driverName: string;
  driverLicense: string;

  // Top-row Type & Role (from PreQualifications)
  preQual?: PreQualSummary;

  // Dates (default to onRoad.assessedAt)
  headerDate?: Date | string;
  examinerDate?: Date | string;
  driverDate?: Date | string;
};

/** Build payload for the On-Road template */
export function buildOnRoadFillablePayload({ onRoad, driverName, driverLicense, preQual, headerDate, examinerDate, driverDate }: BuildOnRoadPayloadArgs): OnRoadFillablePayload {
  const payload: OnRoadFillablePayload = {};

  // Header
  payload[F.HEADER_DRIVER_NAME] = driverName || "";
  payload[F.HEADER_DRIVER_LICENSE] = driverLicense || "";
  payload[F.HEADER_DATE] = fmt(headerDate) || fmt(onRoad.assessedAt);

  // Type
  if (preQual?.driverType) {
    payload[F.TYPE_COMPANY] = preQual.driverType === EDriverType.Company;
    payload[F.TYPE_OWNER_OPERATOR] = preQual.driverType === EDriverType.OwnerOperator;
    payload[F.TYPE_OWNER_DRIVER] = preQual.driverType === EDriverType.OwnerOperator;
  }

  // Role
  if (preQual?.teamStatus) {
    payload[F.ROLE_SINGLE] = preQual.teamStatus === ETeamStatus.Single;
    payload[F.ROLE_TEAM] = preQual.teamStatus === ETeamStatus.Team;
  }
  if (typeof preQual?.preferLocalDriving === "boolean") {
    payload[F.ROLE_CITY] = !!preQual.preferLocalDriving;
  }
  if (preQual?.haulPreference) {
    payload[F.ROLE_SHORT_RUNS] = preQual.haulPreference === EHaulPreference.ShortHaul;
  }

  // Expected Standards
  const es = expectedFlags(onRoad.expectedStandard);
  payload[F.FOOTER_EXPECTED_1] = es.e1;
  payload[F.FOOTER_EXPECTED_2] = es.e2;
  payload[F.FOOTER_EXPECTED_3] = es.e3;
  payload[F.FOOTER_EXPECTED_4] = es.e4;

  // Overall
  const ov = overallFlags(onRoad.overallAssessment);
  payload[F.FOOTER_OVERALL_PASS] = ov.pass;
  payload[F.FOOTER_OVERALL_CONDITIONAL_PASS] = ov.conditional;
  payload[F.FOOTER_OVERALL_FAIL] = ov.fail;

  // Comments
  if (onRoad.comments != null) {
    payload[F.FOOTER_COMMENTS] = String(onRoad.comments);
  }

  // Dates at bottom
  const assessed = fmt(onRoad.assessedAt);
  payload[F.EXAMINER_DATE] = fmt(examinerDate) || assessed;
  payload[F.DRIVER_DATE] = fmt(driverDate) || assessed;

  // Sections
  const s = onRoad.sections;
  Object.assign(
    payload,
    mapSection({ base: "onroad_inmotion", items: s.placingVehicleInMotion.items }),
    mapSection({ base: "onroad_highway", items: s.highwayDriving.items }),
    mapSection({ base: "onroad_turns", items: s.rightLeftTurns.items }),
    mapSection({ base: "onroad_defensive", items: s.defensiveDriving.items }),
    mapSection({ base: "onroad_gps", items: s.gps.items }),
    mapSection({ base: "onroad_traffic", items: s.operatingInTraffic.items })
  );

  return payload;
}

/** Apply payload to pdf-lib form */
export function applyOnRoadPayloadToForm(form: PDFForm, payload: OnRoadFillablePayload): void {
  for (const [name, value] of Object.entries(payload)) {
    try {
      if (typeof value === "boolean") {
        const cb = form.getCheckBox(name);
        if (value) cb.check();
        else (cb as any).uncheck?.();
        (cb as any).updateAppearances?.();
        continue;
      }
      const tf = form.getTextField(name);
      tf.setText(value == null ? "" : String(value));
    } catch {
      // Field missing/type mismatch — ignore
    }
  }
}
