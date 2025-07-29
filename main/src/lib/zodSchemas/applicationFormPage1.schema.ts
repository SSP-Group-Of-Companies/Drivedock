// src/lib/zodSchemas/applicationFormPage1.schema.ts
import { z } from "zod";
import { ELicenseType } from "@/types/shared.types"; // adjust path as needed

export const licenseEntrySchema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  licenseStateOrProvince: z.string().min(1, "Province is required"),
  licenseType: z.nativeEnum(ELicenseType).refine(
    (val) => val !== undefined,
    { message: "License type is required" }
  ),
  licenseExpiry: z.string().min(1, "Expiry date is required"),
  licenseFrontPhoto: z.any().optional(), // Validated via UI
  licenseBackPhoto: z.any().optional(),
});
;

export const addressEntrySchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  stateOrProvince: z.string().min(1, "Province is required"),
  postalCode: z.string().min(3, "Postal code is required"),
  from: z.string().min(1, "Start date required"), // Will be yyyy-mm-dd
  to: z.string().min(1, "End date required"),
});

export const applicationFormPage1Schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  sin: z.string().optional(),
  sinEncrypted: z.string().min(1),
  dob: z.string().min(1), // yyyy-mm-dd
  phoneHome: z.string().min(1),
  phoneCell: z.string().min(1),
  canProvideProofOfAge: z.boolean(),
  email: z.string().email(),
  emergencyContactName: z.string().min(1),
  emergencyContactPhone: z.string().min(1),

  birthCity: z.string().min(1),
  birthCountry: z.string().min(1),
  birthStateOrProvince: z.string().min(1),

  licenses: z.array(licenseEntrySchema).min(1, "At least one license is required"),
  addresses: z.array(addressEntrySchema).min(1, "Address history is required"),
});

export type ApplicationFormPage1Schema = z.infer<typeof applicationFormPage1Schema>;
