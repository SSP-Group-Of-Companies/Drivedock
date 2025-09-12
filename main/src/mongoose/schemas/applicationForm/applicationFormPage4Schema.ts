import { IApplicationFormPage4, ICriminalRecordEntry, IFastCard } from "@/types/applicationForm.types";
import { Schema } from "mongoose";
import { photoSchema } from "../sharedSchemas";

// Small helper for array length validation
const maxArrayLen = (max: number) => (arr: unknown[]) => Array.isArray(arr) ? arr.length <= max : true;

// Criminal Record Entry Schema with custom validation
const criminalRecordEntrySchema = new Schema<ICriminalRecordEntry>({
  offense: { type: String, default: "" },
  dateOfSentence: { type: Date },
  courtLocation: { type: String, default: "" },
});

// Add custom validation for "all-or-nothing" per row
criminalRecordEntrySchema.pre('validate', function() {
  const hasAnyData = !!(this.offense?.trim()) || !!this.dateOfSentence || !!(this.courtLocation?.trim());
  
  if (hasAnyData) {
    // If any field has data, all fields become required
    if (!this.offense?.trim()) {
      this.invalidate('offense', 'Offense is required when any field in this row has data.');
    }
    if (!this.dateOfSentence) {
      this.invalidate('dateOfSentence', 'Date of sentence is required when any field in this row has data.');
    }
    if (!this.courtLocation?.trim()) {
      this.invalidate('courtLocation', 'Court location is required when any field in this row has data.');
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
      default: [],
    },

    // Incorporate, HST & Banking
    hstNumber: { type: String },
    businessName: { type: String },

    hstPhotos: {
      type: [photoSchema],
      default: [],
      validate: {
        validator: maxArrayLen(2),
        message: "HST photos cannot exceed 2 items.",
      },
    },
    incorporatePhotos: {
      type: [photoSchema],
      default: [],
      validate: {
        validator: maxArrayLen(10),
        message: "Incorporate photos cannot exceed 10 items.",
      },
    },
    bankingInfoPhotos: {
      type: [photoSchema],
      default: [],
      validate: {
        validator: maxArrayLen(2),
        message: "Banking info photos cannot exceed 2 items.",
      },
    },
    healthCardPhotos: {
      type: [photoSchema],
      default: [],
      validate: {
        validator: maxArrayLen(2),
        message: "Health card photos cannot exceed 2 items.",
      },
    },
    medicalCertificationPhotos: {
      type: [photoSchema],
      default: [],
      validate: {
        validator: maxArrayLen(2),
        message: "Medical certification photos cannot exceed 2 items.",
      },
    },
    passportPhotos: {
      type: [photoSchema],
      default: [],
      validate: {
        validator: maxArrayLen(2),
        message: "Passport photos cannot exceed 2 items.",
      },
    },
    usVisaPhotos: {
      type: [photoSchema],
      default: [],
      validate: {
        validator: maxArrayLen(2),
        message: "US VISA photos cannot exceed 2 items.",
      },
    },
    prPermitCitizenshipPhotos: {
      type: [photoSchema],
      default: [],
      validate: {
        validator: maxArrayLen(2),
        message: "PR/Permit/Citizenship photos cannot exceed 2 items.",
      },
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
