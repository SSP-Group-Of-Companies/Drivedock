// src/lib/pdf/drive-test/mappers/pre-trip.types.ts

/**
 * ======================================================================
 * DriveDock - Pre-Trip Fillable PDF Field Names (dotless for Sejda)
 * ----------------------------------------------------------------------
 * IMPORTANT: Sejda removes dots in field names, so we define field
 * values WITHOUT any '.' characters. Keep these exactly in your PDF.
 * ======================================================================
 */

export enum EPreTripFillableFormFields {
  /* ------------------------------- Header ------------------------------- */
  DRIVER_NAME = "pretripheaderdriver_name",
  DRIVER_LICENSE = "pretripheaderdriver_license", // DL #
  EXAMINER_NAME = "pretripheaderexaminer_name",

  /* ---------------------------- Footer (meta) --------------------------- */
  // Expected Standards — four explicit checkboxes
  EXPECTED_1_NOT_SATISFACTORY = "pretripfooterexpected_standards1_not_satisfactory",
  EXPECTED_2_FAIR = "pretripfooterexpected_standards2_fair",
  EXPECTED_3_SATISFACTORY = "pretripfooterexpected_standards3_satisfactory",
  EXPECTED_4_VERY_GOOD = "pretripfooterexpected_standards4_very_good",

  // Overall assessment — three explicit checkboxes
  OVERALL_PASS = "pretripfooteroverallpass",
  OVERALL_CONDITIONAL_PASS = "pretripfooteroverallconditional_pass",
  OVERALL_FAIL = "pretripfooteroverallfail",

  // Signatures + Dates (two separate lines)
  EXAMINER_SIGNATURE = "pretripfooterexaminer_signature",
  EXAMINER_DATE = "pretripfooterexaminer_date",
  DRIVER_SIGNATURE = "pretripfooterdriver_signature",
  DRIVER_DATE = "pretripfooterdriver_date",

  // Single large comments field (right-most column)
  COMMENTS = "pretripfootercomments",

  // (Optional / legacy) Equipment fields — safe to ignore if not on the template
  POWER_UNIT_TYPE = "pretripfooterpower_unit_type",
  TRAILER_TYPE = "pretripfootertrailer_type",

  // (Optional / legacy) If you previously stored a single assessed date, keep these
  ASSESSED_AT = "pretripfooterassessed_at",
  ASSESSED_AT_YEAR = "pretripfooterassessed_at_year",
  ASSESSED_AT_MONTH = "pretripfooterassessed_at_month",
  ASSESSED_AT_DAY = "pretripfooterassessed_at_day",

  /* ======================= Sections & Items ============================ */
  // ── Under Hood Inspection
  UH_CHECKED_FLUIDS = "pretripunder_hoodchecked_fluidschecked",
  UH_BELTS_HOSES = "pretripunder_hoodbelts_hoseschecked",
  UH_ENGINE_FAN = "pretripunder_hoodengine_fanchecked",
  UH_CHECKED_FRAME = "pretripunder_hoodchecked_framechecked",
  UH_SUSPENSION = "pretripunder_hoodsuspensionchecked",
  UH_CHECKED_BRAKES = "pretripunder_hoodchecked_brakeschecked",

  // ── Out-Side Inspection
  OS_GENERAL_CONDITION_APPEARANCE = "pretripoutside_inspectiongeneral_condition_appearancechecked",
  OS_CHECKED_WHEELS_TIRES = "pretripoutside_inspectionchecked_wheels_tireschecked",
  OS_BRAKES_SUSPENSIONS = "pretripoutside_inspectionbrakes_suspensionschecked",
  OS_FRAME_UNDERCARRIAGE = "pretripoutside_inspectionframe_undercarriagechecked",
  OS_EXHAUST_FUEL = "pretripoutside_inspectionexhaust_fuelchecked",
  OS_LIGHTS_REFLECTORS = "pretripoutside_inspectionlights_reflectorschecked",
  OS_COUPLING_SYSTEMS = "pretripoutside_inspectioncoupling_systemschecked",
  OS_PLATE_INSPECTION_STICKERS = "pretripoutside_inspectionplate_inspection_stickerschecked",

  // ── Uncoupling
  UN_CONFIRMS_STABLE_GROUND_FOR_TRAILER = "pretripuncouplingconfirms_stable_ground_for_trailerchecked",
  UN_LOWERS_LANDING_GEAR_CORRECTLY = "pretripuncouplinglowers_landing_gear_correctlychecked",
  UN_PROPERLY_RELEASES_FIFTH_WHEEL = "pretripuncouplingproperly_releases_fifth_wheelchecked",
  UN_PULLS_OUT_SLOWLY_FROM_UNDER_TRAILER = "pretripuncouplingpulls_out_slowly_from_under_trailerchecked",
  UN_CONFIRMS_TRAILER_PROPERLY_SUPPORTED = "pretripuncouplingconfirms_trailer_is_properly_supportedchecked",
  UN_DISCONNECTS_AIR_ELECTRICAL_LINES_PROPERLY = "pretripuncouplingdisconnects_air_electrical_lines_properlychecked",

  // ── Coupling
  CO_PROPERLY_LINES_UP_UNITS = "pretripcouplingproperly_lines_up_unitschecked",
  CO_CONFIRMS_TRAILER_HEIGHT_BEFORE_BACKING_UNDER = "pretripcouplingconfirms_trailer_height_before_backing_underchecked",
  CO_BACKS_UNDER_SLOWLY = "pretripcouplingbacks_under_slowlychecked",
  CO_TESTS_HOOKUP_WITH_POWER = "pretripcouplingtests_hookup_with_powerchecked",
  CO_VISUALLY_INSPECTS_CONNECTION = "pretripcouplingvisually_inspects_connectionchecked",
  CO_HOOKS_AIR_ELECTRICAL_LINES_PROPERLY = "pretripcouplinghooks_air_electrical_lines_up_properlychecked",
  CO_HANDLES_LANDING_GEAR_PROPERLY_STOWS_HANDLES = "pretripcouplinghandles_landing_gear_properly_stows_handleschecked",

  // ── Air – System Inspection
  AS_LOW_AIR_WARNING = "pretripair_systemlow_air_warningchecked",
  AS_PRESSURE_BUILD_UP = "pretripair_systempressure_build_upchecked",
  AS_GOVERNOR_CUT_IN_OUT = "pretripair_systemgovernor_cut_in_outchecked",
  AS_AIR_LOSS_RATE = "pretripair_systemair_loss_ratechecked",
  AS_TRACTOR_PROTECTION = "pretripair_systemtractor_protectionchecked",
  AS_SYSTEM = "pretripair_systemsystemchecked",
  AS_BRAKE_STROKE_ADJUSTMENTS = "pretripair_systembrake_stroke_adjustmentschecked",
  AS_SPRING_SERVICE_BRAKE_TEST = "pretripair_systemspring_service_brake_testchecked",
  AS_INSPECTS_DRAINS_AIR_TANKS = "pretripair_systeminspects_drains_air_tankschecked",

  // ── In-Cab Inspection
  IC_GLASS_MIRRORS = "pretripin_cabglass_mirrorschecked",
  IC_DOORS_WINDOWS = "pretripin_cabdoors_windowschecked",
  IC_GAUGES_SWITCHES = "pretripin_cabgauges_switcheschecked",
  IC_HEATER_DEFROSTER = "pretripin_cabheater_defrosterchecked",
  IC_WINDSHIELD_WASHER = "pretripin_cabwindshield_washerchecked",
  IC_EMERGENCY_EQUIPMENT = "pretripin_cabemergency_equipmentchecked",
  IC_TRUCK_DOCUMENT_BINDER = "pretripin_cabtruck_document_binderchecked",

  // ── Backing Up
  BU_APPROACHES_BACKING_AREA_SLOWLY = "pretripbacking_upapproaches_backing_area_slowlychecked",
  BU_POSITIONS_CORRECTLY_ON_APPROACH_FOR_THE_BACK = "pretripbacking_uppositions_correctly_on_approach_for_the_backchecked",
  BU_USES_4_WAY_FLASHERS = "pretripbacking_upuses_4_way_flasherschecked",
  BU_GETS_OUT_TO_INSPECT_AREA_PRIOR_TO_STARTING_BACKUP = "pretripbacking_upgets_out_to_inspect_area_prior_to_starting_backupchecked",
  BU_SOUNDS_HORN_BEFORE_BEGINNING_TO_BACKUP = "pretripbacking_upsounds_horn_before_beginning_to_backupchecked",
  BU_CHECKS_FOR_VEHICLES_OR_PEDESTRIANS_WHILE_BACKING = "pretripbacking_upchecks_for_vehicles_or_pedestrians_while_backingchecked",
  BU_AVOIDS_BACKING_FROM_BLIND_SIDE = "pretripbacking_upavoids_backing_from_blind_sidechecked",
  BU_USES_MIRRORS_CORRECTLY_THROUGHOUT_BACKING = "pretripbacking_upuses_mirrors_correctly_throughout_backingchecked",
  BU_STEERS_CORRECTLY_WHILE_BACKING = "pretripbacking_upsteers_correctly_while_backingchecked",
  BU_DOES_NOT_OVERSTEER = "pretripbacking_updoes_not_oversteerchecked",
  BU_PULLS_FORWARD_TO_REPOSITION_AS_REQUIRED = "pretripbacking_uppulls_forward_to_reposition_as_requiredchecked",
  BU_PROPERLY_SECURES_VEHICLES_ONCE_PARKED = "pretripbacking_upproperly_secures_vehicles_once_parkedchecked",
}

/** FieldName -> value used by the PDF filler */
export type PreTripFillablePayload = Partial<Record<EPreTripFillableFormFields, string | boolean>>;
