/**
 * ======================================================================
 * DriveDock - Personal Consent (CROFI) Fillable PDF Field Names
 * ----------------------------------------------------------------------
 * Create these EXACT field names in your PDF editor (Sejda).
 *
 * Excludes checkboxes — covers only text/date/signature fields.
 * ======================================================================
 */

export enum EPersonalConsentCfroiFillableFormFields {
  /* ------------------------------ Header ------------------------------- */
  HEADER_APPLICANT_NAME = "cfroiheader_applicant_name", // "I ______ have applied..."
  HEADER_COMPANY_NAME = "cfroiheader_company_name", // "...with ______ (The Company)"

  /* ------------------------------- Footer ------------------------------ */
  FOOTER_APPLICANT_FIRST_NAME = "cfroifooter_applicant_first_name",
  FOOTER_APPLICANT_LAST_NAME = "cfroifooter_applicant_last_name",
  FOOTER_DATE_OF_BIRTH = "cfroifooter_date_of_birth",

  FOOTER_APPLICANT_SIGNATURE = "cfroifooter_applicant_signature",
  FOOTER_DATE = "cfroifooter_date",
}

/** FieldName -> value used by the PDF filler */
export type PersonalConsentCfroiPayload = Partial<Record<EPersonalConsentCfroiFillableFormFields, string>>;
