import {
    IApplicationFormPage4,
    ICriminalRecordEntry,
  } from "@/types/applicationForm.types";
  import { Schema } from "mongoose";
import { photoSchema } from "../sharedSchemas";
  
  // Criminal Record Entry Schema
  const criminalRecordEntrySchema = new Schema<ICriminalRecordEntry>(
    {
      offense: { type: String, required: true },
      dateOfSentence: { type: String, required: true }, // Format: YYYY-MM-DD
      courtLocation: { type: String, required: true },
    },
    { _id: false }
  );

  // Page 4 Schema
  export const applicationFormPage4Schema = new Schema<IApplicationFormPage4>(
    {
      // Criminal Records Section
      criminalRecords: {
        type: [criminalRecordEntrySchema],
        default: [],
        required: true,
      },
  
      // Incorporate Details
      employeeNumber: { type: String, required: true },
      businessNumber: { type: String, required: true },
      incorporatePhotos: {
        type: [photoSchema],
        default: [],
        required: true,
      },
      bankingInfoPhotos: {
        type: [photoSchema],
        default: [],
        required: true,
      },
  
      // Additional Info
      deniedLicenseOrPermit: { type: Boolean, required: true },
      suspendedOrRevoked: { type: Boolean, required: true },
      suspensionNotes: { type: String, default: "" },
  
      testedPositiveOrRefused: { type: Boolean, required: true },
      completedDOTRequirements: { type: Boolean, required: true },
      hasAccidentalInsurance: { type: Boolean, required: true },
    },
    {
      _id: false,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );
  