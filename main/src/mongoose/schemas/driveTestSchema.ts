import { Schema } from "mongoose";
import { IDriveTest } from "@/types/driveTest.types";
import { photoSchema } from "./sharedSchemas";

const assessmentItemSchema = new Schema(
  {
    key: { type: String, required: true }, // e.g. "checked_fluids"
    label: { type: String, required: true }, // UI label
    checked: { type: Boolean, default: false },
    comment: { type: String },
  },
  { _id: false }
);

const assessmentSectionSchema = new Schema(
  {
    key: { type: String, required: true }, // e.g. "under_hood"
    title: { type: String, required: true }, // e.g. "Under Hood Inspection"
    items: { type: [assessmentItemSchema], default: [] },
    sectionNotes: { type: String },
  },
  { _id: false }
);

const preTripSchema = new Schema(
  {
    sections: {
      underHood: assessmentSectionSchema,
      outside: assessmentSectionSchema,
      uncoupling: assessmentSectionSchema,
      coupling: assessmentSectionSchema,
      airSystem: assessmentSectionSchema,
      inCab: assessmentSectionSchema,
      backingUp: assessmentSectionSchema,
    },
    supervisorName: { type: String, required: true },
    expectedStandard: {
      type: String,
      enum: ["poor", "fair", "good", "excellent"],
      required: true,
    },
    overallAssessment: {
      type: String,
      enum: ["pass", "fail", "conditional_pass"],
      required: true,
    },
    powerUnitType: { type: String },
    trailerType: { type: String },
    comments: { type: String },
    supervisorSignature: {
      url: { type: String },
      key: { type: String },
    },
    assessedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const onRoadSchema = new Schema(
  {
    sections: {
      placingVehicleInMotion: assessmentSectionSchema,
      highwayDriving: assessmentSectionSchema,
      rightLeftTurns: assessmentSectionSchema,
      defensiveDriving: assessmentSectionSchema,
      gps: assessmentSectionSchema,
      operatingInTraffic: assessmentSectionSchema,
    },
    supervisorName: { type: String, required: true },
    expectedStandard: {
      type: String,
      enum: ["poor", "fair", "good", "excellent"],
      required: true,
    },
    overallAssessment: {
      type: String,
      enum: ["pass", "fail", "conditional_pass"],
      required: true,
    },
    powerUnitType: { type: String },
    trailerType: { type: String },
    comments: { type: String },
    supervisorSignature: {
      type: photoSchema,
      required: [true, "supervisor signature is required"],
    },
    assessedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const driveTestSchema = new Schema<IDriveTest>(
  {
    preTrip: preTripSchema,
    onRoad: onRoadSchema,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export default driveTestSchema;
