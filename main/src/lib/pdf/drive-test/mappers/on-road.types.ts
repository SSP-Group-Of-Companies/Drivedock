// lib/pdf/drive-test/mappers/on-road.types.ts

/**
 * ======================================================================
 * DriveDock - On-Road Fillable PDF Field Names (dotless for Sejda)
 * ----------------------------------------------------------------------
 * Create these EXACT field names in your PDF editor.
 *
 * Header row:
 *   - Driver Name, DL, Date
 * Second row:
 *   - Type: Company, Owner Operator, Owner Driver
 *   - Role: Single, Team, City, Short Runs (multiple can be checked)
 *
 * Body:
 *   - Sections: In-Motion, Operating In Traffic, Right/Left Turns,
 *     Highway Driving, Defensive Driving (incl. cont.), GPS
 *
 * Footer:
 *   - Standards (1–4)
 *   - Overall Assessment (Pass / Conditional Pass / Fail)
 *   - Trainable (YES / NO)
 *   - Comments by Road Tester (single large text)
 *   - Examiner Signature + Date
 *   - Driver Signature + Date
 * ======================================================================
 */

export enum EOnRoadFillableFormFields {
  /* ------------------------------ Header ------------------------------- */
  HEADER_DRIVER_NAME = "onroadheaderdriver_name",
  HEADER_DRIVER_LICENSE = "onroadheaderdriver_license",
  HEADER_DATE = "onroadheaderdate",

  /* ------------------------- Type & Role row --------------------------- */
  TYPE_COMPANY = "onroadtype_company",
  TYPE_OWNER_OPERATOR = "onroadtype_owner_operator",
  TYPE_OWNER_DRIVER = "onroadtype_owner_driver",

  ROLE_SINGLE = "onroadrole_single",
  ROLE_TEAM = "onroadrole_team",
  ROLE_CITY = "onroadrole_city",
  ROLE_SHORT_RUNS = "onroadrole_short_runs",

  /* -------------------- Placing Vehicle In-Motion ---------------------- */
  IM_SELECTS_CORRECT_GEAR_FOR_STARTING = "onroad_inmotion_selects_correct_gear_for_starting_checked",
  IM_PREVENTS_ROLL_BACK_WHEN_STARTING = "onroad_inmotion_prevents_roll_back_when_starting_checked",
  IM_UP_SHIFTS_CORRECTLY = "onroad_inmotion_up_shifts_correctly_checked",
  IM_USES_CLUTCH_PROPERLY = "onroad_inmotion_uses_clutch_properly_checked",
  IM_USES_PROPER_SHIFTING_TECHNIQUES = "onroad_inmotion_uses_proper_shifting_techniques_checked",

  /* ------------------------ Operating In Traffic ----------------------- */
  TR_SELECTS_MAINTAINS_CORRECT_LANE_POSITION = "onroad_traffic_selects_maintains_correct_lane_position_checked",
  TR_USES_MIRRORS_CORRECTLY_TO_CHECK_TRAFFIC = "onroad_traffic_uses_mirrors_correctly_to_check_traffic_checked",
  TR_USES_PROPER_EYE_LEAD_TIME_IN_TRAFFIC = "onroad_traffic_uses_proper_eye_lead_time_in_traffic_checked",
  TR_MAINTAINS_SAFE_DISTANCE_FROM_VEHICLES = "onroad_traffic_maintains_safe_distance_from_vehicles_checked",
  TR_ANTICIPATES_ACTIONS_OF_OTHER_MOTORISTS = "onroad_traffic_anticipates_actions_of_other_motorists_checked",
  TR_ANTICIPATES_CHANGING_TRAFFIC_CONDITIONS = "onroad_traffic_anticipates_changing_traffic_conditions_checked",
  TR_OBSERVES_PROPERLY_ON_APPROACH = "onroad_traffic_observes_properly_on_approach_checked",
  TR_SLOWS_GEARS_DOWN_PROPERLY_ON_APPROACH = "onroad_traffic_slows_gears_down_properly_on_approach_checked",
  TR_STOPS_IN_CORRECT_POSITION = "onroad_traffic_stops_in_correct_position_checked",
  TR_DOES_NOT_IMPEDE_CROSSWALKS = "onroad_traffic_does_not_impede_crosswalks_checked",
  TR_LEAVES_PROPER_SPACE_IN_FRONT = "onroad_traffic_leaves_proper_space_in_front_checked",
  TR_AVOIDS_SUDDEN_HARD_STOPS = "onroad_traffic_avoids_sudden_hard_stops_checked",
  TR_YIELDS_RIGHT_OF_WAY_TO_VEHICLES_PEDESTRIAN = "onroad_traffic_yields_right_of_way_to_vehicles_pedestrian_checked",

  /* --------------------------- Right / Left Turns ---------------------- */
  TU_SIGNALS_TURN_WELL_IN_ADVANCE = "onroad_turns_signals_turn_well_in_advance_checked",
  TU_APPROACHES_THE_TURN_SMOOTHLY = "onroad_turns_approaches_the_turn_smoothly_checked",
  TU_SELECTS_CORRECT_LANE_ON_APPROACH_TO_TURN = "onroad_turns_selects_correct_lane_on_approach_to_turn_checked",
  TU_USES_SIGNAL_TO_MERGE_WITH_TRAFFIC = "onroad_turns_uses_signal_to_merge_with_traffic_checked",
  TU_AVOIDS_SHIFTING_WHILE_TURNING = "onroad_turns_avoids_shifting_while_turning_checked",
  TU_TURNS_INTO_THE_CORRECT_LANE = "onroad_turns_turns_into_the_correct_lane_checked",
  TU_USES_MIRRORS_THROUGHOUT_THE_TURN = "onroad_turns_uses_mirrors_throughout_the_turn_checked",

  /* ---------------------------- Highway Driving ------------------------ */
  HW_APPROACHES_HIGHWAY_ENTRANCE_PROPERLY = "onroad_highway_approaches_highway_entrance_properly_checked",
  HW_USES_ACCELERATION_RAMP_PROPERLY = "onroad_highway_uses_acceleration_ramp_properly_checked",
  HW_SELECTS_CORRECT_GEAR_IN_ADVANCE_OF_BEGINNING_TURN = "onroad_highway_selects_correct_gear_in_advance_of_beginning_turn_checked",
  HW_MERGES_SMOOTHLY_WITH_TRAFFIC = "onroad_highway_merges_smoothly_with_traffic_checked",
  HW_SELECTS_CORRECT_LANE_WHILE_DRIVING_ALONG = "onroad_highway_selects_correct_lane_while_driving_along_checked",
  HW_CHECKS_MIRRORS_REGULARLY_FOR_FOLLOWING_TRAFFIC = "onroad_highway_checks_mirrors_regularly_for_following_traffic_checked",
  HW_MAINTAINS_SAFE_DISTANCE_BETWEEN_VEHICLES = "onroad_highway_maintains_safe_distance_between_vehicles_checked",
  HW_CHECKS_OTHER_TRAFFIC_BEFORE_BEGINNING_TURNS = "onroad_highway_checks_other_traffic_before_beginning_turns_checked",
  HW_ANTICIPATES_ACTIONS_OF_OTHER_DRIVERS = "onroad_highway_anticipates_actions_of_other_drivers_checked",
  HW_USES_DECELERATION_RAMP_PROPERLY = "onroad_highway_uses_deceleration_ramp_properly_checked",
  HW_EXITS_HIGHWAYS_SAFELY = "onroad_highway_exits_highways_safely_checked",
  HW_WATCHES_FOR_CHANGES_IN_TRAFFIC_CONDITIONS = "onroad_highway_watches_for_changes_in_traffic_conditions_checked",

  /* --------------------------- Defensive Driving ----------------------- */
  DD_UNDERSTANDS_ALL_VEHICLE_SYSTEMS = "onroad_defensive_understands_all_vehicle_systems_checked",
  DD_UNDERSTANDS_OBEYS_ALL_WARNING_AND_TRAFFIC_SIGNS = "onroad_defensive_understands_obeys_all_warning_and_traffic_signs_checked",
  DD_COURTEOUS_TO_OTHER_DRIVERS = "onroad_defensive_courteous_to_other_drivers_checked",
  DD_UTILIZES_PROPER_SPACE_MANAGEMENT = "onroad_defensive_utilizes_proper_space_management_checked",
  DD_GOOD_TRAFFIC_AWARENESS_AND_ANALYSIS = "onroad_defensive_good_traffic_awareness_and_analysis_checked",
  DD_UNDERSTANDS_CORRECT_USES = "onroad_defensive_understands_correct_uses_checked",
  DD_CONSTANTLY_ALERT_AND_ATTENTIVE = "onroad_defensive_constantly_alert_and_attentive_checked",
  DD_USES_CARE_WHEN_CROSSING_RAILWAYS = "onroad_defensive_uses_care_when_crossing_railways_checked",
  DD_MAINTAINS_CONSTANT_SPEED = "onroad_defensive_maintains_constant_speed_checked",
  DD_SPEED_CONSTANT_WITH_BASIC_ABILITY = "onroad_defensive_speed_constant_with_basic_ability_checked",
  DD_SPEED_WITHIN_LEGAL_LIMITS = "onroad_defensive_speed_within_legal_limits_checked",
  DD_DOES_NOT_STOP_ON_RAILWAY_TRACKS = "onroad_defensive_does_not_stop_on_railway_tracks_checked",
  DD_REGULARLY_CHECKS_INSTRUMENT = "onroad_defensive_regularly_checks_instrument_checked",
  DD_PROPERLY_INSPECTS_CARGO_FOR_SUSTAINABILITY_SECUREMENT = "onroad_defensive_properly_inspects_cargo_for_sustainability_securement_checked",
  DD_UNDERSTANDS_EFFECTS_OF_UNSECURED_CARGO = "onroad_defensive_understands_effects_of_unsecured_cargo_checked",
  DD_FAMILIAR_WITH_ALL_EQUIPMENT_USED_FOR_SECUREMENT = "onroad_defensive_familiar_with_all_equipment_used_for_securement_checked",

  /* --------------------------------- GPS ------------------------------- */
  GPS_GOOD_TRAFFIC_AWARENESS_AND_ANALYSIS_GPS = "onroad_gps_good_traffic_awareness_and_analysis_gps_checked",
  GPS_UNDERSTANDS_CORRECT_USES_GPS = "onroad_gps_understands_correct_uses_gps_checked",
  GPS_CONSTANTLY_ALERT_AND_ATTENTIVE_GPS = "onroad_gps_constantly_alert_and_attentive_gps_checked",

  /* ------------------------------- Footer ------------------------------ */
  FOOTER_EXPECTED_1 = "onroad_footer_expected_1",
  FOOTER_EXPECTED_2 = "onroad_footer_expected_2",
  FOOTER_EXPECTED_3 = "onroad_footer_expected_3",
  FOOTER_EXPECTED_4 = "onroad_footer_expected_4",

  FOOTER_OVERALL_PASS = "onroad_footer_overall_pass",
  FOOTER_OVERALL_CONDITIONAL_PASS = "onroad_footer_overall_conditional_pass",
  FOOTER_OVERALL_FAIL = "onroad_footer_overall_fail",

  FOOTER_TRAINABLE_YES = "onroad_footer_trainable_yes",
  FOOTER_TRAINABLE_NO = "onroad_footer_trainable_no",

  FOOTER_COMMENTS = "onroad_footer_comments",

  EXAMINER_SIGNATURE = "onroad_examiner_signature",
  DRIVER_SIGNATURE = "onroad_driver_signature",
  EXAMINER_DATE = "onroad_examiner_date",
  DRIVER_DATE = "onroad_driver_date",
}

/** FieldName -> value used by the PDF filler */
export type OnRoadFillablePayload = Partial<Record<EOnRoadFillableFormFields, string | boolean>>;
