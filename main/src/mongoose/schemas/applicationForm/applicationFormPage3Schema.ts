import { IApplicationFormPage3, IAccidentEntry, ITrafficConvictionEntry, IEducation, ICanadianHoursOfService, ICanadianDailyHours } from "@/types/applicationForm.types";
import { Schema } from "mongoose";

// Accident Entry Schema
const accidentEntrySchema = new Schema<IAccidentEntry>({
  date: { type: Date, required: [true, "Accident date is required."] },
  natureOfAccident: {
    type: String,
    required: [true, "Nature of accident is required."],
  },
  fatalities: {
    type: Number,
    min: [0, "Fatalities cannot be negative."],
    required: [true, "Number of fatalities is required."],
  },
  injuries: {
    type: Number,
    min: [0, "Injuries cannot be negative."],
    required: [true, "Number of injuries is required."],
  },
});

// Conviction Entry Schema
const convictionEntrySchema = new Schema<ITrafficConvictionEntry>({
  date: { type: Date, required: [true, "Conviction date is required."] },
  location: {
    type: String,
    required: [true, "Conviction location is required."],
  },
  charge: { type: String, required: [true, "Charge is required."] },
  penalty: { type: String, required: [true, "Penalty is required."] },
});

// Education Schema
const educationSchema = new Schema<IEducation>({
  gradeSchool: {
    type: Number,
    min: [0, "Grade school years cannot be negative."],
    max: [12, "Grade school years cannot exceed 12."],
    default: 0,
    required: [true, "Grade school years are required."],
  },
  college: {
    type: Number,
    min: [0, "College years cannot be negative."],
    max: [4, "College years cannot exceed 4."],
    default: 0,
    required: [true, "College years are required."],
  },
  postGraduate: {
    type: Number,
    min: [0, "Postgraduate years cannot be negative."],
    max: [4, "Postgraduate years cannot exceed 4."],
    default: 0,
    required: [true, "Postgraduate years are required."],
  },
});

// Canadian Daily Hours Schema
const dailyHoursSchema = new Schema<ICanadianDailyHours>({
  day: {
    type: Number,
    min: [1, "Day number must be between 1 and 14."],
    max: [14, "Day number must be between 1 and 14."],
    required: [true, "Day number is required."],
  },
  hours: {
    type: Number,
    min: [0, "Hours cannot be negative."],
    max: [24, "Hours cannot exceed 24 in a day."],
    required: [true, "Hours for the day are required."],
  },
});

// Canadian Hours of Service Schema
const canadianHoursSchema = new Schema<ICanadianHoursOfService>({
  dayOneDate: {
    type: Date,
    required: [true, "Start date for daily hours is required."],
  },
  dailyHours: {
    type: [dailyHoursSchema],
    required: [true, "Daily hours must be provided."],
    validate: {
      validator: (v: ICanadianDailyHours[]) => Array.isArray(v) && v.length === 14,
      message: "Exactly 14 days of hours must be provided.",
    },
  },
});

// Page 3 Schema
export const applicationFormPage3Schema = new Schema<IApplicationFormPage3>(
  {
    accidentHistory: {
      type: [accidentEntrySchema],
      default: [],
      required: [true, "Accident history is required (can be empty)."],
    },
    trafficConvictions: {
      type: [convictionEntrySchema],
      default: [],
      required: [true, "Traffic convictions are required (can be empty)."],
    },
    education: {
      type: educationSchema,
      required: [true, "Education section is required."],
    },
    canadianHoursOfService: {
      type: canadianHoursSchema,
      required: [true, "Canadian Hours of Service section is required."],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

// Virtual totalHours getter
applicationFormPage3Schema.virtual("canadianHoursOfService.totalHours").get(function (this) {
  try {
    const daily = this.canadianHoursOfService?.dailyHours ?? [];
    return daily.reduce((sum: number, entry) => sum + (entry.hours || 0), 0);
  } catch {
    return 0;
  }
});
