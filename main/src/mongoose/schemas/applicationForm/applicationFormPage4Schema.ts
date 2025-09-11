import { IApplicationFormPage4, ICriminalRecordEntry, IFastCard } from "@/types/applicationForm.types";
import { Schema } from "mongoose";
import { fileSchema } from "../sharedSchemas";
import { isImageMime } from "@/types/shared.types";

// Helpers
const maxArrayLen = (max: number) => (arr: unknown[]) => Array.isArray(arr) ? arr.length <= max : true;
const imageArrayValidator = (arr: any[]) => (Array.isArray(arr) ? arr.every((f) => f && isImageMime(f?.mimeType)) : true);

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

// FAST Card schema (images only)
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
    validate: {
      validator: (v: any) => v && isImageMime(v?.mimeType),
      message: "fastCardFrontPhoto must be an image.",
    },
  },
  fastCardBackPhoto: {
    type: fileSchema,
    required: [true, "Fast card back photo is required"],
    validate: {
      validator: (v: any) => v && isImageMime(v?.mimeType),
      message: "fastCardBackPhoto must be an image.",
    },
  },
});

// Page 4 Schema (ALL asset arrays are images-only by business rule)
export const applicationFormPage4Schema = new Schema<IApplicationFormPage4>(
  {
    // Criminal Records
    criminalRecords: {
      type: [criminalRecordEntrySchema],
      default: [],
    },

    // Incorporate, HST & Banking
    employeeNumber: { type: String },
    hstNumber: { type: String },
    businessName: { type: String },

    hstPhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageArrayValidator, message: "All HST photos must be images." },
        { validator: maxArrayLen(2), message: "HST photos cannot exceed 2 items." },
      ],
    },
    incorporatePhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageArrayValidator, message: "All incorporation photos must be images." },
        { validator: maxArrayLen(10), message: "Incorporation photos cannot exceed 10 items." },
      ],
    },
    bankingInfoPhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageArrayValidator, message: "All banking info photos must be images." },
        { validator: maxArrayLen(2), message: "Banking info photos cannot exceed 2 items." },
      ],
    },

    // Medical / Identity (country-specific)
    healthCardPhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageArrayValidator, message: "All health card photos must be images." },
        { validator: maxArrayLen(2), message: "Health card photos cannot exceed 2 items." },
      ],
    },
    medicalCertificationPhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageArrayValidator, message: "All medical certification photos must be images." },
        { validator: maxArrayLen(2), message: "Medical certification photos cannot exceed 2 items." },
      ],
    },

    passportPhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageArrayValidator, message: "All passport photos must be images." },
        { validator: maxArrayLen(2), message: "Passport photos cannot exceed 2 items." },
      ],
    },
    usVisaPhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageArrayValidator, message: "All US VISA photos must be images." },
        { validator: maxArrayLen(2), message: "US VISA photos cannot exceed 2 items." },
      ],
    },
    prPermitCitizenshipPhotos: {
      type: [fileSchema],
      default: [],
      validate: [
        { validator: imageArrayValidator, message: "All PR/Permit/Citizenship photos must be images." },
        { validator: maxArrayLen(2), message: "PR/Permit/Citizenship photos cannot exceed 2 items." },
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
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);
