import {
  IApplicationFormPage3,
  IAccidentEntry,
  ITrafficConvictionEntry,
  IEducation,
  ICanadianHoursOfService,
  ICanadianDailyHours,
} from "@/types/applicationForm.types";
import { Schema } from "mongoose";

// Accident Entry Schema
const accidentEntrySchema = new Schema<IAccidentEntry>(
  {
    date: { type: String, required: true },
    natureOfAccident: { type: String, required: true },
    fatalities: {
      type: Number,
      min: 0,
      required: true,
    },
    injuries: {
      type: Number,
      min: 0,
      required: true,
    },
  },
  { _id: false }
);

// Conviction Entry Schema
const convictionEntrySchema = new Schema<ITrafficConvictionEntry>(
  {
    date: { type: String, required: true },
    location: { type: String, required: true },
    charge: { type: String, required: true },
    penalty: { type: String, required: true },
  },
  { _id: false }
);

// Education Schema
const educationSchema = new Schema<IEducation>(
  {
    gradeSchool: {
      type: Number,
      min: 0,
      max: 20,
      default: 0,
      required: true,
    },
    college: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
      required: true,
    },
    postGraduate: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
      required: true,
    },
  },
  { _id: false }
);

// Canadian Daily Hours Schema
const dailyHoursSchema = new Schema<ICanadianDailyHours>(
  {
    day: {
      type: Number,
      min: 1,
      max: 14,
      required: true,
    },
    hours: {
      type: Number,
      min: 0,
      max: 24,
      required: true,
    },
  },
  { _id: false }
);

// Canadian Hours of Service Schema
const canadianHoursSchema = new Schema<ICanadianHoursOfService>(
  {
    dayOneDate: { type: String, required: true },
    dailyHours: {
      type: [dailyHoursSchema],
      validate: {
        validator: (v: ICanadianDailyHours[]) => v.length === 14,
        message: "Exactly 14 days of hours must be provided",
      },
      required: true,
    },
  },
  { _id: false }
);

// Page 3 Schema
export const applicationFormPage3Schema = new Schema<IApplicationFormPage3>(
  {
    accidentHistory: {
      type: [accidentEntrySchema],
      default: [],
      required: true,
    },
    trafficConvictions: {
      type: [convictionEntrySchema],
      default: [],
      required: true,
    },
    education: {
      type: educationSchema,
      required: true,
    },
    canadianHoursOfService: {
      type: canadianHoursSchema,
      required: true,
    },
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

applicationFormPage3Schema
  .virtual("canadianHoursOfService.totalHours")
  .get(function (this) {
    try {
      const daily = this.canadianHoursOfService?.dailyHours ?? [];
      return daily.reduce(
        (sum: number, entry) => sum + (entry.hours || 0),
        0
      );
    } catch {
      return 0;
    }
  });