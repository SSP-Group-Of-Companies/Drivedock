// applicationForm.page3 schema:
import { IApplicationFormPage3, IAccidentEntry, ITrafficConvictionEntry, IEducation, ICanadianHoursOfService, ICanadianDailyHours } from "@/types/applicationForm.types";
import { Schema } from "mongoose";

// ---------------------------------------------------
// Accident Entry Schema (unchanged)
const accidentEntrySchema = new Schema<IAccidentEntry>({
  date: { type: Date, required: false },
  natureOfAccident: { type: String, required: false },
  fatalities: { type: Number, min: [0, "Fatalities cannot be negative."], required: false },
  injuries: { type: Number, min: [0, "Injuries cannot be negative."], required: false },
});

// ---------------------------------------------------
// Conviction Entry Schema (unchanged)
const convictionEntrySchema = new Schema<ITrafficConvictionEntry>({
  date: { type: Date, required: false },
  location: { type: String, required: false },
  charge: { type: String, required: false },
  penalty: { type: String, required: false },
});

// ---------------------------------------------------
// Education Schema (unchanged)
const educationSchema = new Schema<IEducation>({
  gradeSchool: {
    type: Number,
    min: [0, "Grade school years cannot be negative."],
    max: [12, "Grade school years cannot exceed 12."],
    default: 0,
    required: [true, "Grade school years are required."],
  },
  college: { type: Number, min: [0, "College years cannot be negative."], max: [4, "College years cannot exceed 4."], default: 0, required: [true, "College years are required."] },
  postGraduate: { type: Number, min: [0, "Postgraduate years cannot be negative."], max: [4, "Postgraduate years cannot exceed 4."], default: 0, required: [true, "Postgraduate years are required."] },
});

// ---------------------------------------------------
// Canadian Daily Hours Schema (unchanged)
const dailyHoursSchema = new Schema<ICanadianDailyHours>({
  day: { type: Number, min: [1, "Day number must be between 1 and 14."], max: [14, "Day number must be between 1 and 14."], required: [true, "Day number is required."] },
  hours: { type: Number, min: [0, "Hours cannot be negative."], max: [24, "Hours cannot exceed 24 in a day."], required: [true, "Hours for the day are required."] },
});

// ---------------------------------------------------
// Canadian Hours of Service Schema
const canadianHoursSchema = new Schema<ICanadianHoursOfService>(
  {
    dayOneDate: { type: Date, required: [true, "Start date for daily hours is required."] },
    dailyHours: {
      type: [dailyHoursSchema],
      required: [true, "Daily hours must be provided."],
      validate: {
        validator: (v: ICanadianDailyHours[]) => Array.isArray(v) && v.length === 14,
        message: "Exactly 14 days of hours must be provided.",
      },
    },
  },
  // turn on virtuals on the sub-schema
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Define the virtual on the sub-schema itself
canadianHoursSchema.virtual("totalHours").get(function (this: ICanadianHoursOfService) {
  try {
    const daily = (this.dailyHours ?? []) as Array<{ hours?: number }>;
    return daily.reduce((sum, entry) => sum + (entry?.hours ?? 0), 0);
  } catch {
    return 0;
  }
});

// ---------------------------------------------------
// Page 3 Schema
export const applicationFormPage3Schema = new Schema<IApplicationFormPage3>(
  {
    hasAccidentHistory: { type: Boolean, required: [true, "Please answer if you have ever been involved in an accident"], default: false },
    hasTrafficConvictions: { type: Boolean, required: [true, "Please answer if you have ever been convicted of a traffic offense"], default: false },
    accidentHistory: { type: [accidentEntrySchema], default: [], required: [true, "Accident history is required (can be empty)."] },
    trafficConvictions: { type: [convictionEntrySchema], default: [], required: [true, "Traffic convictions are required (can be empty)."] },
    education: { type: educationSchema, required: [true, "Education section is required."] },
    canadianHoursOfService: { type: canadianHoursSchema, required: [true, "Canadian Hours of Service section is required."] },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true }, timestamps: true }
);

// ---------------------------------------------------
// All-or-nothing row validation (unchanged)
applicationFormPage3Schema.pre("validate", function (next) {
  // If user indicated accidents, ensure at least one fully completed row exists
  if ((this as any).hasAccidentHistory === true) {
    const rows = Array.isArray(this.accidentHistory) ? this.accidentHistory : [];
    const anyComplete = rows.some((a) => a && a.date && a.natureOfAccident && typeof a.fatalities === "number" && typeof a.injuries === "number");
    if (!anyComplete) {
      // invalidate parent path to surface a root-level error in API
      this.invalidate("accidentHistory", "At least one report is needed when declared to have been involved in an accident");
    }
  }

  if (this.accidentHistory && Array.isArray(this.accidentHistory)) {
    this.accidentHistory.forEach((accident, index) => {
      if (!accident) return;
      const hasAnyData =
        accident.date || accident.natureOfAccident || (typeof accident.fatalities === "number" && accident.fatalities >= 0) || (typeof accident.injuries === "number" && accident.injuries >= 0);

      if (hasAnyData) {
        if (!accident.date) this.invalidate(`accidentHistory.${index}.date`, "Accident date is required");
        if (!accident.natureOfAccident) this.invalidate(`accidentHistory.${index}.natureOfAccident`, "Nature of accident is required");
        if (accident.fatalities === undefined || accident.fatalities === null) this.invalidate(`accidentHistory.${index}.fatalities`, "Number of fatalities is required (0 if none)");
        if (accident.injuries === undefined || accident.injuries === null) this.invalidate(`accidentHistory.${index}.injuries`, "Number of injuries is required (0 if none)");
      }
    });
  }

  if (this.trafficConvictions && Array.isArray(this.trafficConvictions)) {
    this.trafficConvictions.forEach((conviction, index) => {
      if (!conviction) return;
      const hasAnyData = conviction.date || conviction.location || conviction.charge || conviction.penalty;

      if (hasAnyData) {
        if (!conviction.date) this.invalidate(`trafficConvictions.${index}.date`, "Conviction date is required");
        if (!conviction.location) this.invalidate(`trafficConvictions.${index}.location`, "Conviction location is required");
        if (!conviction.charge) this.invalidate(`trafficConvictions.${index}.charge`, "Charge is required");
        if (!conviction.penalty) this.invalidate(`trafficConvictions.${index}.penalty`, "Penalty is required");
      }
    });
  }

  // Root-level enforcement when user says YES but provides no complete conviction row
  if ((this as any).hasTrafficConvictions === true) {
    const rows = Array.isArray(this.trafficConvictions) ? this.trafficConvictions : [];
    const anyComplete = rows.some((c) => c && c.date && c.location && c.charge && c.penalty);
    if (!anyComplete) {
      this.invalidate("trafficConvictions", "At least one conviction is needed when declared to have traffic convictions");
    }
  }

  next();
});
