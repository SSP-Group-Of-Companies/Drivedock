/**
 * ======================================================================
 * DriveDock - Pre-Qualifications (Filled PDF)
 * Fillable PDF Field Names (Sejda)
 * ----------------------------------------------------------------------
 * IMPORTANT
 * - Text/date/signature + checkbox fields only. (No radios on this form.)
 * - Naming mirrors what you used for ISB, with `_CHECKED` for checkboxes.
 * - Phone has 3 boxes; date is onboarding.createdAt (application start).
 * ======================================================================
 */

export enum EPrequalFillableFields {
  /* ====================== Header (top row) ======================= */
  DRIVER_NAME = "prequal_driver_name",
  PHONE_1 = "prequal_phone_1", // area code
  PHONE_2 = "prequal_phone_2", // prefix
  PHONE_3 = "prequal_phone_3", // line
  DATE = "prequal_date", // YYYY-MM-DD

  /* ========================== Category =========================== */
  CAT_COMPANY_DRIVER_CHECKED = "prequal_cat_company_driver_checked",
  CAT_OWNER_OPERATOR_CHECKED = "prequal_cat_owner_operator_checked",
  CAT_OWNER_OPERATOR_DRIVER_CHECKED = "prequal_cat_owner_operator_driver_checked",

  CAT_LONG_HAUL_CHECKED = "prequal_cat_long_haul_checked",
  CAT_SHORT_HAUL_CHECKED = "prequal_cat_short_haul_checked",
  CAT_LOCAL_CHECKED = "prequal_cat_local_checked", // derived from Short Haul
  CAT_SWITCHES_CHECKED = "prequal_cat_switches_checked", // (not derivable -> left false)

  CAT_SINGLE_CHECKED = "prequal_cat_single_checked",
  CAT_TEAM_CHECKED = "prequal_cat_team_checked",

  /* ======================= Qualifications ======================== */
  Q_OVER_23_LOCAL_YES = "prequal_q_over23_local_yes",
  Q_OVER_23_LOCAL_NO = "prequal_q_over23_local_no",

  Q_OVER_25_XBORDER_YES = "prequal_q_over25_xborder_yes",
  Q_OVER_25_XBORDER_NO = "prequal_q_over25_xborder_no",

  Q_DRIVE_MANUAL_YES = "prequal_q_drive_manual_yes",
  Q_DRIVE_MANUAL_NO = "prequal_q_drive_manual_no",

  Q_EXP_2Y_TT_YES = "prequal_q_exp_2y_tt_yes",
  Q_EXP_2Y_TT_NO = "prequal_q_exp_2y_tt_no",

  Q_AT_FAULT_3Y_YES = "prequal_q_at_fault_3y_yes",
  Q_AT_FAULT_3Y_NO = "prequal_q_at_fault_3y_no",

  Q_MORE_THAN_2PTS_YES = "prequal_q_more_than_2pts_yes",
  Q_MORE_THAN_2PTS_NO = "prequal_q_more_than_2pts_no",

  Q_UNPARDONED_RECORD_YES = "prequal_q_unpardoned_record_yes",
  Q_UNPARDONED_RECORD_NO = "prequal_q_unpardoned_record_no",

  Q_LEGAL_RIGHT_WORK_CA_YES = "prequal_q_legal_right_work_ca_yes",
  Q_LEGAL_RIGHT_WORK_CA_NO = "prequal_q_legal_right_work_ca_no",

  Q_CROSS_BORDER_USA_YES = "prequal_q_cross_border_usa_yes",
  Q_CROSS_BORDER_USA_NO = "prequal_q_cross_border_usa_no",

  Q_HAS_FAST_YES = "prequal_q_has_fast_yes",
  Q_HAS_FAST_NO = "prequal_q_has_fast_no",

  /* =========================== Notes ============================= */
  NOTES = "prequal_notes",

  /* ======================== Office Use Only ====================== */
  APPROVED_TO_JOIN_YES = "prequal_office_approved_yes",
  APPROVED_TO_JOIN_NO = "prequal_office_approved_no",

  APPROVED_BY_NAME = "prequal_office_approved_by_name",
  APPROVED_BY_DATE = "prequal_office_approved_by_date",
  APPROVED_BY_SIGNATURE = "prequal_office_approved_by_signature",

  WAIVER_GIVEN_CHECKED = "prequal_office_waiver_given_checked", // keep but we won't tick
  WAIVER_FOR = "prequal_office_waiver_for",
  REASON_FOR_WAIVER = "prequal_office_reason_for_waiver",

  BY_NAME = "prequal_office_by_name",
  BY_DATE = "prequal_office_by_date",
  BY_SIGNATURE = "prequal_office_by_signature",
}

/** FieldName -> value used by the PDF filler */
export type PrequalPayload = Partial<Record<EPrequalFillableFields, string | boolean>>;
