/**
 * ===============================================================
 * DriveDock - Drive Test Types (Full)
 * ---------------------------------------------------------------
 * Two-part assessment:
 *   1) Pre-Trip Assessment
 *   2) On-Road Assessment
 *
 * - Section and item keys are strict string-literal unions so your
 *   forms and APIs get compile-time safety.
 * - Items are simple checkboxes with optional comments.
 * - Footer matches your UI: expected standard, overall result,
 *   equipment fields, comments, signature.
 * ===============================================================
 */

import { IPhoto } from "@/types/shared.types";
import { Document } from "mongoose";

/* ───────────────────────── Enums ──────────────────────────── */

export enum EDriveTestOverall {
  PASS = "pass",
  FAIL = "fail",
  CONDITIONAL_PASS = "conditional_pass",
}

export enum EExpectedStandard {
  NOT_SATISFACTORY = "not_satisfactory",
  FAIR = "fair",
  SATISFACTORY = "satisfactory",
  VERY_GOOD = "very_good",
}

/* ─────────────── Generic item & section building blocks ───── */

export interface IAssessmentItem<K extends string = string> {
  key: K; // stable key for the row
  label: string; // UI text
  checked: boolean; // checkbox
}

export interface IAssessmentSection<K extends string = string> {
  key: string; // section stable key
  title: string; // UI title
  items: Array<IAssessmentItem<K>>;
}

/* ============================================================
 *                      PRE‑TRIP ASSESSMENT
 * ========================================================== */

/* ----- Section: Under Hood Inspection ----- */
export type PreTripUnderHoodKey = "checked_fluids" | "belts_hoses" | "engine_fan" | "checked_frame" | "suspension" | "checked_brakes";

/* ----- Section: Out‑Side Inspection ----- */
export type PreTripOutsideKey =
  | "general_condition_appearance"
  | "checked_wheels_tires"
  | "brakes_suspensions"
  | "frame_undercarriage"
  | "exhaust_fuel"
  | "lights_reflectors"
  | "coupling_systems"
  | "plate_inspection_stickers";

/* ----- Section: Uncoupling ----- */
export type PreTripUncouplingKey =
  | "confirms_stable_ground_for_trailer"
  | "lowers_landing_gear_correctly"
  | "properly_releases_fifth_wheel"
  | "pulls_out_slowly_from_under_trailer"
  | "confirms_trailer_is_properly_supported"
  | "disconnects_air_electrical_lines_properly";

/* ----- Section: Coupling ----- */
export type PreTripCouplingKey =
  | "backs_under_slowly"
  | "tests_hookup_with_power"
  | "visually_inspects_connection"
  | "hooks_air_electrical_lines_up_properly"
  | "handles_landing_gear_properly_stows_handles"
  | "properly_lines_up_units"
  | "confirms_trailer_height_before_backing_under";

/* ----- Section: Air – System Inspection ----- */
export type PreTripAirSystemKey =
  | "low_air_warning"
  | "pressure_build_up"
  | "governor_cut_in_out"
  | "air_loss_rate"
  | "tractor_protection"
  | "system"
  | "brake_stroke_adjustments"
  | "spring_service_brake_test"
  | "inspects_drains_air_tanks";

/* ----- Section: In‑Cab Inspection ----- */
export type PreTripInCabKey = "glass_mirrors" | "doors_windows" | "gauges_switches" | "heater_defroster" | "windshield_washer" | "emergency_equipment" | "truck_document_binder";

/* ----- Section: Backing Up ----- */
export type PreTripBackingKey =
  | "approaches_backing_area_slowly"
  | "positions_correctly_on_approach_for_the_back"
  | "uses_4_way_flashers"
  | "gets_out_to_inspect_area_prior_to_starting_backup"
  | "sounds_horn_before_beginning_to_backup"
  | "checks_for_vehicles_or_pedestrians_while_backing"
  | "avoids_backing_from_blind_side"
  | "uses_mirrors_correctly_throughout_backing"
  | "steers_correctly_while_backing"
  | "does_not_oversteer"
  | "pulls_forward_to_reposition_as_required"
  | "properly_secures_vehicles_once_parked";

/* ----- Pre‑Trip composed type ----- */
export interface IPreTripAssessment {
  sections: {
    underHood: IAssessmentSection<PreTripUnderHoodKey>;
    outside: IAssessmentSection<PreTripOutsideKey>;
    uncoupling: IAssessmentSection<PreTripUncouplingKey>;
    coupling: IAssessmentSection<PreTripCouplingKey>;
    airSystem: IAssessmentSection<PreTripAirSystemKey>;
    inCab: IAssessmentSection<PreTripInCabKey>;
    backingUp: IAssessmentSection<PreTripBackingKey>;
  };

  supervisorName: string;
  expectedStandard: EExpectedStandard;
  overallAssessment: EDriveTestOverall;
  comments?: string;
  supervisorSignature: IPhoto;
  assessedAt: Date;
}

/* ============================================================
 *                      ON‑ROAD ASSESSMENT
 * ========================================================== */

/* ----- Section: Placing Vehicle In‑Motion ----- */
export type OnRoadInMotionKey = "selects_correct_gear_for_starting" | "prevents_roll_back_when_starting" | "up_shifts_correctly" | "uses_clutch_properly" | "uses_proper_shifting_techniques";

/* ----- Section: Highway Driving ----- */
export type OnRoadHighwayKey =
  | "approaches_highway_entrance_properly"
  | "uses_acceleration_ramp_properly"
  | "selects_correct_gear_in_advance_of_beginning_turn"
  | "merges_smoothly_with_traffic"
  | "selects_correct_lane_while_driving_along"
  | "checks_mirrors_regularly_for_following_traffic"
  | "maintains_safe_distance_between_vehicles"
  | "checks_other_traffic_before_beginning_turns"
  | "anticipates_actions_of_other_drivers"
  | "uses_deceleration_ramp_properly"
  | "exits_highways_safely"
  | "watches_for_changes_in_traffic_conditions";

/* ----- Section: Right / Left Turns ----- */
export type OnRoadTurnsKey =
  | "signals_turn_well_in_advance"
  | "approaches_the_turn_smoothly"
  | "selects_correct_lane_on_approach_to_turn"
  | "uses_signal_to_merge_with_traffic"
  | "avoids_shifting_while_turning"
  | "turns_into_the_correct_lane"
  | "uses_mirrors_throughout_the_turn";

/* ----- Section: Defensive Driving (incl. cont.) ----- */
export type OnRoadDefensiveKey =
  | "understands_all_vehicle_systems"
  | "understands_obeys_all_warning_and_traffic_signs"
  | "courteous_to_other_drivers"
  | "utilizes_proper_space_management"
  | "good_traffic_awareness_and_analysis"
  | "understands_correct_uses"
  | "constantly_alert_and_attentive"
  | "uses_care_when_crossing_railways"
  | "maintains_constant_speed"
  | "speed_constant_with_basic_ability"
  | "speed_within_legal_limits"
  | "does_not_stop_on_railway_tracks"
  | "regularly_checks_instrument"
  | "properly_inspects_cargo_for_sustainability_securement"
  | "understands_effects_of_unsecured_cargo"
  | "familiar_with_all_equipment_used_for_securement";

/* ----- Section: GPS ----- */
export type OnRoadGpsKey = "good_traffic_awareness_and_analysis_gps" | "understands_correct_uses_gps" | "constantly_alert_and_attentive_gps";

/* ----- Section: Operating In Traffic ----- */
export type OnRoadTrafficKey =
  | "selects_maintains_correct_lane_position"
  | "uses_mirrors_correctly_to_check_traffic"
  | "uses_proper_eye_lead_time_in_traffic"
  | "maintains_safe_distance_from_vehicles"
  | "anticipates_actions_of_other_motorists"
  | "anticipates_changing_traffic_conditions"
  | "observes_properly_on_approach"
  | "slows_gears_down_properly_on_approach"
  | "stops_in_correct_position"
  | "does_not_impede_crosswalks"
  | "leaves_proper_space_in_front"
  | "avoids_sudden_hard_stops"
  | "yields_right_of_way_to_vehicles_pedestrian";

/* ----- On‑Road composed type ----- */
export interface IOnRoadAssessment {
  sections: {
    placingVehicleInMotion: IAssessmentSection<OnRoadInMotionKey>;
    highwayDriving: IAssessmentSection<OnRoadHighwayKey>;
    rightLeftTurns: IAssessmentSection<OnRoadTurnsKey>;
    defensiveDriving: IAssessmentSection<OnRoadDefensiveKey>;
    gps: IAssessmentSection<OnRoadGpsKey>;
    operatingInTraffic: IAssessmentSection<OnRoadTrafficKey>;
  };

  supervisorName: string;
  expectedStandard: EExpectedStandard;
  overallAssessment: EDriveTestOverall;
  needsFlatbedTraining?: boolean;
  milesKmsDriven: number;
  comments?: string;
  supervisorSignature: IPhoto;
  assessedAt: Date;
}

/* ============================================================
 *                    Drive Test Document Wrapper
 * ========================================================== */

export interface IDriveTest {
  preTrip?: IPreTripAssessment;
  onRoad?: IOnRoadAssessment;
  powerUnitType: string;
  trailerType: string;
  completed: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDriveTestDoc extends Document, IDriveTest {}

/* ============================================================
 *                Helper: Make sections with labels
 * ------------------------------------------------------------
 * (Use these factories when building initial form state.)
 * ========================================================== */

export const makeSection = <K extends string>(key: string, title: string, labels: Array<{ key: K; label: string }>): IAssessmentSection<K> => ({
  key,
  title,
  items: labels.map(({ key, label }) => ({ key, label, checked: false })),
});

/* ───────── Optional: label maps you can import for seeding ─── */

export const PreTripLabels = {
  underHood: [
    { key: "checked_fluids", label: "Checked Fluids" },
    { key: "belts_hoses", label: "Belts / Hoses" },
    { key: "engine_fan", label: "Engine / Fan" },
    { key: "checked_frame", label: "Checked Frame" },
    { key: "suspension", label: "Suspension" },
    { key: "checked_brakes", label: "Checked Brakes" },
  ] as Array<{ key: PreTripUnderHoodKey; label: string }>,

  outside: [
    {
      key: "general_condition_appearance",
      label: "General Condition/Appearance",
    },
    { key: "checked_wheels_tires", label: "Checked Wheels/Tires" },
    { key: "brakes_suspensions", label: "Brakes/Suspensions" },
    { key: "frame_undercarriage", label: "Frame / Undercarriage" },
    { key: "exhaust_fuel", label: "Exhaust / Fuel" },
    { key: "lights_reflectors", label: "Lights / Reflectors" },
    { key: "coupling_systems", label: "Coupling Systems" },
    { key: "plate_inspection_stickers", label: "Plate / Inspection Stickers" },
  ] as Array<{ key: PreTripOutsideKey; label: string }>,

  uncoupling: [
    {
      key: "confirms_stable_ground_for_trailer",
      label: "Confirms stable ground for trailer",
    },
    {
      key: "lowers_landing_gear_correctly",
      label: "Lowers landing gear correctly",
    },
    {
      key: "properly_releases_fifth_wheel",
      label: "Properly releases FifthWheel",
    },
    {
      key: "pulls_out_slowly_from_under_trailer",
      label: "Pulls out slowly from under trailer",
    },
    {
      key: "confirms_trailer_is_properly_supported",
      label: "Confirms trailer is properly supported",
    },
    {
      key: "disconnects_air_electrical_lines_properly",
      label: "Disconnects Air Electricals lines properly",
    },
  ] as Array<{ key: PreTripUncouplingKey; label: string }>,

  coupling: [
    { key: "properly_lines_up_units", label: "Properly Lines Up Units" },
    {
      key: "confirms_trailer_height_before_backing_under",
      label: "Confirms Trailer height before backing under",
    },
    { key: "backs_under_slowly", label: "Backs under slowly" },
    { key: "tests_hookup_with_power", label: "Tests Hook-up with Power" },
    {
      key: "visually_inspects_connection",
      label: "Visually inspects Connection",
    },
    {
      key: "hooks_air_electrical_lines_up_properly",
      label: "Hooks Air/Electrical Lines up properly",
    },
    {
      key: "handles_landing_gear_properly_stows_handles",
      label: "Handles landing gear properly / stows handles",
    },
  ] as Array<{ key: PreTripCouplingKey; label: string }>,

  airSystem: [
    { key: "low_air_warning", label: "Low Air Warning" },
    { key: "pressure_build_up", label: "Pressure Build Up" },
    { key: "governor_cut_in_out", label: "Governor Cut in/Out" },
    { key: "air_loss_rate", label: "Air Loss Rate" },
    { key: "tractor_protection", label: "Tractor Protection" },
    { key: "system", label: "System" },
    { key: "brake_stroke_adjustments", label: "Brake Stroke/Adjustments" },
    { key: "spring_service_brake_test", label: "Spring / Service Brake Test" },
    { key: "inspects_drains_air_tanks", label: "Inspects / Drains Air Tanks" },
  ] as Array<{ key: PreTripAirSystemKey; label: string }>,

  inCab: [
    { key: "glass_mirrors", label: "Glass / Mirrors" },
    { key: "doors_windows", label: "Doors / Windows" },
    { key: "gauges_switches", label: "Gauges / Switches" },
    { key: "heater_defroster", label: "Heater / Defroster" },
    { key: "windshield_washer", label: "Windshield / Washer" },
    { key: "emergency_equipment", label: "Emergency Equipment" },
    { key: "truck_document_binder", label: "Truck Document Binder" },
  ] as Array<{ key: PreTripInCabKey; label: string }>,

  backingUp: [
    {
      key: "approaches_backing_area_slowly",
      label: "Approaches backing area slowly",
    },
    {
      key: "positions_correctly_on_approach_for_the_back",
      label: "Positions correctly on approach for the back",
    },
    { key: "uses_4_way_flashers", label: "Uses 4‑Way Flashers" },
    {
      key: "gets_out_to_inspect_area_prior_to_starting_backup",
      label: "Gets out to inspect area prior to starting the back‑up",
    },
    {
      key: "sounds_horn_before_beginning_to_backup",
      label: "Sounds horn before beginning to Back‑up",
    },
    {
      key: "checks_for_vehicles_or_pedestrians_while_backing",
      label: "Checks for Vehicles and/or Pedestrians while Backing‑up",
    },
    {
      key: "avoids_backing_from_blind_side",
      label: "Avoids backing from Blind Side",
    },
    {
      key: "uses_mirrors_correctly_throughout_backing",
      label: "Uses mirrors correctly throughout the backing‑up",
    },
    {
      key: "steers_correctly_while_backing",
      label: "Steers correctly while backing‑up",
    },
    { key: "does_not_oversteer", label: "Does not Oversteer" },
    {
      key: "pulls_forward_to_reposition_as_required",
      label: "Pulls forward to reposition as when required",
    },
    {
      key: "properly_secures_vehicles_once_parked",
      label: "Properly secures vehicles once Parked",
    },
  ] as Array<{ key: PreTripBackingKey; label: string }>,
};

export const OnRoadLabels = {
  inMotion: [
    {
      key: "selects_correct_gear_for_starting",
      label: "Selects correct gear for starting",
    },
    {
      key: "prevents_roll_back_when_starting",
      label: "Prevents Roll‑Back when Starting",
    },
    { key: "up_shifts_correctly", label: "Up shifts Correctly" },
    { key: "uses_clutch_properly", label: "Uses Clutch Properly" },
    {
      key: "uses_proper_shifting_techniques",
      label: "Uses Proper Shifting Techniques",
    },
  ] as Array<{ key: OnRoadInMotionKey; label: string }>,

  highway: [
    {
      key: "approaches_highway_entrance_properly",
      label: "Approaches highway entrance properly",
    },
    {
      key: "uses_acceleration_ramp_properly",
      label: "Uses Acceleration Ramp Properly",
    },
    {
      key: "selects_correct_gear_in_advance_of_beginning_turn",
      label: "Selects correct gear in advance of beginning turn",
    },
    {
      key: "merges_smoothly_with_traffic",
      label: "Merges smoothly with traffic",
    },
    {
      key: "selects_correct_lane_while_driving_along",
      label: "Selects correct lane while driving along",
    },
    {
      key: "checks_mirrors_regularly_for_following_traffic",
      label: "Checks mirrors regularly for following traffic",
    },
    {
      key: "maintains_safe_distance_between_vehicles",
      label: "Maintains safe distance between vehicles",
    },
    {
      key: "checks_other_traffic_before_beginning_turns",
      label: "Checks other traffic before beginning turns",
    },
    {
      key: "anticipates_actions_of_other_drivers",
      label: "Anticipates Actions of Other Drivers",
    },
    {
      key: "uses_deceleration_ramp_properly",
      label: "Uses Deceleration Ramp Properly",
    },
    { key: "exits_highways_safely", label: "Exits Highways Safely" },
    {
      key: "watches_for_changes_in_traffic_conditions",
      label: "Watches for changes in Traffic Conditions",
    },
  ] as Array<{ key: OnRoadHighwayKey; label: string }>,

  turns: [
    {
      key: "signals_turn_well_in_advance",
      label: "Signals turn well in advance",
    },
    {
      key: "approaches_the_turn_smoothly",
      label: "Approaches the turn smoothly",
    },
    {
      key: "selects_correct_lane_on_approach_to_turn",
      label: "Selects correct lane on approach to turn",
    },
    {
      key: "uses_signal_to_merge_with_traffic",
      label: "Uses Signal to merge with Traffic",
    },
    {
      key: "avoids_shifting_while_turning",
      label: "Avoids shifting while turning",
    },
    {
      key: "turns_into_the_correct_lane",
      label: "Turns into the correct lane",
    },
    {
      key: "uses_mirrors_throughout_the_turn",
      label: "Uses mirrors throughout the turn",
    },
  ] as Array<{ key: OnRoadTurnsKey; label: string }>,

  defensive: [
    {
      key: "understands_all_vehicle_systems",
      label: "Understands All Vehicle Systems",
    },
    {
      key: "understands_obeys_all_warning_and_traffic_signs",
      label: "Understands / Obeys all warning and traffic signs",
    },
    { key: "courteous_to_other_drivers", label: "Courteous to Other Drivers" },
    {
      key: "utilizes_proper_space_management",
      label: "Utilizes proper space management",
    },
    {
      key: "good_traffic_awareness_and_analysis",
      label: "Good Traffic awareness and analysis",
    },
    { key: "understands_correct_uses", label: "Understands Correct Uses" },
    {
      key: "constantly_alert_and_attentive",
      label: "Constantly Alert and Attentive",
    },
    {
      key: "uses_care_when_crossing_railways",
      label: "Uses care when crossing railways",
    },
    { key: "maintains_constant_speed", label: "Maintains constant speed" },
    {
      key: "speed_constant_with_basic_ability",
      label: "Speed constant with basic ability",
    },
    { key: "speed_within_legal_limits", label: "Speed within Legal Limits" },
    {
      key: "does_not_stop_on_railway_tracks",
      label: "Does not stop on railway tracks",
    },
    {
      key: "regularly_checks_instrument",
      label: "Regularly checks instrument",
    },
    {
      key: "properly_inspects_cargo_for_sustainability_securement",
      label: "Properly inspects cargo for sustainability / Securement",
    },
    {
      key: "understands_effects_of_unsecured_cargo",
      label: "Understands the effects of unsecured cargo",
    },
    {
      key: "familiar_with_all_equipment_used_for_securement",
      label: "Familiar with all equipment used for securement",
    },
  ] as Array<{ key: OnRoadDefensiveKey; label: string }>,

  gps: [
    {
      key: "good_traffic_awareness_and_analysis_gps",
      label: "Good Traffic awareness and analysis",
    },
    { key: "understands_correct_uses_gps", label: "Understands Correct Uses" },
    {
      key: "constantly_alert_and_attentive_gps",
      label: "Constantly Alert and Attentive",
    },
  ] as Array<{ key: OnRoadGpsKey; label: string }>,

  traffic: [
    {
      key: "selects_maintains_correct_lane_position",
      label: "Selects/Maintains Correct Lane Position",
    },
    {
      key: "uses_mirrors_correctly_to_check_traffic",
      label: "Uses Mirrors correctly to check traffic",
    },
    {
      key: "uses_proper_eye_lead_time_in_traffic",
      label: "Uses Proper Eye Lead Time in Traffic",
    },
    {
      key: "maintains_safe_distance_from_vehicles",
      label: "Maintains Safe Distance from Vehicles",
    },
    {
      key: "anticipates_actions_of_other_motorists",
      label: "Anticipates actions of other Motorists",
    },
    {
      key: "anticipates_changing_traffic_conditions",
      label: "Anticipates changing traffic conditions",
    },
    {
      key: "observes_properly_on_approach",
      label: "Observes Properly on Approach",
    },
    {
      key: "slows_gears_down_properly_on_approach",
      label: "Slows / Gears down properly on approach",
    },
    { key: "stops_in_correct_position", label: "Stops in Correct Position" },
    { key: "does_not_impede_crosswalks", label: "Does not impede Crosswalks" },
    {
      key: "leaves_proper_space_in_front",
      label: "Leaves Proper Space in Front",
    },
    { key: "avoids_sudden_hard_stops", label: "Avoids Sudden / Hard Stops" },
    {
      key: "yields_right_of_way_to_vehicles_pedestrian",
      label: "Yields Right‑of‑way to vehicles / Pedestrian",
    },
  ] as Array<{ key: OnRoadTrafficKey; label: string }>,
};

/* Helper to quickly build typed sections for initial state */
export const makePreTripSections = (): IPreTripAssessment["sections"] => ({
  underHood: makeSection("under_hood", "Under Hood Inspection", PreTripLabels.underHood),
  outside: makeSection("outside_inspection", "Out‑Side Inspection", PreTripLabels.outside),
  uncoupling: makeSection("uncoupling", "Uncoupling", PreTripLabels.uncoupling),
  coupling: makeSection("coupling", "Coupling", PreTripLabels.coupling),
  airSystem: makeSection("air_system", "Air – System Inspection", PreTripLabels.airSystem),
  inCab: makeSection("in_cab", "In‑Cab Inspection", PreTripLabels.inCab),
  backingUp: makeSection("backing_up", "Backing Up", PreTripLabels.backingUp),
});

export const makeOnRoadSections = (): IOnRoadAssessment["sections"] => ({
  placingVehicleInMotion: makeSection("placing_vehicle_in_motion", "Placing Vehicle In‑Motion", OnRoadLabels.inMotion),
  highwayDriving: makeSection("highway_driving", "Highway Driving", OnRoadLabels.highway),
  rightLeftTurns: makeSection("right_left_turns", "Right / Left Turns", OnRoadLabels.turns),
  defensiveDriving: makeSection("defensive_driving", "Defensive Driving", OnRoadLabels.defensive),
  gps: makeSection("gps", "GPS", OnRoadLabels.gps),
  operatingInTraffic: makeSection("operating_in_traffic", "Operating In Traffic", OnRoadLabels.traffic),
});
