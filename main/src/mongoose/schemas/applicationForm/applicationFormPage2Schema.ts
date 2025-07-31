import { Schema } from "mongoose";
import { IApplicationFormPage2, IEmploymentEntry } from "@/types/applicationForm.types";

// Employment Entry Schema
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

// Page 2 Schema
export const applicationFormPage2Schema = new Schema<IApplicationFormPage2>(
  {
    employments: {
      type: [employmentEntrySchema],
      required: [true, "Employment history is required."],
      validate: {
        validator: (val: unknown[]) => Array.isArray(val) && val.length > 0,
        message: "At least one employment entry is required.",
      },
      default: [],
    },
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
