import { decryptString } from "@/lib/utils/cryptoUtils";
import { IApplicationFormPage1 } from "@/types/applicationForm.types";
import { ELicenseType } from "@/types/shared.types";
import { Schema } from "mongoose";
import { photoSchema } from "../sharedSchemas";

const addressSchema = new Schema(
  {
    address: { type: String, required: [true, "Address is required."] },
    city: { type: String, required: [true, "City is required."] },
    stateOrProvince: {
      type: String,
      required: [true, "State or province is required."],
    },
    postalCode: { type: String, required: [true, "Postal code is required."] },
    from: { type: Date, required: [true, "Address 'from' date is required."] },
    to: { type: Date, required: [true, "Address 'to' date is required."] },
  }
);

const licenseSchema = new Schema(
  {
    licenseNumber: {
      type: String,
      required: [true, "License number is required."],
    },
    licenseStateOrProvince: {
      type: String,
      required: [true, "License issuing province/state is required."],
    },
    licenseType: {
      type: String,
      enum: {
        values: Object.values(ELicenseType),
        message: "License type must be one of the predefined categories.",
      },
      required: [true, "License type is required."],
    },
    licenseExpiry: {
      type: Date,
      required: [true, "License expiry date is required."],
    },
    licenseFrontPhoto: { type: photoSchema },
    licenseBackPhoto: { type: photoSchema },
  }
);

export const applicationFormPage1Schema = new Schema<IApplicationFormPage1>(
  {
    // Personal
    firstName: { type: String, required: [true, "First name is required."] },
    lastName: { type: String, required: [true, "Last name is required."] },
    sinEncrypted: {
      type: String,
      required: [true, "Encrypted SIN is required."],
    },
    sinPhoto: { type: photoSchema, required: [true, "Sin photo is required"] },
    dob: { type: Date, required: [true, "Date of birth is required."] },
    phoneHome: {
      type: String,
      required: [true, "Home phone number is required."],
    },
    phoneCell: {
      type: String,
      required: [true, "Cell phone number is required."],
    },
    canProvideProofOfAge: {
      type: Boolean,
      required: [true, "Proof of age confirmation is required."],
    },
    email: { type: String, required: [true, "Email address is required."] },
    emergencyContactName: {
      type: String,
      required: [true, "Emergency contact name is required."],
    },
    emergencyContactPhone: {
      type: String,
      required: [true, "Emergency contact phone number is required."],
    },

    // Birth
    birthCity: { type: String, required: [true, "Birth city is required."] },
    birthCountry: {
      type: String,
      required: [true, "Birth country is required."],
    },
    birthStateOrProvince: {
      type: String,
      required: [true, "Birth province/state is required."],
    },

    // Licenses
    licenses: {
      type: [licenseSchema],
      required: [true, "At least one license entry is required."],
      validate: {
        validator: (val: unknown[]) => Array.isArray(val) && val.length > 0,
        message: "At least one license entry is required.",
      },
    },

    // Address history
    addresses: {
      type: [addressSchema],
      required: [true, "Address history is required."],
      validate: {
        validator: (val: unknown[]) => Array.isArray(val) && val.length > 0,
        message: "At least one address is required.",
      },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: true,
  }
);

// Virtual for sin (decrypted)
applicationFormPage1Schema.virtual("sin").get(function (this) {
  try {
    return decryptString(this.sinEncrypted);
  } catch {
    return null;
  }
});
