import { Schema } from "mongoose";
import { IApplicationFormPage2, IEmploymentEntry } from "@/types/applicationForm.types";

// Employment Entry Schema
export const employmentEntrySchema = new Schema<IEmploymentEntry>(
  {
    employerName: { type: String, required: true },
    supervisorName: { type: String, required: true },
    address: { type: String, required: true },
    postalCode: { type: String, required: true },
    city: { type: String, required: true },
    stateOrProvince: { type: String, required: true },
    phone1: { type: String, required: true },
    phone2: { type: String },
    email: { type: String, required: true },
    positionHeld: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    salary: { type: String, required: true },
    reasonForLeaving: { type: String, required: true },
    subjectToFMCSR: { type: Boolean, required: true },
    safetySensitiveFunction: { type: Boolean, required: true },
    gapExplanationBefore: { type: String },
  },
  { _id: false }
);

// Page 2 Schema
export const applicationFormPage2Schema = new Schema<IApplicationFormPage2>(
  {
    employments: {
      type: [employmentEntrySchema],
      required: true,
      default: [],
    },
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
