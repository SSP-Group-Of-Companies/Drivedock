import {
  IApplicationFormPage4,
  ICriminalRecordEntry,
} from "@/types/applicationForm.types";
import { Schema } from "mongoose";
import { photoSchema } from "../sharedSchemas";

// Criminal Record Entry Schema
const criminalRecordEntrySchema = new Schema<ICriminalRecordEntry>(
  {
    offense: { type: String, required: [true, "Offense is required."] },
    dateOfSentence: {
      type: Date,
      required: [true, "Date of sentence is required."],
    },
    courtLocation: {
      type: String,
      required: [true, "Court location is required."],
    },
  },
  { _id: false }
);

// Page 4 Schema
export const applicationFormPage4Schema = new Schema<IApplicationFormPage4>(
  {
    // Criminal Records
    criminalRecords: {
      type: [criminalRecordEntrySchema],
      required: [true, "Criminal record section is required."],
      default: [],
    },

    // Incorporate & Banking
    employeeNumber: {
      type: String,
      required: [true, "Employee number is required."],
    },
    businessNumber: {
      type: String,
      required: [true, "Business number is required."],
    },
    incorporatePhotos: {
      type: [photoSchema],
      required: [true, "Incorporate photos are required."],
      default: [],
    },
    bankingInfoPhotos: {
      type: [photoSchema],
      required: [true, "Banking info photos are required."],
      default: [],
    },

    // Additional Info
    deniedLicenseOrPermit: {
      type: Boolean,
      required: [true, "Denial of license or permit must be specified."],
    },
    suspendedOrRevoked: {
      type: Boolean,
      required: [true, "Suspension or revocation status must be specified."],
    },
    suspensionNotes: {
      type: String,
      default: "",
    },
    testedPositiveOrRefused: {
      type: Boolean,
      required: [true, "Drug test refusal or positive result must be specified."],
    },
    completedDOTRequirements: {
      type: Boolean,
      required: [true, "DOT requirements completion must be specified."],
    },
    hasAccidentalInsurance: {
      type: Boolean,
      required: [true, "Accidental insurance status must be specified."],
    },
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
