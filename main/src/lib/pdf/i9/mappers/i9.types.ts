/**
 * ======================================================================
 * DriveDock - USCIS Form I-9 (Employment Eligibility Verification)
 * Fillable PDF Field Names
 * ----------------------------------------------------------------------
 * Only include fields we actually fill (highlighted blue on the mockups).
 * Update the string values to match the real field names in your fillable
 * I-9 PDF.
 * ======================================================================
 */
export enum EI9FillableFormFields {
  /* ======================= Section 1 – Employee ======================= */

  // Name row
  S1_LAST_NAME = "i9_s1_last_name",
  S1_FIRST_NAME = "i9_s1_first_name",
  S1_MIDDLE_INITIAL = "i9_s1_middle_initial",
  S1_OTHER_LAST_NAMES = "i9_s1_other_last_names",

  // Address / contact
  S1_ADDRESS_STREET = "i9_s1_address_street",
  S1_ADDRESS_APT = "i9_s1_address_apt",
  S1_ADDRESS_CITY = "i9_s1_address_city",
  S1_ADDRESS_STATE = "i9_s1_address_state",
  S1_ADDRESS_ZIP = "i9_s1_address_zip",

  S1_DOB = "i9_s1_dob", // MM/DD/YYYY

  // SSN — 9 separate one-character fields
  S1_SSN_DIGIT1 = "i9_s1_ssn_1",
  S1_SSN_DIGIT2 = "i9_s1_ssn_2",
  S1_SSN_DIGIT3 = "i9_s1_ssn_3",
  S1_SSN_DIGIT4 = "i9_s1_ssn_4",
  S1_SSN_DIGIT5 = "i9_s1_ssn_5",
  S1_SSN_DIGIT6 = "i9_s1_ssn_6",
  S1_SSN_DIGIT7 = "i9_s1_ssn_7",
  S1_SSN_DIGIT8 = "i9_s1_ssn_8",
  S1_SSN_DIGIT9 = "i9_s1_ssn_9",

  S1_EMAIL = "i9_s1_email",
  S1_PHONE = "i9_s1_phone",

  // Citizenship / immigration status (1–4)
  S1_STATUS_1_US_CITIZEN = "i9_s1_status_1_us_citizen",
  S1_STATUS_2_NONCITIZEN_NATIONAL = "i9_s1_status_2_noncitizen_national",
  S1_STATUS_3_LPR = "i9_s1_status_3_lpr",
  S1_STATUS_4_ALIEN_AUTHORIZED = "i9_s1_status_4_alien_authorized",

  // “Foreign Passport Number and Country of Issuance” (if #4)
  S1_STATUS_4_FOREIGN_PASSPORT = "i9_s1_status_4_foreign_passport",

  // Signature + date
  S1_EMPLOYEE_SIGNATURE = "i9_s1_employee_signature", // signature widget
  S1_EMPLOYEE_DATE = "i9_s1_employee_date", // MM/DD/YYYY

  /* ======================= Section 2 – Employer ======================= */

  // List A – Document 1 (passport or PR/permit/citizenship)
  S2_LISTA_DOC1_TITLE = "i9_s2_lista_doc1_title",
  S2_LISTA_DOC1_ISSUER = "i9_s2_lista_doc1_issuer",
  S2_LISTA_DOC1_NUMBER = "i9_s2_lista_doc1_number",
  S2_LISTA_DOC1_EXPIRY = "i9_s2_lista_doc1_expiry",

  // List A – Document 2 (medical certificate)
  S2_LISTA_DOC2_TITLE = "i9_s2_lista_doc2_title",
  S2_LISTA_DOC2_ISSUER = "i9_s2_lista_doc2_issuer",
  S2_LISTA_DOC2_NUMBER = "i9_s2_lista_doc2_number",
  S2_LISTA_DOC2_EXPIRY = "i9_s2_lista_doc2_expiry",

  // List B – SSN
  S2_LISTB_DOC_TITLE = "i9_s2_listb_doc_title",
  S2_LISTB_DOC_ISSUER = "i9_s2_listb_doc_issuer",
  S2_LISTB_DOC_NUMBER = "i9_s2_listb_doc_number",
  S2_LISTB_DOC_EXPIRY = "i9_s2_listb_doc_expiry",

  // List C – driver’s license
  S2_LISTC_DOC_TITLE = "i9_s2_listc_doc_title",
  S2_LISTC_DOC_ISSUER = "i9_s2_listc_doc_issuer",
  S2_LISTC_DOC_NUMBER = "i9_s2_listc_doc_number",
  S2_LISTC_DOC_EXPIRY = "i9_s2_listc_doc_expiry",

  // Certification block
  S2_EMPLOYER_REP_NAME_TITLE = "i9_s2_employer_rep_name_title",
  S2_EMPLOYER_REP_SIGNATURE = "i9_s2_employer_rep_signature",
  S2_EMPLOYER_REP_DATE = "i9_s2_employer_rep_date",
  S2_FIRST_DAY_OF_EMPLOYMENT = "i9_s2_first_day_of_employment",

  S2_EMPLOYER_BUSINESS_NAME = "i9_s2_employer_business_name",
  S2_EMPLOYER_BUSINESS_ADDRESS = "i9_s2_employer_business_address",

  /* ===================== Supplement A – top row only ================== */

  SUPA_LAST_NAME = "i9_supa_last_name",
  SUPA_FIRST_NAME = "i9_supa_first_name",
  SUPA_MIDDLE_INITIAL = "i9_supa_middle_initial",
}

/** FieldName -> value used by the PDF filler */
export type I9Payload = Partial<Record<EI9FillableFormFields, string | boolean>>;
