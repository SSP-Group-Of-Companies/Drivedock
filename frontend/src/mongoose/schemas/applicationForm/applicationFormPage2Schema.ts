import {
  IApplicationFormPage2,
  IEmploymentEntry,
} from "@/types/applicationForm.types";
import { Schema } from "mongoose";

const employmentEntrySchema = new Schema<IEmploymentEntry>(
  {
    employerName: { type: String, required: true },
    supervisorName: { type: String, required: true },
    address: { type: String, required: true },
    postalCode: { type: String, required: true },
    city: { type: String, required: true },
    stateOrProvince: { type: String, required: true },
    phone1: { type: String, required: true },
    phone2: { type: String, default: "" },
    email: { type: String, required: true },
    positionHeld: { type: String, required: true },
    from: { type: String, required: true }, // YYYY-MM-DD
    to: { type: String, required: true }, // YYYY-MM-DD
    salary: { type: String, required: true },
    reasonForLeaving: { type: String, required: true },
    subjectToFMCSR: { type: Boolean, required: true },
    safetySensitiveFunction: { type: Boolean, required: true },
  },
  { _id: false }
);

export const applicationFormPage2Schema = new Schema<IApplicationFormPage2>(
  {
    currentEmployment: { type: employmentEntrySchema, required: true },
    previousEmployments: {
      type: [employmentEntrySchema],
      default: [],
      required: true,
    },
    employmentGapExplanation: { type: String, default: "", required: true },
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
