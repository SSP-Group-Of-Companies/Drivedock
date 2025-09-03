import { Schema } from "mongoose";
import { IApplicationFormPage2, IEmploymentEntry } from "@/types/applicationForm.types";

/* =========================================================
 * Employment Entry (unchanged)
 * =======================================================*/
export const employmentEntrySchema = new Schema<IEmploymentEntry>(
  {
    employerName: { type: String, required: [true, "Employer name is required."] },
    supervisorName: { type: String, required: [true, "Supervisor name is required."] },
    address: { type: String, required: [true, "Employer address is required."] },
    postalCode: { type: String, required: [true, "Postal code is required."] },
    city: { type: String, required: [true, "City is required."] },
    stateOrProvince: { type: String, required: [true, "State or province is required."] },
    phone1: { type: String, required: [true, "Primary phone number is required."] },
    phone2: { type: String }, // optional
    email: { type: String, required: [true, "Employer email is required."] },
    positionHeld: { type: String, required: [true, "Position held is required."] },
    from: { type: Date, required: [true, "Employment start date is required."] },
    to: { type: Date, required: [true, "Employment end date is required."] },
    salary: { type: String, required: [true, "Salary is required."] },
    reasonForLeaving: { type: String, required: [true, "Reason for leaving is required."] },
    subjectToFMCSR: { type: Boolean, required: [true, "FMCSR applicability must be specified."] },
    safetySensitiveFunction: { type: Boolean, required: [true, "Safety sensitive function flag is required."] },
    gapExplanationBefore: { type: String }, // optional
  },
  { _id: false }
);

/* =========================================================
 * Previous Work Details (sub-schema) — dev-friendly messages
 * =======================================================*/
const previousWorkDetailsSchema = new Schema(
  {
    from: { type: Date, required: [true, "previousWorkDetails.from is required"] },
    to: { type: Date, required: [true, "previousWorkDetails.to is required"] },
    rateOfPay: { type: String, required: [true, "previousWorkDetails.rateOfPay is required"] },
    position: { type: String, required: [true, "previousWorkDetails.position is required"] },
  },
  { _id: false }
);

previousWorkDetailsSchema.path("to").validate(function (this: any, v: Date) {
  const from = this.get("from") as Date | undefined;
  if (!from || !v) return true;
  return v.getTime() >= from.getTime();
}, "previousWorkDetails.to cannot be before previousWorkDetails.from");

/* =========================================================
 * Page 2 Schema
 * =======================================================*/
export const applicationFormPage2Schema = new Schema<IApplicationFormPage2>(
  {
    employments: {
      type: [employmentEntrySchema],
      required: [true, "Employment history is required."],
      validate: {
        validator: (val: unknown[]) => Array.isArray(val) && val.length > 0,
        message: "Please add at least one employment entry.",
      },
      default: [],
    },

    workedWithCompanyBefore: {
      type: Boolean,
      required: [true, "workedWithCompanyBefore is required"],
    },

    // Keep sub-schema for field-level requireds when object is present
    previousWorkDetails: {
      type: previousWorkDetailsSchema as any,
    },

    reasonForLeavingCompany: {
      type: String,
      required: [
        function (this: IApplicationFormPage2) {
          return this.workedWithCompanyBefore === true;
        },
        "reasonForLeavingCompany is required when workedWithCompanyBefore is true.",
      ],
    },

    currentlyEmployed: {
      type: Boolean,
      required: [true, "currentlyEmployed is required"],
    },

    referredBy: { type: String }, // optional

    expectedRateOfPay: {
      type: String,
      required: [true, "expectedRateOfPay is required"],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

/* =========================================================
 * Document-level guard (runs even when previousWorkDetails is absent)
 * =======================================================*/
applicationFormPage2Schema.pre("validate", function (next) {
  // If they did not work with the company before, strip any stray values
  if (!this.workedWithCompanyBefore) {
    if (this.reasonForLeavingCompany) this.set("reasonForLeavingCompany", undefined);
    if (this.previousWorkDetails) this.set("previousWorkDetails", undefined);
  } else {
    // Must have previousWorkDetails object if workedWithCompanyBefore = true
    if (!this.previousWorkDetails) {
      this.invalidate("previousWorkDetails", "previousWorkDetails is required when workedWithCompanyBefore is true.");
    }
  }
  next();
});
