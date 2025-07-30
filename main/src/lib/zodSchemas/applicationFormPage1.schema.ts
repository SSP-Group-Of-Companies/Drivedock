// src/lib/zodSchemas/applicationFormPage1.schema.ts
import { z } from "zod";
import { ELicenseType } from "@/types/shared.types";
import { hasRecentAddressCoverage } from "@/lib/utils/hasMinimumAddressDuration";

// Single license schema for all licenses (like addressEntrySchema)
export const licenseEntrySchema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  licenseStateOrProvince: z.string().min(1, "Province is required"),
  licenseType: z.nativeEnum(ELicenseType),
  licenseExpiry: z.string().min(1, "Expiry date is required"),

  licenseFrontPhoto: z
    .instanceof(File, { message: "Front photo is required" })
    .refine((file) => file.size > 0, { message: "Front photo is required" }),

  licenseBackPhoto: z
    .instanceof(File, { message: "Back photo is required" })
    .refine((file) => file.size > 0, { message: "Back photo is required" }),
});

export const addressEntrySchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  stateOrProvince: z.string().min(1, "Province is required"),
  postalCode: z.string().min(3, "Postal code is required"),
  from: z.string().min(1, "Start date required"), // Will be yyyy-mm-dd
  to: z.string().min(1, "End date required"),
});

export const applicationFormPage1Schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  sin: z.string().min(1, "SIN is required"),
  dob: z.string().min(1, "Date of birth is required"), // yyyy-mm-dd
  phoneHome: z
    .string()
    .min(10, "Home phone number must be at least 10 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),
  phoneCell: z
    .string()
    .min(10, "Cell phone number must be at least 10 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),
  canProvideProofOfAge: z.boolean().refine((val) => val === true, {
    message: "You must confirm that you can provide proof of age",
  }),
  email: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactPhone: z
    .string()
    .min(10, "Emergency contact phone must be at least 10 digits")
    .regex(/^\d+$/, "Phone number must contain only digits"),

  birthCity: z.string().min(1, "City of birth is required"),
  birthCountry: z.string().min(1, "Country of birth is required"),
  birthStateOrProvince: z
    .string()
    .min(1, "Province/State of birth is required"),

  licenses: z
    .array(licenseEntrySchema)
    .min(1, "At least one license is required")
    .refine(
      (licenses) => {
        // First license must be AZ type
        return licenses[0]?.licenseType === ELicenseType.AZ;
      },
      {
        message: "The first license must be of type AZ",
      }
    ),

  addresses: z
    .array(addressEntrySchema)
    .min(1, "Address history is required")
    .refine((addresses) => hasRecentAddressCoverage(addresses, 5), {
      message:
        "You must provide at least 5 years of address history. If you haven't lived in one place for 5 years, please add additional addresses to cover the full 5-year period.",
    }),
});

export type ApplicationFormPage1Schema = z.infer<
  typeof applicationFormPage1Schema
>;
