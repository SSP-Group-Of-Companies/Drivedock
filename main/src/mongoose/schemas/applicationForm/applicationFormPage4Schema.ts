import {
  IApplicationFormPage4,
  ICriminalRecordEntry,
  IFastCard,
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
  }
);

// fast card schema
const fastCardSchema = new Schema<IFastCard>({
  fastCardNumber: {
    type: String,
    required: [true, "Fast card number is required"],
  },
  fastCardExpiry: {
    type: Date,
    required: [true, "Fast card expiry is required"],
  },
  fastCardFrontPhoto: {
    type: photoSchema,
    required: [true, "fast card front photo is required"],
  },
  fastCardBackPhoto: {
    type: photoSchema,
    required: [true, "fast card front photo is required"],
  },
});

// Page 4 Schema
export const applicationFormPage4Schema = new Schema<IApplicationFormPage4>(
  {
    // Criminal Records
    criminalRecords: {
      type: [criminalRecordEntrySchema],
      required: [true, "Criminal record section is required."],
      default: [],
    },

    // Incorporate, hst & Banking
    employeeNumber: {
      type: String,
    },
    hstNumber: {
      type: String,
    },
    businessNumber: {
      type: String,
    },
    hstPhotos: {
      type: [photoSchema],
      default: [],
    },
    incorporatePhotos: {
      type: [photoSchema],
      default: [],
    },
    bankingInfoPhotos: {
      type: [photoSchema],
      default: [],
    },
    healthCardPhotos: {
      type: [photoSchema],
      default: [],
    },
    medicalCertificationPhotos: {
      type: [photoSchema],
      default: [],
    },
    passportPhotos: {
      type: [photoSchema],
      default: [],
    },
    usVisaPhotos: {
      type: [photoSchema],
      default: [],
    },
    prPermitCitizenshipPhotos: {
      type: [photoSchema],
      default: [],
    },
    fastCard: {
      type: fastCardSchema,
      default: undefined,
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
      required: [
        true,
        "Drug test refusal or positive result must be specified.",
      ],
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);
