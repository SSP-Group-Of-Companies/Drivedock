/**
 * ======================================================================
 * DriveDock - W-4 (Employee’s Withholding Certificate)
 * Fillable PDF Field Names (Sejda)
 * ----------------------------------------------------------------------
 * Only text/date/signature/checkbox fields we actually fill.
 * ======================================================================
 */

export enum EW4FillableFormFields {
  /* ===================== Step 1: Personal Information ===================== */

  STEP1_FIRST_MIDDLE = "w4_step1_first_middle", // "First name and middle initial"
  STEP1_LAST_NAME = "w4_step1_last_name", // "Last name"
  STEP1_SSN = "w4_step1_ssn", // Social security number

  STEP1_ADDRESS = "w4_step1_address", // Street address
  STEP1_CITY_STATE_ZIP = "w4_step1_city_state_zip", // "City or town, state, and ZIP code"

  STEP1_STATUS_SINGLE_OR_MARRIED_SEPARATE = "w4_step1_status_single_or_married_separate", // checkbox
  STEP1_STATUS_MARRIED_JOINT = "w4_step1_status_married_joint", // checkbox
  STEP1_STATUS_HEAD_OF_HOUSEHOLD = "w4_step1_status_head_of_household", // checkbox

  /* ========================== Step 5: Sign Here ========================== */

  STEP5_EMPLOYEE_SIGNATURE = "w4_step5_employee_signature", // signature field (image)
  STEP5_DATE = "w4_step5_date", // date text field (MM/DD/YYYY)

  /* =========================== Employers Only ============================ */

  EMPLOYER_NAME_ADDRESS = "w4_employer_name_address",
  FIRST_DATE_OF_EMPLOYMENT = "w4_first_date_of_employment",
  EMPLOYER_EIN = "w4_employer_ein", // we keep this in the types but don't fill it (yet)
}

/** FieldName -> value used by the PDF filler */
export type W4Payload = Partial<Record<EW4FillableFormFields, string | boolean>>;

/**
 * Simple filing status flags.
 * We can extend this later if we start collecting it in the app.
 */
export type W4FilingStatus = "singleOrMarriedSeparately" | "marriedFilingJointly" | "headOfHousehold";
