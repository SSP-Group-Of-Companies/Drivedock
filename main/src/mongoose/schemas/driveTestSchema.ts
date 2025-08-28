// src/mongoose/schemas/driveTest.schema.ts
import { Schema } from "mongoose";
import { IDriveTestDoc, IOnRoadAssessment, IPreTripAssessment, EDriveTestOverall, EExpectedStandard, PreTripLabels, OnRoadLabels } from "@/types/driveTest.types";
import { photoSchema } from "./sharedSchemas";

/* ───────────────────────── Helpers ───────────────────────── */

const enumValues = <T extends Record<string, string>>(e: T) => Object.values(e);
const enumMessage = (field: string, values: string[]) => `${field} must be one of: ${values.join(", ")}`;

const keysFrom = <T extends { key: string }>(arr: T[]) => arr.map((x) => x.key);

const exactKeysValidator = (expected: string[], sectionPath: string) => ({
  validator: (items: Array<{ key: string }> = []) => {
    if (!Array.isArray(items)) return false;
    const keys = items.map((i) => i?.key).filter(Boolean);
    const uniq = new Set(keys);
    if (uniq.size !== keys.length) return false; // duplicates

    const missing = expected.filter((k) => !uniq.has(k));
    const extra = [...uniq].filter((k) => !expected.includes(k));
    // must match exactly: no missing, no extra, and same count
    return missing.length === 0 && extra.length === 0 && keys.length === expected.length;
  },
  message: (props: any) => {
    const items: Array<{ key: string }> = Array.isArray(props.value) ? props.value : [];
    const keys = new Set(items.map((i) => i?.key).filter(Boolean));
    const missing = expected.filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !expected.includes(k));
    const parts: string[] = [];
    if (missing.length) parts.push(`missing: ${missing.join(", ")}`);
    if (extra.length) parts.push(`extra: ${extra.join(", ")}`);
    return `${sectionPath}.items must include exactly [${expected.join(", ")}]${parts.length ? ` (${parts.join("; ")})` : ""}`;
  },
});

/* ─────────────── Reusable sub-schemas (no _id) ───────────── */

const assessmentItemSchema = new Schema(
  {
    key: { type: String, required: [true, "items[].key is required"] },
    label: { type: String, required: [true, "items[].label is required"] },
    checked: { type: Boolean, default: false },
  },
  { _id: false }
);

const makeAssessmentSectionSchema = (sectionPath: string, expectedKeys: string[]) =>
  new Schema(
    {
      key: { type: String, required: [true, `${sectionPath}.key is required`] },
      title: { type: String, required: [true, `${sectionPath}.title is required`] },
      items: {
        type: [assessmentItemSchema],
        default: [],
        validate: exactKeysValidator(expectedKeys, `${sectionPath}`),
      },
    },
    { _id: false }
  );

/* ─────────────── Expected keys (derived from labels) ─────── */

const PRE_UNDER_HOOD = keysFrom(PreTripLabels.underHood);
const PRE_OUTSIDE = keysFrom(PreTripLabels.outside);
const PRE_UNCOUPLING = keysFrom(PreTripLabels.uncoupling);
const PRE_COUPLING = keysFrom(PreTripLabels.coupling);
const PRE_AIR = keysFrom(PreTripLabels.airSystem);
const PRE_IN_CAB = keysFrom(PreTripLabels.inCab);
const PRE_BACKING = keysFrom(PreTripLabels.backingUp);

const OR_IN_MOTION = keysFrom(OnRoadLabels.inMotion);
const OR_HIGHWAY = keysFrom(OnRoadLabels.highway);
const OR_TURNS = keysFrom(OnRoadLabels.turns);
const OR_DEFENSIVE = keysFrom(OnRoadLabels.defensive);
const OR_GPS = keysFrom(OnRoadLabels.gps);
const OR_TRAFFIC = keysFrom(OnRoadLabels.traffic);

/* ───────────────────── Pre-Trip Assessment ─────────────────── */

const preTripSchema = new Schema<IPreTripAssessment>(
  {
    sections: {
      underHood: {
        type: makeAssessmentSectionSchema("sections.underHood", PRE_UNDER_HOOD),
        required: [true, "sections.underHood is required"],
      },
      outside: {
        type: makeAssessmentSectionSchema("sections.outside", PRE_OUTSIDE),
        required: [true, "sections.outside is required"],
      },
      uncoupling: {
        type: makeAssessmentSectionSchema("sections.uncoupling", PRE_UNCOUPLING),
        required: [true, "sections.uncoupling is required"],
      },
      coupling: {
        type: makeAssessmentSectionSchema("sections.coupling", PRE_COUPLING),
        required: [true, "sections.coupling is required"],
      },
      airSystem: {
        type: makeAssessmentSectionSchema("sections.airSystem", PRE_AIR),
        required: [true, "sections.airSystem is required"],
      },
      inCab: {
        type: makeAssessmentSectionSchema("sections.inCab", PRE_IN_CAB),
        required: [true, "sections.inCab is required"],
      },
      backingUp: {
        type: makeAssessmentSectionSchema("sections.backingUp", PRE_BACKING),
        required: [true, "sections.backingUp is required"],
      },
    },
    supervisorName: { type: String, required: [true, "supervisorName is required"] },
    expectedStandard: {
      type: String,
      enum: {
        values: enumValues(EExpectedStandard),
        message: enumMessage("expectedStandard", enumValues(EExpectedStandard)),
      },
      required: [true, "expectedStandard is required"],
    },
    overallAssessment: {
      type: String,
      enum: {
        values: enumValues(EDriveTestOverall),
        message: enumMessage("overallAssessment", enumValues(EDriveTestOverall)),
      },
      required: [true, "overallAssessment is required"],
    },
    comments: { type: String },
    supervisorSignature: {
      type: photoSchema,
      required: [true, "supervisorSignature is required"],
    },
    assessedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ───────────────────── On-Road Assessment ─────────────────── */

const onRoadSchema = new Schema<IOnRoadAssessment>(
  {
    sections: {
      placingVehicleInMotion: {
        type: makeAssessmentSectionSchema("sections.placingVehicleInMotion", OR_IN_MOTION),
        required: [true, "sections.placingVehicleInMotion is required"],
      },
      highwayDriving: {
        type: makeAssessmentSectionSchema("sections.highwayDriving", OR_HIGHWAY),
        required: [true, "sections.highwayDriving is required"],
      },
      rightLeftTurns: {
        type: makeAssessmentSectionSchema("sections.rightLeftTurns", OR_TURNS),
        required: [true, "sections.rightLeftTurns is required"],
      },
      defensiveDriving: {
        type: makeAssessmentSectionSchema("sections.defensiveDriving", OR_DEFENSIVE),
        required: [true, "sections.defensiveDriving is required"],
      },
      gps: {
        type: makeAssessmentSectionSchema("sections.gps", OR_GPS),
        required: [true, "sections.gps is required"],
      },
      operatingInTraffic: {
        type: makeAssessmentSectionSchema("sections.operatingInTraffic", OR_TRAFFIC),
        required: [true, "sections.operatingInTraffic is required"],
      },
    },
    supervisorName: { type: String, required: [true, "supervisorName is required"] },
    expectedStandard: {
      type: String,
      enum: {
        values: enumValues(EExpectedStandard),
        message: enumMessage("expectedStandard", enumValues(EExpectedStandard)),
      },
      required: [true, "expectedStandard is required"],
    },
    overallAssessment: {
      type: String,
      enum: {
        values: enumValues(EDriveTestOverall),
        message: enumMessage("overallAssessment", enumValues(EDriveTestOverall)),
      },
      required: [true, "overallAssessment is required"],
    },
    needsFlatbedTraining: { type: Boolean, default: undefined },
    comments: { type: String },
    supervisorSignature: {
      type: photoSchema,
      required: [true, "supervisorSignature is required"],
    },
    assessedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ───────────────────── Drive Test Wrapper ─────────────────── */

const driveTestSchema = new Schema<IDriveTestDoc>(
  {
    preTrip: { type: preTripSchema, default: undefined },
    onRoad: { type: onRoadSchema, default: undefined },
    powerUnitType: { type: String, required: [true, "powerUnitType is required"] },
    trailerType: { type: String, required: [true, "trailerType is required"] },
    completed: {
      type: Boolean,
      default: false,
      required: [true, "completed is required"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default driveTestSchema;
