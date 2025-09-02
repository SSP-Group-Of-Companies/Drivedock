// src/types/preTripFillableForm.types.ts

/**
 * ======================================================================
 * DriveDock - Pre-Trip Fillable PDF Field Names (matches template image)
 * ----------------------------------------------------------------------
 * Create these EXACT field names in your PDF editor (e.g., Sejda).
 *
 * Conventions:
 * - Checkbox items: pretrip.<section>.<item>.checked
 * - Per-item comment (optional if you want them): pretrip.<section>.<item>.comment
 * - Section notes (optional): pretrip.<section>.notes
 * - Header/footer/meta: pretrip.header.* , pretrip.footer.*
 *
 * Header (top row):
 *   - Driver Name, DL #, Examiner Name
 *
 * Footer (bottom area):
 *   - Expected Standards: four checkboxes (1–4)
 *   - Overall Assessment: three checkboxes (pass, conditional pass, fail)
 *   - Examiner Signatures + Date
 *   - Driver Signatures + Date
 *   - Comments: one large text field (right column)
 *
 * Notes:
 * - POWER_UNIT_TYPE / TRAILER_TYPE are not visible on this template;
 *   they remain here as optional/backward-compat fields (ignore if not used).
 * - If you prefer a radio group for Overall, keep the three checkboxes and
 *   check exactly one based on your data.
 * ======================================================================
 */

export enum EPreTripFillableFormFields {
  /* ------------------------------- Header ------------------------------- */
  DRIVER_NAME = "pretrip.header.driver_name",
  DRIVER_LICENSE = "pretrip.header.driver_license", // DL #
  EXAMINER_NAME = "pretrip.header.examiner_name",

  /* ---------------------------- Footer (meta) --------------------------- */
  // Expected Standards — four explicit checkboxes
  EXPECTED_1_NOT_SATISFACTORY = "pretrip.footer.expected_standards.1_not_satisfactory",
  EXPECTED_2_FAIR = "pretrip.footer.expected_standards.2_fair",
  EXPECTED_3_SATISFACTORY = "pretrip.footer.expected_standards.3_satisfactory",
  EXPECTED_4_VERY_GOOD = "pretrip.footer.expected_standards.4_very_good",

  // Overall assessment — three explicit checkboxes on the template
  OVERALL_PASS = "pretrip.footer.overall.pass",
  OVERALL_CONDITIONAL_PASS = "pretrip.footer.overall.conditional_pass",
  OVERALL_FAIL = "pretrip.footer.overall.fail",

  // Signatures + Dates (two separate lines on the template)
  EXAMINER_SIGNATURE = "pretrip.footer.examiner_signature",
  EXAMINER_DATE = "pretrip.footer.examiner_date",
  DRIVER_SIGNATURE = "pretrip.footer.driver_signature",
  DRIVER_DATE = "pretrip.footer.driver_date",

  // Single large comments field (right-most column)
  COMMENTS = "pretrip.footer.comments",

  // (Optional / legacy) Equipment fields — keep if your workflow still uses them elsewhere
  POWER_UNIT_TYPE = "pretrip.footer.power_unit_type",
  TRAILER_TYPE = "pretrip.footer.trailer_type",

  // (Optional / legacy) If you previously stored a single assessed date, keep these
  ASSESSED_AT = "pretrip.footer.assessed_at",
  ASSESSED_AT_YEAR = "pretrip.footer.assessed_at_year",
  ASSESSED_AT_MONTH = "pretrip.footer.assessed_at_month",
  ASSESSED_AT_DAY = "pretrip.footer.assessed_at_day",

  /* ======================= Sections & Items ============================ */
  // ── Under Hood Inspection
  UH_CHECKED_FLUIDS = "pretrip.under_hood.checked_fluids.checked",
  UH_BELTS_HOSES = "pretrip.under_hood.belts_hoses.checked",
  UH_ENGINE_FAN = "pretrip.under_hood.engine_fan.checked",
  UH_CHECKED_FRAME = "pretrip.under_hood.checked_frame.checked",
  UH_SUSPENSION = "pretrip.under_hood.suspension.checked",
  UH_CHECKED_BRAKES = "pretrip.under_hood.checked_brakes.checked",

  // ── Out-Side Inspection
  OS_GENERAL_CONDITION_APPEARANCE = "pretrip.outside_inspection.general_condition_appearance.checked",
  OS_CHECKED_WHEELS_TIRES = "pretrip.outside_inspection.checked_wheels_tires.checked",
  OS_BRAKES_SUSPENSIONS = "pretrip.outside_inspection.brakes_suspensions.checked",
  OS_FRAME_UNDERCARRIAGE = "pretrip.outside_inspection.frame_undercarriage.checked",
  OS_EXHAUST_FUEL = "pretrip.outside_inspection.exhaust_fuel.checked",
  OS_LIGHTS_REFLECTORS = "pretrip.outside_inspection.lights_reflectors.checked",
  OS_COUPLING_SYSTEMS = "pretrip.outside_inspection.coupling_systems.checked",
  OS_PLATE_INSPECTION_STICKERS = "pretrip.outside_inspection.plate_inspection_stickers.checked",

  // ── Uncoupling
  UN_CONFIRMS_STABLE_GROUND_FOR_TRAILER = "pretrip.uncoupling.confirms_stable_ground_for_trailer.checked",
  UN_LOWERS_LANDING_GEAR_CORRECTLY = "pretrip.uncoupling.lowers_landing_gear_correctly.checked",
  UN_PROPERLY_RELEASES_FIFTH_WHEEL = "pretrip.uncoupling.properly_releases_fifth_wheel.checked",
  UN_PULLS_OUT_SLOWLY_FROM_UNDER_TRAILER = "pretrip.uncoupling.pulls_out_slowly_from_under_trailer.checked",
  UN_CONFIRMS_TRAILER_PROPERLY_SUPPORTED = "pretrip.uncoupling.confirms_trailer_is_properly_supported.checked",
  UN_DISCONNECTS_AIR_ELECTRICAL_LINES_PROPERLY = "pretrip.uncoupling.disconnects_air_electrical_lines_properly.checked",

  // ── Coupling
  CO_PROPERLY_LINES_UP_UNITS = "pretrip.coupling.properly_lines_up_units.checked",
  CO_CONFIRMS_TRAILER_HEIGHT_BEFORE_BACKING_UNDER = "pretrip.coupling.confirms_trailer_height_before_backing_under.checked",
  CO_BACKS_UNDER_SLOWLY = "pretrip.coupling.backs_under_slowly.checked",
  CO_TESTS_HOOKUP_WITH_POWER = "pretrip.coupling.tests_hookup_with_power.checked",
  CO_VISUALLY_INSPECTS_CONNECTION = "pretrip.coupling.visually_inspects_connection.checked",
  CO_HOOKS_AIR_ELECTRICAL_LINES_PROPERLY = "pretrip.coupling.hooks_air_electrical_lines_up_properly.checked",
  CO_HANDLES_LANDING_GEAR_PROPERLY_STOWS_HANDLES = "pretrip.coupling.handles_landing_gear_properly_stows_handles.checked",

  // ── Air – System Inspection
  AS_LOW_AIR_WARNING = "pretrip.air_system.low_air_warning.checked",
  AS_PRESSURE_BUILD_UP = "pretrip.air_system.pressure_build_up.checked",
  AS_GOVERNOR_CUT_IN_OUT = "pretrip.air_system.governor_cut_in_out.checked",
  AS_AIR_LOSS_RATE = "pretrip.air_system.air_loss_rate.checked",
  AS_TRACTOR_PROTECTION = "pretrip.air_system.tractor_protection.checked",
  AS_SYSTEM = "pretrip.air_system.system.checked",
  AS_BRAKE_STROKE_ADJUSTMENTS = "pretrip.air_system.brake_stroke_adjustments.checked",
  AS_SPRING_SERVICE_BRAKE_TEST = "pretrip.air_system.spring_service_brake_test.checked",
  AS_INSPECTS_DRAINS_AIR_TANKS = "pretrip.air_system.inspects_drains_air_tanks.checked",

  // ── In-Cab Inspection
  IC_GLASS_MIRRORS = "pretrip.in_cab.glass_mirrors.checked",
  IC_DOORS_WINDOWS = "pretrip.in_cab.doors_windows.checked",
  IC_GAUGES_SWITCHES = "pretrip.in_cab.gauges_switches.checked",
  IC_HEATER_DEFROSTER = "pretrip.in_cab.heater_defroster.checked",
  IC_WINDSHIELD_WASHER = "pretrip.in_cab.windshield_washer.checked",
  IC_EMERGENCY_EQUIPMENT = "pretrip.in_cab.emergency_equipment.checked",
  IC_TRUCK_DOCUMENT_BINDER = "pretrip.in_cab.truck_document_binder.checked",

  // ── Backing Up
  BU_APPROACHES_BACKING_AREA_SLOWLY = "pretrip.backing_up.approaches_backing_area_slowly.checked",
  BU_POSITIONS_CORRECTLY_ON_APPROACH_FOR_THE_BACK = "pretrip.backing_up.positions_correctly_on_approach_for_the_back.checked",
  BU_USES_4_WAY_FLASHERS = "pretrip.backing_up.uses_4_way_flashers.checked",
  BU_GETS_OUT_TO_INSPECT_AREA_PRIOR_TO_STARTING_BACKUP = "pretrip.backing_up.gets_out_to_inspect_area_prior_to_starting_backup.checked",
  BU_SOUNDS_HORN_BEFORE_BEGINNING_TO_BACKUP = "pretrip.backing_up.sounds_horn_before_beginning_to_backup.checked",
  BU_CHECKS_FOR_VEHICLES_OR_PEDESTRIANS_WHILE_BACKING = "pretrip.backing_up.checks_for_vehicles_or_pedestrians_while_backing.checked",
  BU_AVOIDS_BACKING_FROM_BLIND_SIDE = "pretrip.backing_up.avoids_backing_from_blind_side.checked",
  BU_USES_MIRRORS_CORRECTLY_THROUGHOUT_BACKING = "pretrip.backing_up.uses_mirrors_correctly_throughout_backing.checked",
  BU_STEERS_CORRECTLY_WHILE_BACKING = "pretrip.backing_up.steers_correctly_while_backing.checked",
  BU_DOES_NOT_OVERSTEER = "pretrip.backing_up.does_not_oversteer.checked",
  BU_PULLS_FORWARD_TO_REPOSITION_AS_REQUIRED = "pretrip.backing_up.pulls_forward_to_reposition_as_required.checked",
  BU_PROPERLY_SECURES_VEHICLES_ONCE_PARKED = "pretrip.backing_up.properly_secures_vehicles_once_parked.checked",
}

/** FieldName -> value used by the PDF filler */
export type PreTripFillablePayload = Partial<Record<EPreTripFillableFormFields, string | boolean>>;
