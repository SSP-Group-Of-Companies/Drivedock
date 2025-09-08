/**
 * ======================================================================
 * DriveDock - Company Policy Packet (SSP) Fillable PDF Field Names
 * ----------------------------------------------------------------------
 * Create these EXACT field names in your PDF editor (Sejda).
 * Only text/date/signature fields — no checkboxes.
 * Page numbers refer to the reference PDF you shared.
 * ======================================================================
 */

export enum ECompanyPolicyFillableFormFields {
  /* ========================== Pg 1 – Medical ========================== */
  // Paragraph blanks
  MD_DRIVER_NAME_TEXT = "companypolicy_md_driver_name_text", // “I, ______ certify…”
  MD_INFORM_CONTACT_NAME = "companypolicy_md_inform_contact_name", // “…I further agree to inform ____ …”
  // Bottom of page
  MD_DRIVER_NAME_PRINT = "companypolicy_md_driver_name_print",
  MD_DRIVER_SIGNATURE = "companypolicy_md_driver_signature",

  /* ===================== Pg 2 – Medical Witness ====================== */
  MD_WITNESS_NAME = "companypolicy_md_witness_name",
  MD_WITNESS_SIGNATURE = "companypolicy_md_witness_signature",
  MD_WITNESS_DATE = "companypolicy_md_witness_date",

  /* =================== Pg 4 – Policy Acknowledgement ================== */
  // TWO driver name fields on this page:
  ACK_DRIVER_NAME_TEXT = "companypolicy_ack_driver_name_text", // “I, ______ understand…”
  ACK_DRIVER_NAME_PRINT = "companypolicy_ack_driver_name_print", // “Driver’s Name: ______”
  ACK_DRIVER_SIGNATURE = "companypolicy_ack_driver_signature",
  ACK_DATE = "companypolicy_ack_date",

  /* ======= Pg 11 – Requirements Acknowledgement (Driver & Witness) ==== */
  REQ_ACK_DRIVER_NAME = "companypolicy_req_ack_driver_name",
  REQ_ACK_DRIVER_SIGNATURE = "companypolicy_req_ack_driver_signature",
  REQ_ACK_DATE = "companypolicy_req_ack_date",
  REQ_ACK_WITNESS_NAME = "companypolicy_req_ack_witness_name",
  REQ_ACK_WITNESS_SIGNATURE = "companypolicy_req_ack_witness_signature",
  REQ_ACK_WITNESS_DATE = "companypolicy_req_ack_witness_date",

  /* ============ Pg 16 – IPASS / Toll Transponder Agreement ============ */
  IPASS_DATE = "companypolicy_ipass_date",
  IPASS_DRIVER_NAME = "companypolicy_ipass_driver_name",
  IPASS_TRUCK_NUMBER = "companypolicy_ipass_truck_number",

  /* ===================== Pg 17 – Speed Locker Policy =================== */
  SPEED_DRIVER_NAME_TEXT = "companypolicy_speed_driver_name_text", // “I, ____ confirm…”
  SPEED_TRUCK_YEAR = "companypolicy_speed_truck_year",
  SPEED_VIN = "companypolicy_speed_vin",
  SPEED_OWNER_OPERATOR_NAME = "companypolicy_speed_owner_operator_name",
  SPEED_SIGNATURE = "companypolicy_speed_signature",

  /* ================== Pg 22 – Final Acknowledgement =================== */
  FINAL_DRIVER_NAME = "companypolicy_final_driver_name",
  FINAL_DRIVER_SIGNATURE = "companypolicy_final_driver_signature",
  FINAL_DRIVER_DATE = "companypolicy_final_driver_date",
  FINAL_WITNESS_NAME = "companypolicy_final_witness_name",
  FINAL_WITNESS_SIGNATURE = "companypolicy_final_witness_signature",
  FINAL_WITNESS_DATE = "companypolicy_final_witness_date",
}

/** FieldName -> value used by the PDF filler */
export type CompanyPolicyPayload = Partial<Record<ECompanyPolicyFillableFormFields, string>>;
