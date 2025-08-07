import { z } from "zod";
import { ELicenseType } from "@/types/shared.types";
import { hasRecentAddressCoverage } from "@/lib/utils/hasMinimumAddressDuration";

// S3 Photo Schema
export const photoSchema = z.object({
  s3Key: z.string(),
  url: z.string(),
});

// License Entry — relaxed: no required photo here
export const licenseEntrySchema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  licenseStateOrProvince: z.string().min(1, "Province is required"),
  licenseType: z.nativeEnum(ELicenseType),
  licenseExpiry: z.string().min(1, "Expiry date is required"),
  licenseFrontPhoto: photoSchema.optional(),
  licenseBackPhoto: photoSchema.optional(),
});

// Address Entry
export const addressEntrySchema = z
  .object({
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    stateOrProvince: z.string().min(1, "Province is required"),
    postalCode: z.string().min(3, "Postal code is required"),
    from: z
      .string()
      .min(1, "Start date required")
      .refine(
        (date) => {
          const d = new Date(date);
          const now = new Date();
          const earliest = new Date(
            now.getFullYear() - 50,
            now.getMonth(),
            now.getDate()
          );
          return !isNaN(d.getTime()) && d <= now && d >= earliest;
        },
        {
          message:
            "Start date cannot be in the future or more than 50 years ago",
        }
      ),
    to: z
      .string()
      .min(1, "End date required")
      .refine(
        (date) => {
          const d = new Date(date);
          return !isNaN(d.getTime()) && d <= new Date();
        },
        { message: "End date cannot be in the future" }
      ),
  })
  .refine(
    (data) => {
      const from = new Date(data.from);
      const to = new Date(data.to);
      return !isNaN(from.getTime()) && !isNaN(to.getTime()) && to > from;
    },
    {
      message: "End date must be after start date",
      path: ["to"],
    }
  );

// Main Application Form Page 1 Schema
export const applicationFormPage1Schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  sin: z.string().refine((val) => /^\d{9}$/.test(val.replace(/\D/g, "")), {
    message: "SIN must be 9 digits",
  }),

  sinPhoto: photoSchema.refine((p) => p.s3Key && p.url, {
    message: "SIN photo is required",
  }),

  dob: z
    .string()
    .min(1, "Date of birth is required")
    .refine(
      (dob) => {
        const birthDate = new Date(dob);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();
        const actualAge =
          monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
        return actualAge >= 23 && actualAge <= 100;
      },
      { message: "Age must be between 23 and 100 years old" }
    ),

  phoneHome: z
    .string()
    .min(10)
    .regex(/^\d+$/, "Phone number must contain only digits"),
  phoneCell: z
    .string()
    .min(10)
    .regex(/^\d+$/, "Phone number must contain only digits"),
  canProvideProofOfAge: z.boolean().refine((v) => v === true, {
    message: "You must confirm that you can provide proof of age",
  }),
  email: z.string().email().min(1, "Email is required"),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactPhone: z
    .string()
    .min(10)
    .regex(/^\d+$/, "Phone number must contain only digits"),
  birthCity: z.string().min(1, "City of birth is required"),
  birthCountry: z.string().min(1, "Country of birth is required"),
  birthStateOrProvince: z
    .string()
    .min(1, "Province/State of birth is required"),

  licenses: z
    .array(licenseEntrySchema)
    .min(1, "At least one license is required")
    .refine((licenses) => licenses[0]?.licenseType === ELicenseType.AZ, {
      message: "The first license must be of type AZ",
    })
    .refine(
      (licenses) => {
        const first = licenses[0];
        return !!(
          first?.licenseFrontPhoto?.s3Key && first?.licenseFrontPhoto?.url
        );
      },
      {
        message: "Front license photo is required for the first license",
        path: ["0", "licenseFrontPhoto"],
      }
    )
    .refine(
      (licenses) => {
        const first = licenses[0];
        return !!(
          first?.licenseBackPhoto?.s3Key && first?.licenseBackPhoto?.url
        );
      },
      {
        message: "Back license photo is required for the first license",
        path: ["0", "licenseBackPhoto"],
      }
    ),

  addresses: z
    .array(addressEntrySchema)
    .min(1, "Address history is required")
    .refine(
      (addresses) => {
        const sorted = [...addresses].sort(
          (a, b) => new Date(a.from).getTime() - new Date(b.from).getTime()
        );
        for (let i = 0; i < sorted.length - 1; i++) {
          const currEnd = new Date(sorted[i].to);
          const nextStart = new Date(sorted[i + 1].from);
          const gapDays =
            (nextStart.getTime() - currEnd.getTime()) / (1000 * 60 * 60 * 24);
          if (currEnd > nextStart || gapDays > 730) return false;
        }
        return true;
      },
      {
        message:
          "Addresses cannot overlap and gaps between addresses cannot exceed 2 years",
      }
    )
    .refine(
      (addresses) => {
        const sorted = [...addresses].sort(
          (a, b) => new Date(a.from).getTime() - new Date(b.from).getTime()
        );
        const mostRecentEnd = new Date(sorted[sorted.length - 1]?.to || "");
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return mostRecentEnd >= sixMonthsAgo;
      },
      {
        message:
          "Your most recent address must extend to within the last 6 months",
      }
    )
    .refine((addresses) => hasRecentAddressCoverage(addresses, 5), {
      message:
        "You must provide at least 5 years of address history. If you haven't lived in one place for 5 years, please add additional addresses to cover the full 5-year period.",
    }),
});

export type ApplicationFormPage1Schema = z.infer<
  typeof applicationFormPage1Schema
>;
