// src/lib/zodSchemas/applicationFormPage1.schema.ts
import { z } from "zod";
import { ELicenseType } from "@/types/shared.types";
import { hasRecentAddressCoverage } from "@/lib/utils/hasMinimumAddressDuration";

export const photoSchema = z.object({
  s3Key: z.string(),
  url: z.string(),
});

// Single license schema for all licenses (like addressEntrySchema)
export const licenseEntrySchema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  licenseStateOrProvince: z.string().min(1, "Province is required"),
  licenseType: z.nativeEnum(ELicenseType),
  licenseExpiry: z.string().min(1, "Expiry date is required"),

  licenseFrontPhoto: photoSchema.refine((photo) => photo.s3Key && photo.url, {
    message: "Front photo is required",
  }),

  licenseBackPhoto: photoSchema.refine((photo) => photo.s3Key && photo.url, {
    message: "Back photo is required",
  }),
});

export const addressEntrySchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  stateOrProvince: z.string().min(1, "Province is required"),
  postalCode: z.string().min(3, "Postal code is required"),
  from: z.string().min(1, "Start date required")
    .refine((date) => {
      const inputDate = new Date(date);
      const today = new Date();
      const fiftyYearsAgo = new Date(today.getFullYear() - 50, today.getMonth(), today.getDate());
      return !isNaN(inputDate.getTime()) && inputDate <= today && inputDate >= fiftyYearsAgo;
    }, {
      message: "Start date cannot be in the future or more than 50 years ago"
    }),
  to: z.string().min(1, "End date required")
    .refine((date) => {
      const inputDate = new Date(date);
      const today = new Date();
      return !isNaN(inputDate.getTime()) && inputDate <= today;
    }, {
      message: "End date cannot be in the future"
    }),
}).refine((data) => {
  const fromDate = new Date(data.from);
  const toDate = new Date(data.to);

  // Check if dates are valid
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return false;
  }

  // Check if end date is after start date
  return toDate > fromDate;
}, {
  message: "End date must be after start date",
  path: ["to"] // This will show the error on the "to" field
});

export const applicationFormPage1Schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  sin: z.string().min(1, "SIN is required"),
  sinPhoto: photoSchema.refine((photo) => photo.s3Key && photo.url, {
    message: "SIN photo is required",
  }),
  dob: z.string().min(1, "Date of birth is required").refine((dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    // Check if birthday has occurred this year
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)
      ? age - 1
      : age;

    return actualAge >= 23 && actualAge <= 100;
  }, {
    message: "Age must be between 23 and 100 years old"
  }), // yyyy-mm-dd
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
    .refine((addresses) => {
      // Check for overlapping addresses
      const sortedAddresses = [...addresses].sort((a, b) =>
        new Date(a.from).getTime() - new Date(b.from).getTime()
      );

      for (let i = 0; i < sortedAddresses.length - 1; i++) {
        const current = sortedAddresses[i];
        const next = sortedAddresses[i + 1];

        const currentEnd = new Date(current.to);
        const nextStart = new Date(next.from);

        // Check for overlap (current end date is after next start date)
        if (currentEnd > nextStart) {
          return false;
        }

        // Check for unreasonable gaps (more than 2 years between addresses)
        const gapInDays = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24);
        if (gapInDays > 730) { // 2 years = 730 days
          return false;
        }
      }

      return true;
    }, {
      message: "Addresses cannot overlap and gaps between addresses cannot exceed 2 years"
    })
    .refine((addresses) => {
      // Check if the most recent address extends to present or very recent past
      const sortedAddresses = [...addresses].sort((a, b) =>
        new Date(a.from).getTime() - new Date(b.from).getTime()
      );

      const mostRecentAddress = sortedAddresses[sortedAddresses.length - 1];
      const mostRecentEndDate = new Date(mostRecentAddress.to);
      const today = new Date();
      const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());

      return mostRecentEndDate >= sixMonthsAgo;
    }, {
      message: "Your most recent address must extend to within the last 6 months"
    })
    .refine((addresses) => hasRecentAddressCoverage(addresses, 5), {
      message:
        "You must provide at least 5 years of address history. If you haven't lived in one place for 5 years, please add additional addresses to cover the full 5-year period.",
    }),
});

export type ApplicationFormPage1Schema = z.infer<
  typeof applicationFormPage1Schema
>;
