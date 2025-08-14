import { z } from "zod";
import { ELicenseType } from "@/types/shared.types";
import { hasRecentAddressCoverage } from "@/lib/utils/hasMinimumAddressDuration";

// Helpers
const dateYMD = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

// Accepts digits, spaces, (), -, + but must contain at least 10 digits overall
const phoneLoose = z
  .string()
  .min(7, "Enter a valid phone")
  .refine((val) => (val.match(/\d/g)?.length ?? 0) >= 10, {
    message: "Enter at least 10 digits",
  });

// S3 Photo Schema
export const photoSchema = z.object({
  s3Key: z.string().min(1, "Photo is required"),
  url: z.string().min(1, "Photo URL is required"),
});

// License Entry — photos optional here; first license requirement enforced below
export const licenseEntrySchema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  licenseStateOrProvince: z.string().min(1, "Province is required"),
  licenseType: z.nativeEnum(ELicenseType),
  licenseExpiry: dateYMD,
  licenseFrontPhoto: z.union([photoSchema, z.undefined()]).optional(),
  licenseBackPhoto: z.union([photoSchema, z.undefined()]).optional(),
});

// Address Entry
export const addressEntrySchema = z
  .object({
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    stateOrProvince: z.string().min(1, "Province is required"),
    postalCode: z.string().min(3, "Postal code is required"),
    from: dateYMD,
    to: dateYMD,
  })
  .refine(
    (data) => {
      const from = new Date(data.from);
      const to = new Date(data.to);
      return to > from;
    },
    { message: "End date must be after start date", path: ["to"] }
  );

export const applicationFormPage1Schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),

  // Store only digits; server re-validates with Luhn/format anyway
  sin: z.string().refine((val) => /^\d{9}$/.test(val.replace(/\D/g, "")), {
    message: "SIN must be 9 digits",
  }),

  sinPhoto: photoSchema,

  dob: dateYMD.refine(
    (dob) => {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age >= 23 && age <= 100;
    },
    { message: "Age must be between 23 and 100 years old" }
  ),

  // 🔧 Backend treats phoneHome as optional; mirror that here
  phoneHome: phoneLoose.optional().or(z.literal("")),
  phoneCell: phoneLoose,

  canProvideProofOfAge: z.boolean().refine((v) => v === true, {
    message: "You must confirm that you can provide proof of age",
  }),

  email: z.string().email().min(1, "Email is required"),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactPhone: phoneLoose,

  birthCity: z.string().min(1, "City of birth is required"),
  birthCountry: z.string().min(1, "Country of birth is required"),
  birthStateOrProvince: z
    .string()
    .min(1, "Province/State of birth is required"),

  licenses: z
    .array(licenseEntrySchema)
    .min(1, "At least one license is required")
    // Backend requires first license = AZ; enforce here for UX
    .refine((licenses) => licenses[0]?.licenseType === ELicenseType.AZ, {
      message: "The first license must be of type AZ",
    })
    // Require photos only for the first license (UX mirror of server rules)
    .refine(
      (licenses) => {
        const first = licenses[0];
        return Boolean(
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
        return Boolean(
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

    // ✅ Server requires 5-year coverage — keep this to match backend
    .refine((addresses) => hasRecentAddressCoverage(addresses, 5), {
      message:
        "You must provide at least 5 years of address history. If you haven't lived in one place for 5 years, please add additional addresses.",
      path: [],
    })

    .refine(
      (addresses) => {
        // No overlaps & no > 2yr gaps
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
        path: [],
      }
    )
    .refine(
      (addresses) => {
        // Most recent address ends within last 6 months
        const valid = addresses.filter((a) => a.to?.trim());
        if (!valid.length) return false;
        const lastEnd = new Date(
          valid
            .sort((a, b) => new Date(a.to).getTime() - new Date(b.to).getTime())
            .at(-1)!.to
        );
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return lastEnd >= sixMonthsAgo;
      },
      {
        message:
          "Your most recent address must extend to within the last 6 months",
        path: [],
      }
    ),
});

export type ApplicationFormPage1Schema = z.infer<
  typeof applicationFormPage1Schema
>;
