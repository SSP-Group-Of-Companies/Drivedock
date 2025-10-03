// lib/pdf/hiring-application/mappers/hiring-application.mapper.ts
import path from "node:path";
import { ECompanyId, getCompanyById } from "@/constants/companies";
import { EDriverApplicationFillableFormFields as F } from "@/lib/pdf/hiring-application/mappers/hiring-application.types";
import { IApplicationFormDoc } from "@/types/applicationForm.types";
import { ETerminationType, IOnboardingTrackerDoc } from "@/types/onboardingTracker.types";
import { IPoliciesConsentsDoc } from "@/types/policiesConsents.types";
import { EDriverType, IPreQualificationsDoc } from "@/types/preQualifications.types";
import { SafetyAdmin } from "@/constants/safetyAdmins";

/*
 * ======================================================================
 * Mapper → builds a flat dictionary keyed by PDF field names.
 * - Dates: form/application → onboarding.createdAt
 * - Signature dates (driver & witness) → policiesConsents.signedAt (fallback: onboarding.createdAt)
 * - Driver signature image: policiesConsents.signature (string | data URL)
 * - Witness signature image: safetyAdmin.signature (string | data URL)
 * ======================================================================
 */

export interface BuildHiringPdfMapArgs {
  onboarding: IOnboardingTrackerDoc;
  application: IApplicationFormDoc;
  prequals: IPreQualificationsDoc | null;
  policies: IPoliciesConsentsDoc | null;
  safetyAdmin: SafetyAdmin | null; // used for witness fields
}

export type PdfFieldMap = Partial<Record<F, string | boolean>>;

// ------------------------- date helpers (standardized) -------------------------
const asName = (first?: string, last?: string) => [first, last].filter(Boolean).join(" ");

const toDateOrNull = (d: Date | string | number | null | undefined): Date | null => {
  if (!d) return null;
  try {
    const dt = new Date(d as any);
    return isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
};

const fmtDDMMYYYY = (d?: Date | string | number | null): string => {
  const dt = toDateOrNull(d);
  if (!dt) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = String(dt.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

const fmtMMYYYY = (d?: Date | string | number | null): string => {
  const dt = toDateOrNull(d);
  if (!dt) return "";
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = String(dt.getFullYear());
  return `${mm}/${yyyy}`;
};

const ymd = (d: Date | string | undefined | null) => (d ? new Date(d as any) : new Date());

const splitDMY = (d: Date | string | undefined | null) => {
  const dt = ymd(d);
  return {
    d: String(dt.getDate()).padStart(2, "0"),
    m: String(dt.getMonth() + 1).padStart(2, "0"),
    y: String(dt.getFullYear()),
  };
};

const first = <T>(arr?: T[]) => (Array.isArray(arr) && arr.length ? arr[0] : undefined);

const getFormDateParts = (onboarding: IOnboardingTrackerDoc) => splitDMY(onboarding.createdAt);

const getSignDateParts = (policies: IPoliciesConsentsDoc | null, onboarding: IOnboardingTrackerDoc) => {
  const when = (policies as any)?.signedAt ?? onboarding.createdAt;
  return splitDMY(when);
};

/**
 * Split a string into N roughly equal parts.
 * Example: splitIntoParts("12345", 3) → ["12", "34", "5"]
 */
function splitIntoParts(str: string, parts: number): string[] {
  if (!str) return Array(parts).fill("");
  if (parts <= 1) return [str];

  const len = str.length;
  const baseSize = Math.floor(len / parts);
  const extra = len % parts;

  const result: string[] = [];
  let cursor = 0;

  for (let i = 0; i < parts; i++) {
    const size = baseSize + (i < extra ? 1 : 0);
    result.push(str.slice(cursor, cursor + size));
    cursor += size;
  }

  return result;
}

// resolve which template to load (same fields across all)
export function resolveHiringTemplate(companyId: string) {
  const base = path.join(process.cwd(), "src/lib/pdf/hiring-application/templates");
  switch (companyId as ECompanyId) {
    case ECompanyId.SSP_CA:
      return path.join(base, "ssp-hiring-application-ca-fillable.pdf");
    case ECompanyId.SSP_US:
      return path.join(base, "ssp-hiring-application-us-fillable.pdf");
    case ECompanyId.FELLOW_TRANS:
      return path.join(base, "fellows-hiring-application-fillable.pdf");
    case ECompanyId.WEB_FREIGHT:
      return path.join(base, "web-freight-hiring-application-fillable.pdf");
    case ECompanyId.NESH:
      return path.join(base, "new-england-hiring-application-fillable.pdf");
    default:
      return path.join(base, "ssp-hiring-application-ca-fillable.pdf");
  }
}

// ------------------------- main mapper -------------------------
export function buildHiringApplicationFieldMap({ onboarding, application, prequals, policies, safetyAdmin }: BuildHiringPdfMapArgs): PdfFieldMap {
  const p1 = application.page1;
  const p2 = application.page2;
  const p3 = application.page3;
  const p4 = application.page4;
  const p5 = application.page5;

  const name = asName(p1.firstName, p1.lastName);
  const az = first(p1.licenses);

  const formDMY = getFormDateParts(onboarding);
  const signDMY = getSignDateParts(policies, onboarding);

  const addr = p1.addresses || [];
  const curr = addr[0];
  const prev1 = addr[1];
  const prev2 = addr[2];

  const workedBefore = !!p2?.workedWithCompanyBefore;
  const preferLocal = !!prequals?.preferLocalDriving; // derives Western Canada availability
  const legalRight = prequals?.legalRightToWorkCanada === true;
  const legalRightNo = prequals?.legalRightToWorkCanada === false;

  const hasFast = !!p4?.fastCard?.fastCardNumber;

  const [azP1, azP2, azP3] = splitIntoParts(az?.licenseNumber || "", 3);
  const [sinP1, sinP2, sinP3] = splitIntoParts(String(p1.sin || ""), 3);

  const appliedForDriverPosition = prequals?.driverType === EDriverType.Company;

  const hasAccidentalInsurance = !!application.page4?.hasAccidentalInsurance;

  const map: PdfFieldMap = {
    /* =========================
     * Page 1 - Data Entry Form
     * ========================= */
    [F.DRIVER_NAME]: name,
    [F.DL_NUMBER]: az?.licenseNumber || "",
    [F.LICENSE_TYPE]: az?.licenseType || "",
    // Single date fields without a specific format comment -> dd/mm/yyyy
    [F.DL_EXPIRY]: fmtDDMMYYYY(az?.licenseExpiry),
    [F.SIN_ISSUE_DATE]: fmtDDMMYYYY(p1.sinIssueDate),
    [F.LICENSE_ISSUE_PROVINCE]: az?.licenseStateOrProvince || "",
    [F.DOB]: fmtDDMMYYYY(p1.dob),
    [F.FORM_DATE]: `${formDMY.d}/${formDMY.m}/${formDMY.y}`,

    /* ================================
     * Page 2 - Instructions & Acknowledgement
     * ================================ */
    [F.ACKNOWLEDGEMENT_NAME]: name,
    [F.ACKNOWLEDGEMENT_SIGNATURE]: (policies as any)?.signature?.url || "",
    [F.ACKNOWLEDGEMENT_DATE_DAY]: signDMY.d,
    [F.ACKNOWLEDGEMENT_DATE_MONTH]: signDMY.m,
    [F.ACKNOWLEDGEMENT_DATE_YEAR]: signDMY.y,

    /* =========================
     * Page 3 - Application Form (identity, addresses, quick Qs)
     * ========================= */
    [F.POSITION_DRIVER_CHECKED]: appliedForDriverPosition,
    [F.POSITION_OWNER_OPERATOR_CHECKED]: !appliedForDriverPosition,

    [F.APPLICATION_DATE_DAY]: formDMY.d,
    [F.APPLICATION_DATE_MONTH]: formDMY.m,
    [F.APPLICATION_DATE_YEAR]: formDMY.y,

    [F.APPLICANT_NAME]: name,

    // SIN shown in multiple places on the PDF (split into 3 parts)
    [F.SIN_NUMBER_P1]: sinP1,
    [F.SIN_NUMBER_P2]: sinP2,
    [F.SIN_NUMBER_P3]: sinP3,

    // License fields (multi-place echo on PDF, split into 3 parts)
    [F.LICENSE_NUMBER_P1]: azP1,
    [F.LICENSE_NUMBER_P2]: azP2,
    [F.LICENSE_NUMBER_P3]: azP3,

    // Split-out license/date-of-birth fields used on this page
    [F.LICENSE_PROVINCE]: az?.licenseStateOrProvince || "",
    [F.LICENSE_EXPIRY_DATE_DAY]: splitDMY(az?.licenseExpiry).d,
    [F.LICENSE_EXPIRY_DATE_MONTH]: splitDMY(az?.licenseExpiry).m,
    [F.LICENSE_EXPIRY_DATE_YEAR]: splitDMY(az?.licenseExpiry).y,
    [F.DOB_DAY]: splitDMY(p1.dob).d,
    [F.DOB_MONTH]: splitDMY(p1.dob).m,
    [F.DOB_YEAR]: splitDMY(p1.dob).y,

    [F.PROOF_OF_AGE_PROVIDED]: p1.canProvideProofOfAge ? true : false,

    [F.LEGAL_RIGHT_TO_WORK_YES]: legalRight ? true : false,
    [F.LEGAL_RIGHT_TO_WORK_NO]: legalRightNo ? true : false,

    // have you worked with the company before?
    [F.WORKED_WITH_COMPANY_BEFORE_YES]: workedBefore ? true : false,
    [F.WORKED_WITH_COMPANY_BEFORE_NO]: !workedBefore ? true : false,

    // if yes, when? (enum comments say mm/yyyy)
    [F.WORKWCOMP_PREV_FROM]: fmtMMYYYY(p2?.previousWorkDetails?.from),
    [F.WORKWCOMP_PREV_TO]: fmtMMYYYY(p2?.previousWorkDetails?.to),
    [F.WORKWCOMP_PREV_RATE]: p2?.previousWorkDetails?.rateOfPay || "",
    [F.WORKWCOMP_PREV_POSITION]: p2?.previousWorkDetails?.position || "",
    [F.WORKWCOMP__PREV_REASON_FOR_LEAVING]: p2?.reasonForLeavingCompany || "",

    // are you currently employed?
    [F.CURRENTLY_EMPLOYED]: p2?.currentlyEmployed ? true : false,
    [F.REFERRAL_SOURCE]: p2?.referredBy || "",
    [F.EXPECTED_PAY_RATE]: p2?.expectedRateOfPay || "",

    // Western Canada availability (derived from prequal preferLocalDriving)
    [F.AVAILABLE_WESTERN_CANADA_YES]: preferLocal ? true : false,
    [F.AVAILABLE_WESTERN_CANADA_NO]: !preferLocal ? true : false,

    // FAST Card block (page 3)
    [F.HAS_FAST_CARD_YES]: hasFast ? true : false,
    [F.HAS_FAST_CARD_NO]: !hasFast ? true : false,
    [F.FAST_CARD_NUMBER]: p4?.fastCard?.fastCardNumber || "",

    // Contact info + emergency contact
    [F.HOME_PHONE]: p1.phoneHome || "",
    [F.CELL_PHONE]: p1.phoneCell || "",
    [F.EMAIL]: p1.email || "",
    [F.EMERGENCY_CONTACT_NAME]: p1.emergencyContactName || "",
    [F.EMERGENCY_CONTACT_PHONE]: p1.emergencyContactPhone || "",

    // Addresses (current + two previous) -> mm/yyyy per enum comments
    [F.CURRENT_ADDRESS_ADDRESS]: curr?.address || "",
    [F.CURRENT_ADDRESS_CITY]: curr?.city || "",
    [F.CURRENT_ADDRESS_STATE]: curr?.stateOrProvince || "",
    [F.CURRENT_ADDRESS_POSTAL_CODE]: curr?.postalCode || "",
    [F.CURRENT_ADDRESS_FROM]: fmtMMYYYY(curr?.from),
    [F.CURRENT_ADDRESS_TO]: fmtMMYYYY(curr?.to),

    [F.PREVIOUS_ADDRESS_1_ADDRESS]: prev1?.address || "",
    [F.PREVIOUS_ADDRESS_1_CITY]: prev1?.city || "",
    [F.PREVIOUS_ADDRESS_1_STATE]: prev1?.stateOrProvince || "",
    [F.PREVIOUS_ADDRESS_1_POSTAL_CODE]: prev1?.postalCode || "",
    [F.PREVIOUS_ADDRESS_1_FROM]: fmtMMYYYY(prev1?.from),
    [F.PREVIOUS_ADDRESS_1_TO]: fmtMMYYYY(prev1?.to),

    [F.PREVIOUS_ADDRESS_2_ADDRESS]: prev2?.address || "",
    [F.PREVIOUS_ADDRESS_2_CITY]: prev2?.city || "",
    [F.PREVIOUS_ADDRESS_2_STATE]: prev2?.stateOrProvince || "",
    [F.PREVIOUS_ADDRESS_2_POSTAL_CODE]: prev2?.postalCode || "",
    [F.PREVIOUS_ADDRESS_2_FROM]: fmtMMYYYY(prev2?.from),
    [F.PREVIOUS_ADDRESS_2_TO]: fmtMMYYYY(prev2?.to),

    // Optional text area
    [F.JOB_LIMITATION_NOTES]: "",
  };

  // ---------------- Employment page (current + prev up to 7) ----------------
  const emps = [...(p2?.employments || [])].sort((a, b) => new Date(b.to as any).getTime() - new Date(a.to as any).getTime());
  const r = (i: number) => emps[i];

  const asSalary = (v: unknown) => String(v ?? "");
  const asBool = (v: unknown) => (v ? true : false);

  // CURRENT
  (function fillCurrent(e?: (typeof emps)[number]) {
    if (!e) return;
    Object.assign(map, {
      [F.CURRENT_EMPLOYER_NAME]: e.employerName,
      [F.CURRENT_SUPERVISOR_NAME]: e.supervisorName,
      [F.CURRENT_EMPLOYER_ADDRESS]: e.address,
      [F.CURRENT_EMPLOYER_CITY]: e.city,
      [F.CURRENT_EMPLOYER_POSTAL_CODE]: e.postalCode,
      [F.CURRENT_EMPLOYER_STATE]: e.stateOrProvince,
      [F.CURRENT_EMPLOYER_PHONE_1]: e.phone1,
      [F.CURRENT_EMPLOYER_PHONE_2]: e.phone2 || "",
      [F.CURRENT_EMPLOYER_EMAIL]: e.email,
      [F.CURRENT_POSITION_HELD]: e.positionHeld,
      [F.CURRENT_POSITION_FROM]: fmtDDMMYYYY(e.from),
      [F.CURRENT_POSITION_TO]: fmtDDMMYYYY(e.to),
      [F.CURRENT_SALARY]: asSalary(e.salary),
      [F.CURRENT_REASON_FOR_LEAVING]: e.reasonForLeaving,
      [F.CURRENT_FMCSR_YES]: asBool(e.subjectToFMCSR),
      [F.CURRENT_FMCSR_NO]: !asBool(e.subjectToFMCSR),
      [F.CURRENT_DOT_SENSITIVE_YES]: asBool(e.safetySensitiveFunction),
      [F.CURRENT_DOT_SENSITIVE_NO]: !asBool(e.safetySensitiveFunction),
    });
  })(r(0));

  // PREVIOUS employers — per-row field sets
  type PrevFieldSet = {
    NAME: F;
    SUPERVISOR: F;
    ADDRESS: F;
    CITY: F;
    POSTAL: F;
    STATE: F;
    PHONE1: F;
    PHONE2: F;
    EMAIL: F;
    POSITION_HELD: F;
    POSITION_FROM: F;
    POSITION_TO: F;
    SALARY: F;
    REASON: F;
    FMCSR_YES: F;
    FMCSR_NO: F;
    DOT_YES: F;
    DOT_NO: F;
  };

  const prevFields: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, PrevFieldSet> = {
    1: {
      NAME: F.PREV_EMPLOYER_1_NAME,
      SUPERVISOR: F.PREV_SUPERVISOR_1_NAME,
      ADDRESS: F.PREV_EMPLOYER_1_ADDRESS,
      CITY: F.PREV_EMPLOYER_1_CITY,
      POSTAL: F.PREV_EMPLOYER_1_POSTAL_CODE,
      STATE: F.PREV_EMPLOYER_1_STATE,
      PHONE1: F.PREV_EMPLOYER_1_PHONE_1,
      PHONE2: F.PREV_EMPLOYER_1_PHONE_2,
      EMAIL: F.PREV_EMPLOYER_1_EMAIL,
      POSITION_HELD: F.PREV_1_POSITION_HELD,
      POSITION_FROM: F.PREV_1_POSITION_FROM,
      POSITION_TO: F.PREV_1_POSITION_TO,
      SALARY: F.PREV_1_SALARY,
      REASON: F.PREV_1_REASON_FOR_LEAVING,
      FMCSR_YES: F.PREV_1_FMCSR_YES,
      FMCSR_NO: F.PREV_1_FMCSR_NO,
      DOT_YES: F.PREV_1_DOT_SENSITIVE_YES,
      DOT_NO: F.PREV_1_DOT_SENSITIVE_NO,
    },
    2: {
      NAME: F.PREV_EMPLOYER_2_NAME,
      SUPERVISOR: F.PREV_SUPERVISOR_2_NAME,
      ADDRESS: F.PREV_EMPLOYER_2_ADDRESS,
      CITY: F.PREV_EMPLOYER_2_CITY,
      POSTAL: F.PREV_EMPLOYER_2_POSTAL_CODE,
      STATE: F.PREV_EMPLOYER_2_STATE,
      PHONE1: F.PREV_EMPLOYER_2_PHONE_1,
      PHONE2: F.PREV_EMPLOYER_2_PHONE_2,
      EMAIL: F.PREV_EMPLOYER_2_EMAIL,
      POSITION_HELD: F.PREV_2_POSITION_HELD,
      POSITION_FROM: F.PREV_2_POSITION_FROM,
      POSITION_TO: F.PREV_2_POSITION_TO,
      SALARY: F.PREV_2_SALARY,
      REASON: F.PREV_2_REASON_FOR_LEAVING,
      FMCSR_YES: F.PREV_2_FMCSR_YES,
      FMCSR_NO: F.PREV_2_FMCSR_NO,
      DOT_YES: F.PREV_2_DOT_SENSITIVE_YES,
      DOT_NO: F.PREV_2_DOT_SENSITIVE_NO,
    },
    3: {
      NAME: F.PREV_EMPLOYER_3_NAME,
      SUPERVISOR: F.PREV_EMPLOYER_3_SUPERVISOR_NAME,
      ADDRESS: F.PREV_EMPLOYER_3_ADDRESS,
      CITY: F.PREV_EMPLOYER_3_CITY,
      POSTAL: F.PREV_EMPLOYER_3_POSTAL_CODE,
      STATE: F.PREV_EMPLOYER_3_STATE,
      PHONE1: F.PREV_EMPLOYER_3_PHONE_1,
      PHONE2: F.PREV_EMPLOYER_3_PHONE_2,
      EMAIL: F.PREV_EMPLOYER_3_EMAIL,
      POSITION_HELD: F.PREV_3_POSITION_HELD,
      POSITION_FROM: F.PREV_3_POSITION_FROM,
      POSITION_TO: F.PREV_3_POSITION_TO,
      SALARY: F.PREV_3_SALARY,
      REASON: F.PREV_3_REASON_FOR_LEAVING,
      FMCSR_YES: F.PREV_3_FMCSR_YES,
      FMCSR_NO: F.PREV_3_FMCSR_NO,
      DOT_YES: F.PREV_3_DOT_SENSITIVE_YES,
      DOT_NO: F.PREV_3_DOT_SENSITIVE_NO,
    },
    4: {
      NAME: F.PREV_EMPLOYER_4_NAME,
      SUPERVISOR: F.PREV_EMPLOYER_4_SUPERVISOR_NAME,
      ADDRESS: F.PREV_EMPLOYER_4_ADDRESS,
      CITY: F.PREV_EMPLOYER_4_CITY,
      POSTAL: F.PREV_EMPLOYER_4_POSTAL_CODE,
      STATE: F.PREV_EMPLOYER_4_STATE,
      PHONE1: F.PREV_EMPLOYER_4_PHONE_1,
      PHONE2: F.PREV_EMPLOYER_4_PHONE_2,
      EMAIL: F.PREV_EMPLOYER_4_EMAIL,
      POSITION_HELD: F.PREV_4_POSITION_HELD,
      POSITION_FROM: F.PREV_4_POSITION_FROM,
      POSITION_TO: F.PREV_4_POSITION_TO,
      SALARY: F.PREV_4_SALARY,
      REASON: F.PREV_4_REASON_FOR_LEAVING,
      FMCSR_YES: F.PREV_4_FMCSR_YES,
      FMCSR_NO: F.PREV_4_FMCSR_NO,
      DOT_YES: F.PREV_4_DOT_SENSITIVE_YES,
      DOT_NO: F.PREV_4_DOT_SENSITIVE_NO,
    },
    5: {
      NAME: F.PREV_EMPLOYER_5_NAME,
      SUPERVISOR: F.PREV_EMPLOYER_5_SUPERVISOR_NAME,
      ADDRESS: F.PREV_EMPLOYER_5_ADDRESS,
      CITY: F.PREV_EMPLOYER_5_CITY,
      POSTAL: F.PREV_EMPLOYER_5_POSTAL_CODE,
      STATE: F.PREV_EMPLOYER_5_STATE,
      PHONE1: F.PREV_EMPLOYER_5_PHONE_1,
      PHONE2: F.PREV_EMPLOYER_5_PHONE_2,
      EMAIL: F.PREV_EMPLOYER_5_EMAIL,
      POSITION_HELD: F.PREV_5_POSITION_HELD,
      POSITION_FROM: F.PREV_5_POSITION_FROM,
      POSITION_TO: F.PREV_5_POSITION_TO,
      SALARY: F.PREV_5_SALARY,
      REASON: F.PREV_5_REASON_FOR_LEAVING,
      FMCSR_YES: F.PREV_5_FMCSR_YES,
      FMCSR_NO: F.PREV_5_FMCSR_NO,
      DOT_YES: F.PREV_5_DOT_SENSITIVE_YES,
      DOT_NO: F.PREV_5_DOT_SENSITIVE_NO,
    },
    6: {
      NAME: F.PREV_EMPLOYER_6_NAME,
      SUPERVISOR: F.PREV_EMPLOYER_6_SUPERVISOR_NAME,
      ADDRESS: F.PREV_EMPLOYER_6_ADDRESS,
      CITY: F.PREV_EMPLOYER_6_CITY,
      POSTAL: F.PREV_EMPLOYER_6_POSTAL_CODE,
      STATE: F.PREV_EMPLOYER_6_STATE,
      PHONE1: F.PREV_EMPLOYER_6_PHONE_1,
      PHONE2: F.PREV_EMPLOYER_6_PHONE_2,
      EMAIL: F.PREV_EMPLOYER_6_EMAIL,
      POSITION_HELD: F.PREV_6_POSITION_HELD,
      POSITION_FROM: F.PREV_6_POSITION_FROM,
      POSITION_TO: F.PREV_6_POSITION_TO,
      SALARY: F.PREV_6_SALARY,
      REASON: F.PREV_6_REASON_FOR_LEAVING,
      FMCSR_YES: F.PREV_6_FMCSR_YES,
      FMCSR_NO: F.PREV_6_FMCSR_NO,
      DOT_YES: F.PREV_6_DOT_SENSITIVE_YES,
      DOT_NO: F.PREV_6_DOT_SENSITIVE_NO,
    },
    7: {
      NAME: F.PREV_EMPLOYER_7_NAME,
      SUPERVISOR: F.PREV_EMPLOYER_7_SUPERVISOR_NAME,
      ADDRESS: F.PREV_EMPLOYER_7_ADDRESS,
      CITY: F.PREV_EMPLOYER_7_CITY,
      POSTAL: F.PREV_EMPLOYER_7_POSTAL_CODE,
      STATE: F.PREV_EMPLOYER_7_STATE,
      PHONE1: F.PREV_EMPLOYER_7_PHONE_1,
      PHONE2: F.PREV_EMPLOYER_7_PHONE_2,
      EMAIL: F.PREV_EMPLOYER_7_EMAIL,
      POSITION_HELD: F.PREV_7_POSITION_HELD,
      POSITION_FROM: F.PREV_7_POSITION_FROM,
      POSITION_TO: F.PREV_7_POSITION_TO,
      SALARY: F.PREV_7_SALARY,
      REASON: F.PREV_7_REASON_FOR_LEAVING,
      FMCSR_YES: F.PREV_7_FMCSR_YES,
      FMCSR_NO: F.PREV_7_FMCSR_NO,
      DOT_YES: F.PREV_7_DOT_SENSITIVE_YES,
      DOT_NO: F.PREV_7_DOT_SENSITIVE_NO,
    },
  };

  function fillPrev(idx: 1 | 2 | 3 | 4 | 5 | 6 | 7, e?: (typeof emps)[number]) {
    if (!e) return;
    const f = prevFields[idx];
    Object.assign(map, {
      [f.NAME]: e.employerName,
      [f.SUPERVISOR]: e.supervisorName,
      [f.ADDRESS]: e.address,
      [f.CITY]: e.city,
      [f.POSTAL]: e.postalCode,
      [f.STATE]: e.stateOrProvince,
      [f.PHONE1]: e.phone1,
      [f.PHONE2]: e.phone2 || "",
      [f.EMAIL]: e.email,
      [f.POSITION_HELD]: e.positionHeld,
      [f.POSITION_FROM]: fmtDDMMYYYY(e.from),
      [f.POSITION_TO]: fmtDDMMYYYY(e.to),
      [f.SALARY]: asSalary(e.salary),
      [f.REASON]: e.reasonForLeaving,
      [f.FMCSR_YES]: asBool(e.subjectToFMCSR),
      [f.FMCSR_NO]: !asBool(e.subjectToFMCSR),
      [f.DOT_YES]: asBool(e.safetySensitiveFunction),
      [f.DOT_NO]: !asBool(e.safetySensitiveFunction),
    });
  }

  // Fill previous rows (sorted newest->oldest)
  fillPrev(1, r(1));
  fillPrev(2, r(2));
  fillPrev(3, r(3));
  fillPrev(4, r(4));
  fillPrev(5, r(5));
  fillPrev(6, r(6));
  fillPrev(7, r(7));

  /* =========================
   * Page 5 - Accidents/Convictions/Education + License table + HOS
   * (Accident rows: 2 max; License rows: 2 max)
   * ========================= */
  const acc = p3?.accidentHistory || [];
  if (acc[0]) {
    Object.assign(map, {
      [F.ACCIDENT_1_DATE]: fmtDDMMYYYY(acc[0].date),
      [F.ACCIDENT_1_NATURE]: acc[0].natureOfAccident || "",
      [F.ACCIDENT_1_FATALITIES]: String(acc[0].fatalities ?? ""),
      [F.ACCIDENT_1_INJURIES]: String(acc[0].injuries ?? ""),
    });
  }
  if (acc[1]) {
    Object.assign(map, {
      [F.ACCIDENT_2_DATE]: fmtDDMMYYYY(acc[1].date),
      [F.ACCIDENT_2_NATURE]: acc[1].natureOfAccident || "",
      [F.ACCIDENT_2_FATALITIE]: String(acc[1].fatalities ?? ""),
      [F.ACCIDENT_2_INJURIE]: String(acc[1].injuries ?? ""),
    });
  }

  const tc = p3?.trafficConvictions || [];
  if (tc[0]) {
    Object.assign(map, {
      [F.CONVICTION_1_DATE]: fmtDDMMYYYY(tc[0].date),
      [F.CONVICTION_1_LOCATION]: tc[0].location || "",
      [F.CONVICTION_1_CHARG]: tc[0].charge || "",
      [F.CONVICTION_1_PENALTY]: tc[0].penalty || "",
    });
  }
  if (tc[1]) {
    Object.assign(map, {
      [F.CONVICTION_2_DATE]: fmtDDMMYYYY(tc[1].date),
      [F.CONVICTION_2_LOCATION]: tc[1].location || "",
      [F.CONVICTION_2_CHARGE]: tc[1].charge || "",
      [F.CONVICTION_2_PENALTY]: tc[1].penalty || "",
    });
  }

  // Education ticks: tick only the exact matching year
  const edu = p3?.education;
  if (edu) {
    for (let i = 1; i <= 12; i++) {
      (map as any)[F[`GRADE_SCHOOL_${i}` as keyof typeof F]] = i === (edu.gradeSchool ?? 0) ? true : false;
    }
    for (let i = 1; i <= 4; i++) {
      (map as any)[F[`COLLEGE_${i}` as keyof typeof F]] = i === (edu.college ?? 0) ? true : false;
      (map as any)[F[`POSTGRAD_${i}` as keyof typeof F]] = i === (edu.postGraduate ?? 0) ? true : false;
    }
  }

  // License table (first 2) — single date fields → dd/mm/yyyy
  const l1 = p1.licenses?.[0];
  const l2 = p1.licenses?.[1];
  if (l1) {
    Object.assign(map, {
      [F.LICENSE_1_STATE]: l1.licenseStateOrProvince || "",
      [F.LICENSE_1_NUMBER]: l1.licenseNumber || "",
      [F.LICENSE_1_TYPE]: l1.licenseType || "",
      [F.LICENSE_1_EXPIRY_DATE]: fmtDDMMYYYY(l1.licenseExpiry),
    });
  }
  if (l2) {
    Object.assign(map, {
      [F.LICENSE_2_STATE]: l2.licenseStateOrProvince || "",
      [F.LICENSE_2_NUMBER]: l2.licenseNumber || "",
      [F.LICENSE_2_TYPE]: l2.licenseType || "",
      [F.LICENSE_2_EXPIRY_DATE]: fmtDDMMYYYY(l2.licenseExpiry),
    });
  }

  // License history questions
  Object.assign(map, {
    [F.LICENSE_DENIED_YES]: p4?.deniedLicenseOrPermit ? true : false,
    [F.LICENSE_DENIED_NO]: p4?.deniedLicenseOrPermit ? false : true,
    [F.LICENSE_RECEIVED_YE]: p4?.suspendedOrRevoked ? true : false,
    [F.LICENSE_RECEIVED_NO]: p4?.suspendedOrRevoked ? false : true,
  });

  // HOS block (Canadian Hours of Service)
  const hos = p3?.canadianHoursOfService;
  if (hos) {
    Object.assign(map, {
      [F.HOS_NAME]: name,
      [F.HOS_SIN_P1]: sinP1,
      [F.HOS_SIN_P2]: sinP2,
      [F.HOS_SIN_P3]: sinP3,
      [F.HOS_LICENSE_NUMBER_P1]: azP1,
      [F.HOS_LICENSE_NUMBER_P2]: azP2,
      [F.HOS_LICENSE_NUMBER_P3]: azP3,
      [F.HOS_PROVINC]: az?.licenseStateOrProvince || "",
      [F.HOS_TOTAL_HOURS]: String(hos.totalHours ?? ""),
      [F.HOS_DAY_1_HOURS]: String(hos.dailyHours?.[0]?.hours ?? ""),
      [F.HOS_DAY_2_HOURS]: String(hos.dailyHours?.[1]?.hours ?? ""),
      [F.HOS_DAY_3_HOURS]: String(hos.dailyHours?.[2]?.hours ?? ""),
      [F.HOS_DAY_4_HOURS]: String(hos.dailyHours?.[3]?.hours ?? ""),
      [F.HOS_DAY_5_HOURS]: String(hos.dailyHours?.[4]?.hours ?? ""),
      [F.HOS_DAY_6_HOURS]: String(hos.dailyHours?.[5]?.hours ?? ""),
      [F.HOS_DAY_7_HOURS]: String(hos.dailyHours?.[6]?.hours ?? ""),
      [F.HOS_DAY_8_HOURS]: String(hos.dailyHours?.[7]?.hours ?? ""),
      [F.HOS_DAY_9_HOURS]: String(hos.dailyHours?.[8]?.hours ?? ""),
      [F.HOS_DAY_10_HOURS]: String(hos.dailyHours?.[9]?.hours ?? ""),
      [F.HOS_DAY_11_HOURS]: String(hos.dailyHours?.[10]?.hours ?? ""),
      [F.HOS_DAY_12_HOURS]: String(hos.dailyHours?.[11]?.hours ?? ""),
      [F.HOS_DAY_13_HOURS]: String(hos.dailyHours?.[12]?.hours ?? ""),
      [F.HOS_DAY_14_HOURS]: String(hos.dailyHours?.[13]?.hours ?? ""),
      [F.HOS_SIGNATURE]: (policies as any)?.signature?.url || "",
      [F.HOS_DAY_ONE_DATE]: fmtDDMMYYYY(hos.dayOneDate || null),
      [F.HOS_SIGNATURE_DATE_DAY]: signDMY.d,
      [F.HOS_SIGNATURE_DATE_MONTH]: signDMY.m,
      [F.HOS_SIGNATURE_DATE_YEAR]: signDMY.y,
    });
  }

  /* =========================
   * Page 6 - Declaration + Compliance + Process Record
   * ========================= */
  Object.assign(map, {
    [F.DECLARATION_APPLICANT_NAME]: name,
    [F.DECLARATION_SIGNATURE]: (policies as any)?.signature?.url || "",
    [F.DECLARATION_DATE_DAY]: signDMY.d,
    [F.DECLARATION_DATE_MONTH]: signDMY.m,
    [F.DECLARATION_DATE_YEAR]: signDMY.y,

    [F.COMPLIANCE_LICENSE_NUMBER_P1]: azP1,
    [F.COMPLIANCE_LICENSE_NUMBER_P2]: azP2,
    [F.COMPLIANCE_LICENSE_NUMBER_P3]: azP3,
    [F.COMPLIANCE_LICENSE_PROVINCE]: az?.licenseStateOrProvince || "",
    [F.COMPLIANCE_LICENSE_EXPIRY_DATE_DAY]: splitDMY(az?.licenseExpiry).d,
    [F.COMPLIANCE_LICENSE_EXPIRY_DATE_MONTH]: splitDMY(az?.licenseExpiry).m,
    [F.COMPLIANCE_LICENSE_EXPIRY_DATE_YEAR]: splitDMY(az?.licenseExpiry).y,

    [F.COMPLIANCE_DRIVER_NAME]: name,
    [F.COMPLIANCE_DRIVER_SIGNATURE]: (policies as any)?.signature?.url || "",
    [F.COMPLIANCE_DRIVER_SIGNATURE_DATE_DAY]: signDMY.d,
    [F.COMPLIANCE_DRIVER_SIGNATURE_DATE_MONTH]: signDMY.m,
    [F.COMPLIANCE_DRIVER_SIGNATURE_DATE_YEAR]: signDMY.y,
  });

  const completed = onboarding.status?.completed ?? (onboarding as any).completed ?? false;
  if (!completed) {
    Object.assign(map, {
      [F.PROCESS_APPLICANT_HIRED_YES]: false,
      [F.PROCESS_APPLICANT_HIRED_NO]: true,
    });
  } else {
    const isTerminated = !!onboarding.terminated;
    Object.assign(map, {
      [F.PROCESS_APPLICANT_HIRED_YES]: completed,
      [F.PROCESS_APPLICANT_HIRED_NO]: !completed,
      [F.PROCESS_TERMINATION_RESIGNED]: isTerminated && onboarding.terminationType === ETerminationType.RESIGNED ? true : false,
      [F.PROCESS_TERMINATION_TERMINATE]: isTerminated && onboarding.terminationType === ETerminationType.TERMINATED ? true : false,
      // Single date fields → dd/mm/yyyy
      [F.PROCESS_HIRING_DATE]: fmtDDMMYYYY(onboarding.status?.completionDate),
      [F.PROCESS_RELEASE_DATE]: fmtDDMMYYYY((onboarding as any).terminationDate),
    });
  }

  /* =========================
   * Page 7 - Driver’s Rights
   * ========================= */
  Object.assign(map, {
    [F.DRIVER_RIGHTS_NAME]: name,
    [F.DRIVER_RIGHTS_SIGNATURE]: (policies as any)?.signature?.url || "",
    [F.DRIVER_RIGHTS_DATE_DAY]: signDMY.d,
    [F.DRIVER_RIGHTS_DATE_MONTH]: signDMY.m,
    [F.DRIVER_RIGHTS_DATE_YEAR]: signDMY.y,
  });

  /* =========================
   * Page 8 - Pre-Employment Consent + Medical Declaration
   * ========================= */
  Object.assign(map, {
    [F.PRE_EMPLOYMENT_CONSENT_NAME]: name,

    [F.MEDICAL_DECLARATION_NAME]: name,
    [F.MEDICAL_DECLARATION_SIN_P1]: sinP1,
    [F.MEDICAL_DECLARATION_SIN_P2]: sinP2,
    [F.MEDICAL_DECLARATION_SIN_P3]: sinP3,
    [F.MEDICAL_DECLARATION_SIGNATURE]: (policies as any)?.signature?.url || "",
    [F.MEDICAL_DECLARATION_DATE_DAY]: signDMY.d,
    [F.MEDICAL_DECLARATION_DATE_MONTH]: signDMY.m,
    [F.MEDICAL_DECLARATION_DATE_YEAR]: signDMY.y,

    [F.MEDICAL_DECLARATION_WITNESS_NAME]: safetyAdmin?.name || "",
    [F.MEDICAL_DECLARATION_WITNESS_SIGNATURE]: safetyAdmin?.signature || "",
    [F.MEDICAL_DECLARATION_WITNESS_DATE_DAY]: signDMY.d,
    [F.MEDICAL_DECLARATION_WITNESS_DATE_MONTH]: signDMY.m,
    [F.MEDICAL_DECLARATION_WITNESS_DATE_YEAR]: signDMY.y,
  });

  /* =========================
   * Page 9 - Alcohol & Drug Statement + Applicant Drug Testing Notice
   * ========================= */
  Object.assign(map, {
    [F.ALCOHOL_DRUG_STATEMENT_DRIVER_NAME]: name,

    [F.ALCOHOL_DRUG_STATEMENT_LICENSE_NUMBER_P1]: azP1,
    [F.ALCOHOL_DRUG_STATEMENT_LICENSE_NUMBER_P2]: azP2,
    [F.ALCOHOL_DRUG_STATEMENT_LICENSE_NUMBER_P3]: azP3,

    [F.ALCOHOL_DRUG_STATEMENT_PROVINCE]: az?.licenseStateOrProvince || "",

    [F.ALCOHOL_DRUG_STATEMENT_Q1_YES]: p4?.testedPositiveOrRefused ? true : false,
    [F.ALCOHOL_DRUG_STATEMENT_Q1_NO]: p4?.testedPositiveOrRefused ? false : true,

    [F.ALCOHOL_DRUG_STATEMENT_Q2_YES]: p4?.completedDOTRequirements ? true : false,
    [F.ALCOHOL_DRUG_STATEMENT_Q2_NO]: p4?.completedDOTRequirements ? false : true,

    [F.DRUG_NOTICE_DRIVER_NAME]: name,
    [F.DRUG_NOTICE_DRIVER_SIGNATURE]: (policies as any)?.signature?.url || "",
    [F.DRUG_NOTICE_DATE_DAY]: signDMY.d,
    [F.DRUG_NOTICE_DATE_MONTH]: signDMY.m,
    [F.DRUG_NOTICE_DATE_YEAR]: signDMY.y,
  });

  /* =========================
   * Page 10 - Drug Receipt + Trailer Seal Procedure
   * ========================= */
  Object.assign(map, {
    [F.DRUG_RECEIPT_DRIVER_NAME]: name,
    [F.DRUG_RECEIPT_SIGNATURE]: (policies as any)?.signature?.url || "",
    [F.DRUG_RECEIPT_DATE_DAY]: signDMY.d,
    [F.DRUG_RECEIPT_DATE_MONTH]: signDMY.m,
    [F.DRUG_RECEIPT_DATE_YEAR]: signDMY.y,

    [F.DRUG_RECEIPT_WITNESS_NAME]: safetyAdmin?.name || "",
    [F.DRUG_RECEIPT_WITNESS_SIGNATURE]: safetyAdmin?.signature || "",
    [F.DRUG_RECEIPT_WITNESS_DATE_DAY]: signDMY.d,
    [F.DRUG_RECEIPT_WITNESS_MONTH]: signDMY.m,
    [F.DRUG_RECEIPT_WITNESS_YEAR]: signDMY.y,

    [F.TRAILER_SEAL_DRIVER_NAME]: name,
    [F.TRAILER_SEAL_SIGNATURE]: (policies as any)?.signature?.url || "",
    [F.TRAILER_SEAL_DATE_DAY]: signDMY.d,
    [F.TRAILER_SEAL_DATE_MONTH]: signDMY.m,
    [F.TRAILER_SEAL_DATE_YEAR]: signDMY.y,

    [F.TRAILER_CERTIFICATION_DRIVER_NAME]: name,
    [F.TRAILER_CERTIFICATION_SIGNATURE]: (policies as any)?.signature?.url || "",
    [F.TRAILER_CERTIFICATION_DATE_DAY]: signDMY.d,
    [F.TRAILER_CERTIFICATION_DATE_MONTH]: signDMY.m,
    [F.TRAILER_CERTIFICATION_DATE_YEAR]: signDMY.y,
  });

  /* =========================
   * Page 11 - Pre-Employment Competency Test (Q1–Q18)
   * ========================= */
  const setAnswer = (qid: string, aid: string) => {
    const n = Number(qid);
    const option = aid?.toLowerCase?.().trim();
    if (!option || !Number.isFinite(n)) return;

    // Only questions 1..18; only options a/b/c/d
    if (n < 1 || n > 18) return;
    const opt = option[0];
    if (!["a", "b", "c", "d"].includes(opt)) return;

    const key = `COMPETENCY_Q${n}_${opt.toUpperCase()}` as keyof typeof F;
    const field = F[key];
    if (field) (map as any)[field] = "Yes";
  };

  for (const ans of p5?.answers || []) setAnswer(ans.questionId, ans.answerId);

  /* =========================
   * Page 12 - Acknowledgement & Insurance
   * ========================= */
  const contractorName = application.page4?.businessName || (onboarding.companyId ? getCompanyById(onboarding.companyId)?.name : undefined) || "N/A";

  Object.assign(map, {
    [F.COMP_ACK_DRIVER_NAME]: name,
    [F.COMP_ACK_CONTRACTOR_COMPANY_NAME]: contractorName,
    [F.COMP_ACK_CONTRACTOR_COMPANY_NAME_REPEAT]: contractorName,
    [F.COMP_ACK_CONTRACTOR_COMPANY_NAME_FINAL]: contractorName,

    [F.COMP_ACK_DISPUTE_WITH]: contractorName,

    [F.COMP_ACK_SIGNATURE_NAME]: name,
    [F.COMP_ACK_SIGNATURE]: (policies as any)?.signature?.url || "",
    [F.COMP_ACK_DATE_DAY]: signDMY.d,
    [F.COMP_ACK_DATE_MONTH]: signDMY.m,
    [F.COMP_ACK_DATE_YEAR]: signDMY.y,

    [F.INSURANCE_DRIVER_NAME]: hasAccidentalInsurance ? name : "",
    [F.INSURANCE_PROMISE_TO_BUY]: "",
    [F.INSURANCE_ALREADY_HAVE_COVERAGE]: hasAccidentalInsurance,
    [F.INSURANCE_SIGNATURE_NAME]: hasAccidentalInsurance ? name : "",
    [F.INSURANCE_SIGNATURE]: hasAccidentalInsurance ? (policies as any)?.signature?.url || "" : "",
    [F.INSURANCE_DATE_DAY]: hasAccidentalInsurance ? signDMY.d : "",
    [F.INSURANCE_DATE_MONTH]: hasAccidentalInsurance ? signDMY.m : "",
    [F.INSURANCE_DATE_YEAR]: hasAccidentalInsurance ? signDMY.y : "",
  });

  return map;
}
