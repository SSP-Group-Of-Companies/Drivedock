import { decryptString } from "@/lib/utils/cryptoUtils";
import {
  IApplicationFormPage1,
} from "@/types/applicationForm.types";
import { ELicenseType } from "@/types/shared.types";
import { Schema } from "mongoose";
import { photoSchema } from "../sharedSchemas";

const addressSchema = new Schema(
  {
    address: { type: String, required: true },
    city: { type: String, required: true },
    stateOrProvince: { type: String, required: true },
    postalCode: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
  },
  { _id: false }
);

const licenseSchema = new Schema(
  {
    licenseNumber: { type: String, required: true },
    licenseStateOrProvince: { type: String, required: true },
    licenseType: {
      type: String,
      enum: Object.values(ELicenseType),
      required: true,
    },
    licenseExpiry: { type: String, required: true },
    licenseFrontPhoto: { type: photoSchema, required: true },
    licenseBackPhoto: { type: photoSchema, required: true },
  },
  { _id: false }
);

export const applicationFormPage1Schema = new Schema<IApplicationFormPage1>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    sinEncrypted: { type: String, required: true },
    dob: { type: String, required: true },
    phoneHome: { type: String, required: true },
    phoneCell: { type: String, required: true },
    canProvideProofOfAge: { type: Boolean, required: true },
    email: { type: String, required: true },
    emergencyContactName: { type: String, required: true },
    emergencyContactPhone: { type: String, required: true },

    birthCity: { type: String, required: true },
    birthCountry: { type: String, required: true },
    birthStateOrProvince: { type: String, required: true },

    licenses: { type: [licenseSchema], required: true },

    addresses: { type: [addressSchema], required: true },
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
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
