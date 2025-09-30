// src/mongoose/models/applicationForm/page1.schema.ts
import { decryptString } from "@/lib/utils/cryptoUtils";
import { EGender, Iaddress, IApplicationFormPage1, ILicenseEntry } from "@/types/applicationForm.types";
import { ELicenseType, isImageMime } from "@/types/shared.types"; // if ELicenseType still lives here
import { Schema } from "mongoose";
import { fileSchema } from "../sharedSchemas";

const addressSchema = new Schema<Iaddress>({
  address: { type: String, required: [true, "Address is required."] },
  city: { type: String, required: [true, "City is required."] },
  stateOrProvince: { type: String, required: [true, "State or province is required."] },
  postalCode: { type: String, required: [true, "Postal code is required."] },
  from: { type: Date, required: [true, "Address 'from' date is required."] },
  to: { type: Date, required: [true, "Address 'to' date is required."] },
});

/**
 * Shared image validator:
 * - Allows undefined/null (so "required" can handle presence separately where needed).
 * - If object exists but mimeType is missing -> "mimeType is missing in <field>".
 * - If mimeType exists but not an image -> "<field> must be an image."
 */
const imageFieldValidator = {
  validator: function (v: any) {
    if (!v) return true; // let "required" handle absence where applicable
    if (!v.mimeType) return false; // triggers message → mimeType missing
    return isImageMime(v.mimeType); // triggers message → must be an image
  },
  message: function (props: any) {
    const v = props?.value;
    const path = String(props?.path ?? "file");
    if (v && !v.mimeType) return `mimeType is missing in ${path}.`;
    return `${path} must be an image.`;
  },
};

const licenseSchema = new Schema<ILicenseEntry>({
  licenseNumber: { type: String, required: [true, "License number is required."] },
  licenseStateOrProvince: { type: String, required: [true, "License issuing province/state is required."] },
  licenseType: {
    type: String,
    enum: {
      values: Object.values(ELicenseType),
      message: "License type must be one of the predefined categories.",
    },
    required: [true, "License type is required."],
  },
  licenseExpiry: { type: Date, required: [true, "License expiry date is required."] },

  // Image-only constraints via validators:
  licenseFrontPhoto: {
    type: fileSchema,
    required: false,
    validate: imageFieldValidator,
  },
  licenseBackPhoto: {
    type: fileSchema,
    required: false,
    validate: imageFieldValidator,
  },
});

export const applicationFormPage1Schema = new Schema<IApplicationFormPage1>(
  {
    // Personal
    firstName: { type: String, required: [true, "First name is required."] },
    lastName: { type: String, required: [true, "Last name is required."] },
    sinEncrypted: { type: String, required: [true, "Encrypted SIN is required."] },
    sinIssueDate: { type: Date, required: [true, "SIN issue date is required."] },
    sinExpiryDate: { type: Date, required: false },
    gender: {
      type: String,
      enum: {
        values: Object.values(EGender),
        message: `Gender must be one of: ${Object.values(EGender).join(", ")}`,
      },
      required: [true, "Gender is required."],
    },

    // Image-only with validator
    sinPhoto: {
      type: fileSchema,
      required: [true, "Sin photo is required"],
      validate: imageFieldValidator,
    },

    dob: { type: Date, required: [true, "Date of birth is required."] },
    phoneHome: { type: String },
    phoneCell: { type: String, required: [true, "Cell phone number is required."] },
    canProvideProofOfAge: { type: Boolean, required: [true, "Proof of age confirmation is required."] },
    email: { type: String, required: [true, "Email address is required."] },
    emergencyContactName: { type: String, required: [true, "Emergency contact name is required."] },
    emergencyContactPhone: { type: String, required: [true, "Emergency contact phone number is required."] },

    // Birth
    birthCity: { type: String, required: [true, "Birth city is required."] },
    birthCountry: { type: String, required: [true, "Birth country is required."] },
    birthStateOrProvince: { type: String, required: [true, "Birth province/state is required."] },

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
applicationFormPage1Schema.virtual("sin").get(function (this: any) {
  try {
    return decryptString(this.sinEncrypted);
  } catch {
    return null;
  }
});
