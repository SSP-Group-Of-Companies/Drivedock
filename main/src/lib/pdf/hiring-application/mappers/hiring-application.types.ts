// lib/pdf/hiring-application/mappers/hiring-application.types.ts

/**
 * ======================================================================
 * DriveDock - Hiring Application Fillable PDF Field Names
 * ----------------------------------------------------------------------
 * Field names group by PDF page/section for clarity.
 * DO NOT change identifiers — they must match the Sejda fillable template.
 * ======================================================================
 */

export enum EDriverApplicationFillableFormFields {
  /* =========================
   * Page 1 - Data Entry Form
   * ========================= */
  DRIVER_NAME = "driver_name",
  DL_NUMBER = "dl_number",
  LICENSE_TYPE = "license_type",
  DL_EXPIRY = "dl_expiry",
  LICENSE_ISSUE_PROVINCE = "license_Issue_province",
  SIN_ISSUE_DATE = "sin_issue_date", // business rule: skip filling this
  FORM_DATE = "form_date",
  DOB = "dob",

  /* ================================
   * Page 2 - Instructions & Acknowledgement
   * ================================ */
  ACKNOWLEDGEMENT_NAME = "acknowledgement_name",
  ACKNOWLEDGEMENT_SIGNATURE = "acknowledgement_signature",
  ACKNOWLEDGEMENT_DATE_DAY = "acknowledgement_date_day",
  ACKNOWLEDGEMENT_DATE_MONTH = "acknowledgement_date_month",
  ACKNOWLEDGEMENT_DATE_YEAR = "acknowledgement_date_year",

  /* =========================
   * Page 3 - Application Form (identity, addresses, quick Qs)
   * ========================= */
  POSITION_DRIVER_CHECKED = "position_driver_checked",
  POSITION_OWNER_OPERATOR_CHECKED = "position_owner_operator_checked",

  APPLICATION_DATE_DAY = "application_date_day",
  APPLICATION_DATE_MONTH = "application_date_month",
  APPLICATION_DATE_YEAR = "application_date_year",

  APPLICANT_NAME = "applicant_name",

  // SIN shown in multiple places on the PDF
  SIN_NUMBER_P1 = "sin_number_p1",
  SIN_NUMBER_P2 = "sin_number_p2",
  SIN_NUMBER_P3 = "sin_number_p3",

  // License fields (multi-place echo on PDF)
  LICENSE_NUMBER_P1 = "license_number_p1",
  LICENSE_NUMBER_P2 = "license_number_p2",
  LICENSE_NUMBER_P3 = "license_number_p3",

  // Split-out license/date-of-birth fields used on this page
  LICENSE_PROVINCE = "license_province",
  LICENSE_EXPIRY_DATE_DAY = "license_expiry_date_day",
  LICENSE_EXPIRY_DATE_MONTH = "license_expiry_date_month",
  LICENSE_EXPIRY_DATE_YEAR = "license_expiry_date_year",
  DOB_DAY = "dob_day",
  DOB_MONTH = "dob_month",
  DOB_YEAR = "dob_year",

  PROOF_OF_AGE_PROVIDED = "proof_of_age_provided",

  // Addresses (current + two previous)
  CURRENT_ADDRESS_ADDRESS = "current_address_address",
  CURRENT_ADDRESS_CITY = "current_address_city",
  CURRENT_ADDRESS_STATE = "current_address_state",
  CURRENT_ADDRESS_POSTAL_CODE = "current_address_postal_code",
  CURRENT_ADDRESS_FROM = "current_address_from", // mm/yyyy
  CURRENT_ADDRESS_TO = "current_address_to", // mm/yyyy

  PREVIOUS_ADDRESS_1_ADDRESS = "previous_address_1_address",
  PREVIOUS_ADDRESS_1_CITY = "previous_address_1_city",
  PREVIOUS_ADDRESS_1_STATE = "previous_address_1_state",
  PREVIOUS_ADDRESS_1_POSTAL_CODE = "previous_address_1_postal_code",
  PREVIOUS_ADDRESS_1_FROM = "previous_address_1_from", // mm/yyyy
  PREVIOUS_ADDRESS_1_TO = "previous_address_1_to", // mm/yyyy

  PREVIOUS_ADDRESS_2_ADDRESS = "previous_address_2_address",
  PREVIOUS_ADDRESS_2_CITY = "previous_address_2_city",
  PREVIOUS_ADDRESS_2_STATE = "previous_address_2_state",
  PREVIOUS_ADDRESS_2_POSTAL_CODE = "previous_address_2_postal_code",
  PREVIOUS_ADDRESS_2_FROM = "previous_address_2_from", // mm/yyyy
  PREVIOUS_ADDRESS_2_TO = "previous_address_2_to", // mm/yyyy

  // Contact info + emergency contact
  HOME_PHONE = "home_phone",
  CELL_PHONE = "cell_phone",
  EMAIL = "email",
  EMERGENCY_CONTACT_NAME = "emergency_contact_name",
  EMERGENCY_CONTACT_PHONE = "emergency_contact_phone",

  LEGAL_RIGHT_TO_WORK_YES = "legal_right_to_work_yes",
  LEGAL_RIGHT_TO_WORK_NO = "legal_right_to_work_no",

  // have you worked with the company before?
  WORKED_WITH_COMPANY_BEFORE_YES = "worked_with_company_before_yes",
  WORKED_WITH_COMPANY_BEFORE_NO = "worked_with_company_before_no",

  // if yes, when?
  WORKWCOMP_PREV_FROM = "workwcomp_prev_from", // mm/yyyy
  WORKWCOMP_PREV_TO = "workwcomp_prev_to", // mm/yyyy
  WORKWCOMP_PREV_RATE = "workwcomp_prev_rate",
  WORKWCOMP_PREV_POSITION = "workwcomp_prev_position",
  WORKWCOMP__PREV_REASON_FOR_LEAVING = "workwcomp _prev_reason_for_leaving",

  // are you currently employed?
  CURRENTLY_EMPLOYED = "currently_employed",
  REFERRAL_SOURCE = "referral_source",
  EXPECTED_PAY_RATE = "expected_pay_rate",

  // Western Canada availability (derived from prequal preferLocalDriving)
  AVAILABLE_WESTERN_CANADA_YES = "available_western_canada_yes",
  AVAILABLE_WESTERN_CANADA_NO = "available_western_canada_no",

  // FAST Card block (page 3)
  HAS_FAST_CARD_NO = "has_fast_card_no",
  HAS_FAST_CARD_YES = "has_fast_card_yes",
  FAST_CARD_NUMBER = "fast_card_number",

  // Optional text area (not yet collected in app, but keep field to leave blank)
  JOB_LIMITATION_NOTES = "job_limitation_notes",

  /* =========================
   * Page 4 - Employment Record (Current + up to 3 previous)
   * Only fill up to 4 total entries.
   * ========================= */
  CURRENT_EMPLOYER_NAME = "current_employer_name",
  CURRENT_SUPERVISOR_NAME = "current_supervisor_name",
  CURRENT_EMPLOYER_ADDRESS = "current_employer_address",
  CURRENT_EMPLOYER_CITY = "current_employer_city",
  CURRENT_EMPLOYER_POSTAL_CODE = "current_employer_postal_code",
  CURRENT_EMPLOYER_SATE = "current_employer_sate", // (template typo retained)
  CURRENT_EMPLOYER_PHONE_1 = "current_employer_phone_1",
  CURRENT_EMPLOYER_PHONE_2 = "current_employer_phone_2",
  CURRENT_EMPLOYER_EMAIL = "current_employer_email",
  CURRENT_POSITION_TITLE = "current_position_title",
  CURRENT_POSITION_FROM = "current_position_from",
  CURRENT_POSITION_TO = "current_position_to",
  CURRENT_SALARY = "current_salary",
  CURRENT_REASON_FOR_LEAVING = "current_reason_for_leaving",
  CURRENT_FMCSR_YES = "current_fmcsr_yes",
  CURRENT_FMCSR_NO = "current_fmcsr_no",
  CURRENT_DOT_SENSITIVE_YES = "current_dot_sensitive_yes",
  CURRENT_DOT_SENSITIVE_NO = "current_dot_sensitive_no",

  PREV_EMPLOYER_1_NAME = "prev_employer_1_name",
  PREV_SUPERVISOR_1_NAME = "prev_supervisor_1_name",
  PREV_EMPLOYER_1_ADDRESS = "prev_employer_1_address",
  PREV_EMPLOYER_1_CITY = "prev_employer_1_city",
  PREV_EMPLOYER_1_POSTAL_CODE = "prev_employer_1_postal_code",
  PREV_EMPLOYER_STATE = "prev_employer_state",
  PREV_EMPLOYER_1_PHONE_1 = "prev_employer_1_phone_1",
  PREV_EMPLOYER_1_PHONE2 = "prev_employer_1_phone2",
  PREV_EMPLOYER_1_EMAIL = "prev_employer_1_email",
  PREV_1_POSITION_TITLE = "prev_1_position_title",
  PREV_1_POSITION_FROM = "prev_1_position_from",
  PREV_1_POSITION_TO = "prev_1_position_to",
  PREV_1_SALARY = "prev_1_salary",
  PREV_1_REASON_FOR_LEAVING = "prev_1_reason_for_leaving",
  PREV_1_FMCSR_YES = "prev_1_fmcsr_yes",
  PREV_1_FMCSR_NO = "prev_1_fmcsr_no",
  PREV_1_DOT_SENSITIVE_YES = "prev_1_dot_sensitive_yes",
  PREV_1_DOT_SENSITIVE_NO = "prev_1_dot_sensitive_no",

  PREV_EMPLOYER_2_NAME = "prev_employer_2_name",
  PREV_SUPERVISOR_2_NAME = "prev_supervisor_2_name",
  PREV_EMPLOYER_2_ADDRESS = "prev_employer_2_address",
  PREV_EMPLOYER_2_PHONE_2 = "prev_employer_2_phone_2",
  PREV_EMPLOYER_2_EMAIL = "prev_employer_2_email",
  PREV_2_POSITION_TITLE = "prev_2_position_title",
  PREV_2_POSITION_FROM = "prev_2_position_from",
  PREV_2_POSITION_TO = "prev_2_position_to",
  PREV_2_SALARY = "prev_2_salary",
  PREV_2_REASON_FOR_LEAVING = "prev_2_reason_for_leaving",
  PREV_EMPLOYER_2_CITY = "prev_employer_2_city",
  PREV_EMPLOYER_2_POSTAL_CODE = "prev_employer_2_postal_code",
  PREV_EMPLOYER_2_STATE = "prev_employer_2_state",
  PREV_EMPLOYER_2_PHONE_1 = "prev_employer_2_phone_1",
  PREV_2_FMCSR_YES = "prev_2_fmcsr_yes",
  PREV_2_FMCSR_NO = "prev_2_fmcsr_no",
  PREV_2_DOT_SENSITIVE_YES = "prev_2_dot_sensitive_yes",
  PREV_2_DOT_SENSITIVE_NO = "prev_2_dot_sensitive_no",

  PREV_EMPLOYER_3_NAME = "prev_employer_3_name",
  PREV_EMPLOYER_3_SUPERVISOR_NAME = "prev_employer_3_supervisor_name",
  PREV_EMPLOYER_3_ADDRESS = "prev_employer_3_address",
  PREV_EMPLOYER_3_CITY = "prev_employer_3_city",
  PREV_EMPLOYER_3_POSTAL_CODE = "prev_employer_3_postal_code",
  PREV_EMPLOYER_3_STATE = "prev_employer_3_state",
  PREV_EMPLOYER_3_PHONE_1 = "prev_employer_3_phone_1",
  PREV_EMPLOYER_3_PHONE_2 = "prev_employer_3_phone_2",
  PREV_EMPLOYER_3_EMAIL = "prev_employer_3_email",
  PREV_3_POSITION_HELD = "prev_3_position_Held",
  PREV_3_FROM = "prev_3_from",
  PREV_3_TO = "prev_3_to",
  PREV_3_SALARY = "prev_3_salary",
  PREV_3_REASON_FOR_LEAVING = "prev_3_reason_for_leaving",
  PREV_3_FMCSR_YES = "prev_3_fmcsr_yes",
  PREV_3_FMCSR_NO = "prev_3_fmcsr_no",
  PREV_3_DOT_SENSITIVE_YES = "prev_3_dot_sensitive_yes",
  PREV_3_DOT_SENSITIVE_NO = "prev_3_dot_sensitive_no",

  /* =========================
   * Page 5 - Accidents/Convictions/Education + License table + HOS
   * (Accident rows: 2 max; License rows: 2 max)
   * ========================= */
  ACCIDENT_1_DATE = "accident_1_date",
  ACCIDENT_1_NATURE = "accident_1_nature",
  ACCIDENT_1_FATALITIES = "accident_1_fatalities",
  ACCIDENT_1_INJURIES = "accident_1_injuries",
  ACCIDENT_2_DATE = "accident_2_date",
  ACCIDENT_2_NATURE = "accident_2_nature",
  ACCIDENT_2_FATALITIE = "accident_2_fatalitie",
  ACCIDENT_2_INJURIE = "accident_2_injurie",

  CONVICTION_1_DATE = "conviction_1_date",
  CONVICTION_1_LOCATION = "conviction_1_location",
  CONVICTION_1_CHARG = "conviction_1_charg",
  CONVICTION_1_PENALTY = "conviction_1_penalty",
  CONVICTION_2_DATE = "conviction_2_date",
  CONVICTION_2_LOCATION = "conviction_2_location",
  CONVICTION_2_CHARGE = "conviction_2_charge",
  CONVICTION_2_PENALTY = "conviction_2_penalty",

  // Education
  GRADE_SCHOOL_1 = "grade_school_1",
  GRADE_SCHOOL_2 = "grade_school_2",
  GRADE_SCHOOL_3 = "grade_school_3",
  GRADE_SCHOOL_4 = "grade_school_4",
  GRADE_SCHOOL_5 = "grade_school_5",
  GRADE_SCHOOL_6 = "grade_school_6",
  GRADE_SCHOOL_7 = "grade_school_7",
  GRADE_SCHOOL_8 = "grade_school_8",
  GRADE_SCHOOL_9 = "grade_school_9",
  GRADE_SCHOOL_10 = "grade_school_10",
  GRADE_SCHOOL_11 = "grade_school_11",
  GRADE_SCHOOL_12 = "grade_school_12",
  COLLEGE_1 = "college_1",
  COLLEGE_2 = "college_2",
  COLLEGE_3 = "college_3",
  COLLEGE_4 = "college_4",
  POSTGRAD_1 = "postgrad_1",
  POSTGRAD_2 = "postgrad_2",
  POSTGRAD_3 = "postgrad_3",
  POSTGRAD_4 = "postgrad_4",

  // License table (2 rows)
  LICENSE_1_STATE = "license_1_state",
  LICENSE_1_NUMBER = "license_1_number",
  LICENSE_1_TYPE = "license_1_type",
  LICENSE_1_EXPIRY_DATE = "license_1_expiry_date",
  LICENSE_2_STATE = "license_2_state",
  LICENSE_2_NUMBER = "license_2_number",
  LICENSE_2_TYPE = "license_2_type",
  LICENSE_2_EXPIRY_DATE = "license_2_expiry_date",

  // License history questions
  LICENSE_DENIED_YES = "license_denied_yes",
  LICENSE_DENIED_NO = "license_denied_no",
  LICENSE_RECEIVED_YE = "license_received_ye",
  LICENSE_RECEIVED_NO = "license_received_no",

  // HOS block (Canadian Hours of Service)
  HOS_NAME = "hos_name",
  HOS_SIN_P1 = "hos_sin_p1",
  HOS_SIN_P2 = "hos_sin_p2",
  HOS_SIN_P3 = "hos_sin_p3",
  HOS_LICENSE_NUMBER_P1 = "hos_license_number_p1",
  HOS_LICENSE_NUMBER_P2 = "hos_license_number_p2",
  HOS_LICENSE_NUMBER_P3 = "hos_license_number_p3",
  HOS_PROVINC = "hos_provinc",

  HOS_DAY_1_HOURS = "hos_day_1_hours",
  HOS_DAY_2_HOURS = "hos_day_2_hours",
  HOS_DAY_3_HOURS = "hos_day_3_hours",
  HOS_DAY_4_HOURS = "hos_day_4_hours",
  HOS_DAY_5_HOURS = "hos_day_5_hours",
  HOS_DAY_6_HOURS = "hos_day_6_hours",
  HOS_DAY_7_HOURS = "hos_day_7_hours",
  HOS_DAY_8_HOURS = "hos_day_8_hours",
  HOS_DAY_9_HOURS = "hos_day_9_hours",
  HOS_DAY_10_HOURS = "hos_day_10_hours",
  HOS_DAY_11_HOURS = "hos_day_11_hours",
  HOS_DAY_12_HOURS = "hos_day_12_hours",
  HOS_DAY_13_HOURS = "hos_day_13_hours",
  HOS_DAY_14_HOURS = "hos_day_14_hours",
  HOS_TOTAL_HOURS = "hos_total_hours",
  HOS_DAY_ONE_DATE = "hos_day_one_date",

  HOS_SIGNATURE = "hos_signature",
  HOS_SIGNATURE_DATE_DAY = "hos_signature_date_day",
  HOS_SIGNATURE_DATE_MONTH = "hos_signature_date_month",
  HOS_SIGNATURE_DATE_YEAR = "hos_signature_date_year",

  /* =========================
   * Page 6 - Declaration + Compliance + Process Record
   * ========================= */
  DECLARATION_APPLICANT_NAME = "declaration_applicant_name",
  DECLARATION_SIGNATURE = "declaration_signature",
  DECLARATION_DATE_DAY = "declaration_date_day",
  DECLARATION_DATE_MONTH = "declaration_date_month",
  DECLARATION_DATE_YEAR = "declaration_date_year",

  COMPLIANCE_LICENSE_NUMBER_P1 = "compliance_license_number_p1",
  COMPLIANCE_LICENSE_NUMBER_P2 = "compliance_license_number_p2",
  COMPLIANCE_LICENSE_NUMBER_P3 = "compliance_license_number_p3",
  COMPLIANCE_LICENSE_PROVINCE = "compliance_license_province",
  COMPLIANCE_LICENSE_EXPIRY_DATE_DAY = "compliance_license_expiry_date_day",
  COMPLIANCE_LICENSE_EXPIRY_DATE_MONTH = "compliance_license_expiry_date_month",
  COMPLIANCE_LICENSE_EXPIRY_DATE_YEAR = "compliance_license_expiry_date_year",

  COMPLIANCE_DRIVER_NAME = "compliance_driver_name",
  COMPLIANCE_DRIVER_SIGNATURE = "compliance_driver_signature",
  COMPLIANCE_DRIVER_SIGNATURE_DATE_DAY = "Compliance_driver_signature_date_day",
  COMPLIANCE_DRIVER_SIGNATURE_DATE_MONTH = "Compliance_driver_signature_date_month",
  COMPLIANCE_DRIVER_SIGNATURE_DATE_YEAR = "Compliance_driver_signature_date_year",

  PROCESS_APPLICANT_HIRED_YES = "process_applicant_hired_yes",
  PROCESS_APPLICANT_HIRED_NO = "process_applicant_hired_no",
  PROCESS_HIRING_DATE = "process_hiring_date",

  PROCESS_TERMINATION_RESIGNED = "process_termination_resigned",
  PROCESS_TERMINATION_TERMINATE = "process_termination_terminate",
  PROCESS_RELEASE_DATE = "process_release_date",

  /* =========================
   * Page 7 - Driver’s Rights
   * ========================= */
  DRIVER_RIGHTS_NAME = "driver_rights_name",
  DRIVER_RIGHTS_SIGNATURE = "driver_rights_signature",
  DRIVER_RIGHTS_DATE_DAY = "driver_rights_date_day",
  DRIVER_RIGHTS_DATE_MONTH = "driver_rights_date_month",
  DRIVER_RIGHTS_DATE_YEAR = "driver_rights_date_year",

  /* =========================
   * Page 8 - Pre-Employment Consent + Medical Declaration
   * ========================= */
  PRE_EMPLOYMENT_CONSENT_NAME = "pre_employment_consent_name",

  MEDICAL_DECLARATION_NAME = "medical_declaration_name",

  MEDICAL_DECLARATION_SIN_P1 = "medical_declaration_sin_p1",
  MEDICAL_DECLARATION_SIN_P2 = "medical_declaration_sin_p2",
  MEDICAL_DECLARATION_SIN_P3 = "medical_declaration_sin_p3",
  MEDICAL_DECLARATION_SIGNATURE = "medical_declaration_signature",
  MEDICAL_DECLARATION_DATE_DAY = "medical_declaration_date_day",
  MEDICAL_DECLARATION_DATE_MONTH = "medical_declaration_date_month",
  MEDICAL_DECLARATION_DATE_YEAR = "medical_declaration_date_year",

  MEDICAL_DECLARATION_WITNESS_NAME = "medical_declaration_witness_name",
  MEDICAL_DECLARATION_WITNESS_SIGNATURE = "medical_declaration_witness_signature",
  MEDICAL_DECLARATION_WITNESS_DATE_DAY = "medical_declaration_witness_date_day",
  MEDICAL_DECLARATION_WITNESS_DATE_MONTH = "medical_declaration_witness_date_month",
  MEDICAL_DECLARATION_WITNESS_DATE_YEAR = "medical_declaration_witness_date_year",

  /* =========================
   * Page 9 - Alcohol & Drug Statement + Applicant Drug Testing Notice
   * ========================= */
  ALCOHOL_DRUG_STATEMENT_DRIVER_NAME = "alcohol_drug_statement_driver_name",

  ALCOHOL_DRUG_STATEMENT_LICENSE_NUMBER_P1 = "alcohol_drug_statement_license_number_p1",
  ALCOHOL_DRUG_STATEMENT_LICENSE_NUMBER_P2 = "alcohol_drug_statement_license_number_p2",
  ALCOHOL_DRUG_STATEMENT_LICENSE_NUMBER_P3 = "alcohol_drug_statement_license_number_p3",

  ALCOHOL_DRUG_STATEMENT_PROVINCE = "alcohol_drug_statement_province",

  ALCOHOL_DRUG_STATEMENT_Q1_YES = "alcohol_drug_statement_q1_yes",
  ALCOHOL_DRUG_STATEMENT_Q1_NO = "alcohol_drug_statement_q1_no",

  ALCOHOL_DRUG_STATEMENT_Q2_YES = "alcohol_drug_statement_q2_yes",
  ALCOHOL_DRUG_STATEMENT_Q2_NO = "alcohol_drug_statement_q2_no",

  DRUG_NOTICE_DRIVER_NAME = "drug_notice_driver_name",
  DRUG_NOTICE_DRIVER_SIGNATURE = "drug_notice_driver_signature",
  DRUG_NOTICE_DATE_DAY = "drug_notice_date_day",
  DRUG_NOTICE_DATE_MONTH = "drug_notice_date_month",
  DRUG_NOTICE_DATE_YEAR = "drug_notice_date_year",

  /* =========================
   * Page 10 - Drug Receipt + Trailer Seal Procedure
   * ========================= */
  DRUG_RECEIPT_DRIVER_NAME = "drug_receipt_driver_name",
  DRUG_RECEIPT_SIGNATURE = "drug_receipt_signature",
  DRUG_RECEIPT_DATE_DAY = "drug_receipt_date_day",
  DRUG_RECEIPT_DATE_MONTH = "drug_receipt_date_month",
  DRUG_RECEIPT_DATE_YEAR = "drug_receipt_date_year",

  DRUG_RECEIPT_WITNESS_NAME = "drug_receipt_witness_name",
  DRUG_RECEIPT_WITNESS_SIGNATURE = "drug_receipt_witness_signature",
  DRUG_RECEIPT_WITNESS_DATE_DAY = "drug_receipt_witness_date_day",
  DRUG_RECEIPT_WITNESS_MONTH = "drug_receipt_witness_month",
  DRUG_RECEIPT_WITNESS_YEAR = "drug_receipt_witness_year",

  TRAILER_SEAL_DRIVER_NAME = "trailer_seal_driver_name",
  TRAILER_SEAL_SIGNATURE = "trailer_seal_signature",
  TRAILER_SEAL_DATE_DAY = "trailer_seal_date_day",
  TRAILER_SEAL_DATE_MONTH = "trailer_seal_date_month",
  TRAILER_SEAL_DATE_YEAR = "trailer_seal_date_year",

  TRAILER_CERTIFICATION_DRIVER_NAME = "trailer_certification_driver_name",
  TRAILER_CERTIFICATION_SIGNATURE = "trailer_certification_signature",
  TRAILER_CERTIFICATION_DATE_DAY = "trailer_certification_date_day",
  TRAILER_CERTIFICATION_DATE_MONTH = "trailer_certification_date_month",
  TRAILER_CERTIFICATION_DATE_YEAR = "trailer_certification_date_year",

  /* =========================
   * Page 11 - Pre-Employment Competency Test (Q1–Q16)
   * + Security block (Q17–Q21)
   * ========================= */
  COMPETENCY_Q1_A = "competency_q1_a",
  COMPETENCY_Q1_B = "competency_q1_b",
  COMPETENCY_Q1_C = "competency_q1_c",
  COMPETENCY_Q1_D = "competency_q1_d",

  COMPETENCY_Q2_A = "competency_q2_a",
  COMPETENCY_Q2_B = "competency_q2_b",
  COMPETENCY_Q2_C = "competency_q2_c",
  COMPETENCY_Q2_D = "competency_q2_d",

  COMPETENCY_Q3_A = "competency_q3_a",
  COMPETENCY_Q3_B = "competency_q3_b",
  COMPETENCY_Q3_C = "competency_q3_c",
  COMPETENCY_Q3_D = "competency_q3_d",

  COMPETENCY_Q4_A = "competency_q4_a",
  COMPETENCY_Q4_B = "competency_q4_b",
  COMPETENCY_Q4_C = "competency_q4_c",
  COMPETENCY_Q4_D = "competency_q4_d",

  COMPETENCY_Q5_A = "competency_q5_a",
  COMPETENCY_Q5_B = "competency_q5_b",
  COMPETENCY_Q5_C = "competency_q5_c",

  COMPETENCY_Q6_A = "competency_q6_a",
  COMPETENCY_Q6_B = "competency_q6_b",
  COMPETENCY_Q6_C = "competency_q6_c",

  COMPETENCY_Q7_A = "competency_q7_a",
  COMPETENCY_Q7_B = "competency_q7_b",
  COMPETENCY_Q7_C = "competency_q7_c",

  COMPETENCY_Q8_A = "competency_q8_a",
  COMPETENCY_Q8_B = "competency_q8_b",
  COMPETENCY_Q8_C = "competency_q8_c",

  COMPETENCY_Q9_A = "competency_q9_a",
  COMPETENCY_Q9_B = "competency_q9_b",
  COMPETENCY_Q9_C = "competency_q9_c",
  COMPETENCY_Q9_D = "competency_q9_d",

  COMPETENCY_Q10_A = "competency_q10_a",
  COMPETENCY_Q10_B = "competency_q10_b",
  COMPETENCY_Q10_C = "competency_q10_c",
  COMPETENCY_Q10_D = "competency_q10_d",

  COMPETENCY_Q11_A = "competency_q11_a",
  COMPETENCY_Q11_B = "competency_q11_b",
  COMPETENCY_Q11_C = "competency_q11_c",
  COMPETENCY_Q11_D = "competency_q11_d",

  COMPETENCY_Q12_A = "competency_q12_a",
  COMPETENCY_Q12_B = "competency_q12_b",
  COMPETENCY_Q12_C = "competency_q12_c",
  COMPETENCY_Q12_D = "competency_q12_d",

  COMPETENCY_Q13_A = "competency_q13_a",
  COMPETENCY_Q13_B = "competency_q13_b",
  COMPETENCY_Q13_C = "competency_q13_c",
  COMPETENCY_Q13_D = "competency_q13_d",

  COMPETENCY_Q14_A = "competency_q14_a",
  COMPETENCY_Q14_B = "competency_q14_b",
  COMPETENCY_Q14_C = "competency_q14_c",
  COMPETENCY_Q14_D = "competency_q14_d",

  COMPETENCY_Q15_A = "competency_q15_a",
  COMPETENCY_Q15_B = "competency_q15_b",
  COMPETENCY_Q15_C = "competency_q15_c",
  COMPETENCY_Q15_D = "competency_q15_d",

  COMPETENCY_Q16_A = "competency_q16_a",
  COMPETENCY_Q16_B = "competency_q16_b",

  // Security block (mapped from competency questions 17–21)
  SECURITY_Q1_A = "security_q1_a",
  SECURITY_Q1_B = "security_q1_b",
  SECURITY_Q1_C = "security_q1_c",
  SECURITY_Q1_D = "security_q1_d",

  SECURITY_Q2_A = "security_q2_a",
  SECURITY_Q2_B = "security_q2_b",
  SECURITY_Q2_C = "security_q2_c",
  SECURITY_Q2_D = "security_q2_d",

  SECURITY_Q3_A = "security_q3_a",
  SECURITY_Q3_B = "security_q3_b",
  SECURITY_Q3_C = "security_q3_c",
  SECURITY_Q3_D = "security_q3_d",

  SECURITY_Q4_A = "security_q4_a",
  SECURITY_Q4_B = "security_q4_b",
  SECURITY_Q4_C = "security_q4_c",
  SECURITY_Q4_D = "security_q4_d",

  SECURITY_Q5_A = "security_q5_a",
  SECURITY_Q5_B = "security_q5_b",
  SECURITY_Q5_C = "security_q5_c",
  SECURITY_Q5_D = "security_q5_d",

  // Signature/date at bottom of page 11
  COMPETENCY_DRIVER_NAME = "competency_driver_name",
  COMPETENCY_SIGNATURE = "competency_signature",

  COMPETENCY_DATE_DAY = "competency_date_day",
  COMPETENCY_DATE_MONTH = "competency_date_month",
  COMPETENCY_DATE_YEAR = "competency_date_year",

  /* =========================
   * Page 12 - Acknowledgement & Insurance
   * ========================= */
  COMP_ACK_DRIVER_NAME = "comp_ack_driver_name",
  COMP_ACK_CONTRACTOR_COMPANY_NAME = "comp_ack_contractor_company_name",
  COMP_ACK_CONTRACTOR_COMPANY_NAME_REPEAT = "comp_ack_contractor_company_name_repeat",
  COMP_ACK_CONTRACTOR_COMPANY_NAME_FINAL = "comp_ack_contractor_company_name_final",

  COMP_ACK_DISPUTE_WITH = "comp_ack_dispute_with",

  COMP_ACK_SIGNATURE_NAME = "comp_ack_signature_name",
  COMP_ACK_SIGNATURE = "comp_ack_signature",
  COMP_ACK_DATE_DAY = "comp_ack_date_day",
  COMP_ACK_DATE_MONTH = "comp_ack_date_month",
  COMP_ACK_DATE_YEAR = "comp_ack_date_year",

  INSURANCE_DRIVER_NAME = "insurance_driver_name",

  INSURANCE_PROMISE_TO_BUY = "insurance_promise_to_buy",
  INSURANCE_ALREADY_HAVE_COVERAGE = "insurance_already_have_coverage",

  INSURANCE_SIGNATURE_NAME = "insurance_signature_name",
  INSURANCE_SIGNATURE = "insurance_signature",
  INSURANCE_DATE_DAY = "insurance_date_day",
  INSURANCE_DATE_MONTH = "insurance_date_month",
  INSURANCE_DATE_YEAR = "insurance_date_year",
}
