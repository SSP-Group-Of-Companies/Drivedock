/**
 * ======================================================================
 * DriveDock - Road Test Certificate Fillable PDF Field Names (Sejda)
 * ----------------------------------------------------------------------
 * Create these EXACT field names in your PDF editor.
 * Only text/date/signature fields (no static text).
 * ======================================================================
 */

export enum ERoadTestCertificateFillableFormFields {
  /* --------------------------- Header block ---------------------------- */
  DRIVER_NAME = "roadcert_driver_name",
  SOCIAL_INSURANCE_NUMBER = "roadcert_sin",

  /* --------------------------- License block --------------------------- */
  CDL_NUMBER = "roadcert_cdl_number",
  CDL_STATE_PROVINCE = "roadcert_cdl_state_province",

  /* ----------------------- Equipment / Vehicle ------------------------- */
  POWER_UNIT_TYPE = "roadcert_power_unit_type",
  TRAILER_TYPE = "roadcert_trailer_type",

  /* ------------------------------ Body -------------------------------- */
  // “... under my supervision on ________, 20___ consisting of ______ miles/KM ...”
  TEST_DATE_MONTH_DAY_TEXT = "roadcert_test_date_month_day_text", // e.g., "March 12"
  TEST_DATE_YEAR = "roadcert_test_date_year", // e.g., "24"
  DRIVING_DISTANCE_MILES_KM = "roadcert_driving_distance_miles_km",

  /* --------------------------- Signatures ------------------------------ */
  EXAMINER_SIGNATURE = "roadcert_examiner_signature",
  EXAMINER_DATE = "roadcert_examiner_date",
}

/** FieldName -> value used by the PDF filler */
export type RoadTestCertificatePayload = Partial<Record<ERoadTestCertificateFillableFormFields, string>>;
