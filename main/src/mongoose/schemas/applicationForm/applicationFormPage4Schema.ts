// src/mongoose/schemas/applicationForm/applicationFormPage4Schema.ts
import { IApplicationFormPage4, ICriminalRecordEntry, IFastCard } from "@/types/applicationForm.types";
import { Schema } from "mongoose";
import { fileSchema } from "../sharedSchemas";
import { EFileMimeType, isImageMime } from "@/types/shared.types";
import { imageOrPdfFieldValidator } from "../sharedValidators"; // <-- NEW

// Helpers
const maxArrayLen = (max: number) => (arr: unknown[]) => Array.isArray(arr) ? arr.length <= max : true;

// Allow image/* OR application/pdf in arrays
const imageOrPdfArrayValidator = (arr: any[]) =>
  Array.isArray(arr)
    ? arr.every((f) => {
        if (!f) return false;
        const mt = String(f?.mimeType || "").toLowerCase();
        return isImageMime(mt) || mt === EFileMimeType.PDF;
      })
    : true;

// Criminal Record Entry Schema with custom validation
const criminalRecordEntrySchema = new Schema<ICriminalRecordEntry>({
  offense: { type: String, default: "" },
  dateOfSentence: { type: Date },
  courtLocation: { type: String, default: "" },
});

// All-or-nothing row validation
criminalRecordEntrySchema.pre("validate", function () {
  const hasAnyData = !!this.offense?.trim() || !!this.dateOfSentence || !!this.courtLocation?.trim();

  if (hasAnyData) {
    if (!this.offense?.trim()) {
      this.invalidate("offense", "Offense is required when any field in this row has data.");
    }
    if (!this.dateOfSentence) {
      this.invalidate("dateOfSentence", "Date of sentence is required when any field in this row has data.");
    }
    if (!this.courtLocation?.trim()) {
      this.invalidate("courtLocation", "Court location is required when any field in this row has data.");
    }
  }
});

// FAST Card schema
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
    type: fileSchema,
    required: [true, "Fast card front photo is required"],
    validate: imageOrPdfFieldValidator,
  },
  fastCardBackPhoto: {
    type: fileSchema,
    required: [true, "Fast card back photo is required"],
    validate: imageOrPdfFieldValidator,
  },
});

// Page 4 Schema
export const applicationFormPage4Schema = new Schema<IApplicationFormPage4>(
  {
    hasCriminalRecords: { type: Boolean, default: false },
    // Criminal Records
    criminalRecords: {
      type: [criminalRecordEntrySchema],
      default: [],
    },

    // Incorporate, HST & Banking
    hstNumber: { type: String },
    businessName: { type: String },

    hstPhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageOrPdfArrayValidator, message: "All HST files must be images or PDFs." },
        { validator: maxArrayLen(2), message: "HST files cannot exceed 2 items." },
      ],
    },
    incorporatePhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageOrPdfArrayValidator, message: "All incorporation files must be images or PDFs." },
        { validator: maxArrayLen(10), message: "Incorporation files cannot exceed 10 items." },
      ],
    },
    bankingInfoPhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageOrPdfArrayValidator, message: "All banking info files must be images or PDFs." },
        { validator: maxArrayLen(2), message: "Banking info files cannot exceed 2 items." },
      ],
    },

    // Medical / Identity (country-specific)
    healthCardPhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageOrPdfArrayValidator, message: "All health card files must be images or PDFs." },
        { validator: maxArrayLen(2), message: "Health card files cannot exceed 2 items." },
      ],
    },
    medicalCertificationPhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageOrPdfArrayValidator, message: "All medical certification files must be images or PDFs." },
        { validator: maxArrayLen(2), message: "Medical certification files cannot exceed 2 items." },
      ],
    },

    // Passport type selection (Canadian companies only)
    passportType: {
      type: String,
      enum: {
        values: ["canadian", "others"],
        message: "Passport type must be either 'canadian' or 'others'.",
      },
      default: undefined,
    },
    workAuthorizationType: {
      type: String,
      enum: {
        values: ["local", "cross_border"],
        message: "Work authorization type must be either 'local' or 'cross_border'.",
      },
      default: undefined,
    },

    passportPhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageOrPdfArrayValidator, message: "All passport files must be images or PDFs." },
        { validator: maxArrayLen(2), message: "Passport files cannot exceed 2 items." },
      ],
    },
    usVisaPhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageOrPdfArrayValidator, message: "All US VISA files must be images or PDFs." },
        { validator: maxArrayLen(2), message: "US VISA files cannot exceed 2 items." },
      ],
    },
    prPermitCitizenshipPhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageOrPdfArrayValidator, message: "All PR/Permit/Citizenship files must be images or PDFs." },
        { validator: maxArrayLen(2), message: "PR/Permit/Citizenship files cannot exceed 2 items." },
      ],
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

    // Truck Details (Admin-only, all optional)
    truckDetails: {
      vin: { type: String, default: "" },
      make: { type: String, default: "" },
      model: { type: String, default: "" },
      year: { type: String, default: "" },
      province: { type: String, default: "" },
      truckUnitNumber: { type: String, default: "" },
      plateNumber: { type: String, default: "" },
      employeeNumber: { type: String, default: "" },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);
