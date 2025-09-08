/**
 * ======================================================================
 * DriveDock - PSP Disclosure & Authorization Fillable PDF Field Names
 * ----------------------------------------------------------------------
 * Create these EXACT field names in your PDF editor (Sejda).
 *
 * Excludes body text — covers only text/date/signature fields.
 * ======================================================================
 */

export enum EPspAuthorizationFillableFormFields {
  /* ------------------------------ Header ------------------------------- */
  HEADER_COMPANY_NAME = "pspheader_company_name", // Prospective Employer in the disclosure header

  /* --------------------------- Authorization --------------------------- */
  AUTH_COMPANY_NAME = "pspauthorization_company_name", // Prospective Employer in "I authorize ______"

  /* ------------------------------- Footer ------------------------------ */
  FOOTER_DATE = "pspfooter_date",
  FOOTER_SIGNATURE = "pspfooter_signature",
  FOOTER_NAME_PRINT = "pspfooter_name_print",
}

/** FieldName -> value used by the PDF filler */
export type PspAuthorizationPayload = Partial<Record<EPspAuthorizationFillableFormFields, string>>;
