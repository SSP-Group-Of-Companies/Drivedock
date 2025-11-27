// src/lib/pdf/isb-consent/mappers/isb-consent.types.ts
/**
 * ======================================================================
 * DriveDock - ISB Criminal Record Verification (Consent + Declaration)
 * Fillable PDF Field Names (Sejda)
 * ----------------------------------------------------------------------
 * Only text/date/signature fields. Do NOT create checkbox fields here.
 * Some fields on the template are static/pre-filled — we do not touch them.
 * ======================================================================
 */

export enum EIsbConsentFillableFormFields {
  /* ====================== A. Personal Information ====================== */
  PI_SURNAME = "isbconsent_pi_surname",
  PI_GIVEN_NAMES = "isbconsent_pi_given_names",
  PI_MIDDLE_NAMES = "isbconsent_pi_middle_names",
  PI_SURNAME_AT_BIRTH = "isbconsent_pi_surname_at_birth",
  PI_FORMER_NAMES = "isbconsent_pi_former_names",

  PI_PLACE_OF_BIRTH = "isbconsent_pi_place_of_birth", // City, Province/State, Country
  PI_DOB = "isbconsent_pi_dob", // YYYY-MM-DD

  PI_SEX_MALE_CHECKED = "isbconsent_pi_sex_male_checked", // Checkbox
  PI_SEX_FEMALE_CHECKED = "isbconsent_pi_sex_female_checked", // Checkbox

  PI_PHONE = "isbconsent_pi_phone",
  PI_EMAIL = "isbconsent_pi_email",

  /* ------------------------ Current Home Address ----------------------- */
  CURR_ADDR_NUMBER = "isbconsent_curr_addr_number",
  CURR_ADDR_STREET = "isbconsent_curr_addr_street",
  CURR_ADDR_APT = "isbconsent_curr_addr_apt",
  CURR_ADDR_CITY = "isbconsent_curr_addr_city",
  CURR_ADDR_PROVINCE = "isbconsent_curr_addr_province",
  CURR_ADDR_POSTAL = "isbconsent_curr_addr_postal",

  /* ------------- Previous Addresses (last 5 years) - up to 2 ----------- */
  PREV1_ADDR_NUMBER = "isbconsent_prev1_addr_number",
  PREV1_ADDR_STREET = "isbconsent_prev1_addr_street",
  PREV1_ADDR_APT = "isbconsent_prev1_addr_apt",
  PREV1_ADDR_CITY = "isbconsent_prev1_addr_city",
  PREV1_ADDR_PROVINCE = "isbconsent_prev1_addr_province",
  PREV1_ADDR_POSTAL = "isbconsent_prev1_addr_postal",

  PREV2_ADDR_NUMBER = "isbconsent_prev2_addr_number",
  PREV2_ADDR_STREET = "isbconsent_prev2_addr_street",
  PREV2_ADDR_APT = "isbconsent_prev2_addr_apt",
  PREV2_ADDR_CITY = "isbconsent_prev2_addr_city",
  PREV2_ADDR_PROVINCE = "isbconsent_prev2_addr_province",
  PREV2_ADDR_POSTAL = "isbconsent_prev2_addr_postal",

  /* ============================ C. Consent ============================= */
  // “I consent to the release of the results of the criminal record checks to ____ located in ____ (City and Country).”
  AUTH_COMPANY_NAME = "isbconsent_auth_company_name",
  AUTH_COMPANY_CITY_COUNTRY = "isbconsent_auth_company_city_country",

  // Signed at (city / province) + Date broken into Y/M/D on the form
  AUTH_APPLICANT_SIGNATURE = "isbconsent_auth_applicant_signature",

  AUTH_DATE_YEAR = "isbconsent_auth_date_year",
  AUTH_DATE_MONTH = "isbconsent_auth_date_month",
  AUTH_DATE_DAY = "isbconsent_auth_date_day",

  AUTH_SIGNED_AT_CITY = "isbconsent_auth_signed_at_city",
  AUTH_SIGNED_AT_PROVINCE = "isbconsent_auth_signed_at_province",

  /* ===================== D. Identification Verification ==================== */
  WITNESS_NAME = "isbconsent_witness_name",
  WITNESS_SIGNATURE = "isbconsent_witness_signature",

  /* ===================== Declaration of Criminal Record ==================== */
  DECL_SURNAME = "isbconsent_decl_surname",
  DECL_GIVEN_NAMES = "isbconsent_decl_given_names",
  DECL_DOB = "isbconsent_decl_dob", // YYYY-MM-DD

  // Table rows (up to 6)
  DECL_ROW1_OFFENCE = "isbconsent_decl_row1_offence",
  DECL_ROW1_DATE = "isbconsent_decl_row1_date", // YYYY-MM-DD
  DECL_ROW1_COURT = "isbconsent_decl_row1_court",

  DECL_ROW2_OFFENCE = "isbconsent_decl_row2_offence",
  DECL_ROW2_DATE = "isbconsent_decl_row2_date",
  DECL_ROW2_COURT = "isbconsent_decl_row2_court",

  DECL_ROW3_OFFENCE = "isbconsent_decl_row3_offence",
  DECL_ROW3_DATE = "isbconsent_decl_row3_date",
  DECL_ROW3_COURT = "isbconsent_decl_row3_court",

  DECL_ROW4_OFFENCE = "isbconsent_decl_row4_offence",
  DECL_ROW4_DATE = "isbconsent_decl_row4_date",
  DECL_ROW4_COURT = "isbconsent_decl_row4_court",

  DECL_ROW5_OFFENCE = "isbconsent_decl_row5_offence",
  DECL_ROW5_DATE = "isbconsent_decl_row5_date",
  DECL_ROW5_COURT = "isbconsent_decl_row5_court",

  DECL_ROW6_OFFENCE = "isbconsent_decl_row6_offence",
  DECL_ROW6_DATE = "isbconsent_decl_row6_date",
  DECL_ROW6_COURT = "isbconsent_decl_row6_court",

  DECL_ROW7_OFFENCE = "isbconsent_decl_row7_offence",
  DECL_ROW7_DATE = "isbconsent_decl_row7_date",
  DECL_ROW7_COURT = "isbconsent_decl_row7_court",

  // Footer of Declaration page
  DECL_APPLICANT_SIGNATURE = "isbconsent_decl_applicant_signature",
  DECL_DATE = "isbconsent_decl_date", // YYYY-MM-DD
}

/** FieldName -> value used by the PDF filler */
export type IsbConsentPayload = Partial<Record<EIsbConsentFillableFormFields, string | boolean>>;
