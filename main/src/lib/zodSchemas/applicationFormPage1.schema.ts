import { z } from "zod";
import { ELicenseType } from "@/types/shared.types";
import { hasRecentAddressCoverage } from "@/lib/utils/hasMinimumAddressDuration";

// Helpers
const dateYMD = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required");

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
  mimeType: z.string().min(1, "Photo mimeType is required"),
  sizeBytes: z.number().optional(),
  originalName: z.string().optional(),
});

// License Entry — photos optional here; first license requirement enforced below
export const licenseEntrySchema = z.object({
  licenseNumber: z.string().min(1, "License number is required"),
  licenseStateOrProvince: z.string().min(1, "Province is required"),
  licenseType: z.nativeEnum(ELicenseType),
  licenseExpiry: dateYMD.refine(
    (date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if date is in the past or today
      if (selectedDate <= today) {
        return false;
      }

      // Check if date is 30 days or less from now
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);
      thirtyDaysFromNow.setHours(0, 0, 0, 0);

      if (selectedDate <= thirtyDaysFromNow) {
        return false;
      }

      return true;
    },
    {
      message: "License expiry date cannot be a past, current date, or within 30 days",
    }
  ),
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
    to: dateYMD.refine(
      (date) => {
        const toDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return toDate <= today;
      },
      { message: "End date cannot be in the future" }
    ),
  })
  .refine(
    (data) => {
      const from = new Date(data.from);
      const to = new Date(data.to);
      return to > from;
    },
    { message: "End date must be after start date", path: ["to"] }
  );

// Base schema without conditional fields
const baseApplicationFormPage1Schema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),

    // Store only digits; server re-validates with Luhn/format anyway
    sin: z.string().refine((val) => /^\d{9}$/.test(val.replace(/\D/g, "")), {
      message: "SIN must be 9 digits",
    }),

    sinIssueDate: dateYMD.refine(
      (date) => {
        const issueDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Issue date cannot be in the future
        if (issueDate > today) {
          return false;
        }

        // Issue date cannot be more than 100 years ago (reasonable limit)
        const hundredYearsAgo = new Date();
        hundredYearsAgo.setFullYear(today.getFullYear() - 100);

        return issueDate >= hundredYearsAgo;
      },
      {
        message: "SIN issue date cannot be in the future or more than 100 years ago",
      }
    ),

    // SIN expiry date will be added conditionally

    gender: z.enum(["male", "female"], {
      message: "Gender must be either 'male' or 'female'",
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
    birthStateOrProvince: z.string().min(1, "Province/State of birth is required"),

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
          return Boolean(first?.licenseFrontPhoto?.s3Key && first?.licenseFrontPhoto?.url);
        },
        {
          message: "Front license photo is required for the first license",
          path: ["0", "licenseFrontPhoto"],
        }
      )
      .refine(
        (licenses) => {
          const first = licenses[0];
          return Boolean(first?.licenseBackPhoto?.s3Key && first?.licenseBackPhoto?.url);
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
        message: "You must provide at least 5 years of address history. If you haven't lived in one place for 5 years, please add additional addresses.",
        path: [],
      })

      .refine(
        (addresses) => {
          // No overlaps & no > 2yr gaps
          const sorted = [...addresses].sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime());
          for (let i = 0; i < sorted.length - 1; i++) {
            const currEnd = new Date(sorted[i].to);
            const nextStart = new Date(sorted[i + 1].from);
            const gapDays = (nextStart.getTime() - currEnd.getTime()) / (1000 * 60 * 60 * 24);
            if (currEnd > nextStart || gapDays > 730) return false;
          }
          return true;
        },
        {
          message: "Addresses cannot overlap and gaps between addresses cannot exceed 2 years",
          path: [],
        }
      )
      .refine(
        (addresses) => {
          // Most recent address ends within last 6 months
          const valid = addresses.filter((a) => a.to?.trim());
          if (!valid.length) return false;
          const lastEnd = new Date(valid.sort((a, b) => new Date(a.to).getTime() - new Date(b.to).getTime()).at(-1)!.to);
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          return lastEnd >= sixMonthsAgo;
        },
        {
          message: "Your most recent address must extend to within the last 6 months",
          path: [],
        }
      ),
  })
  .superRefine((data, ctx) => {
    const digits = (s: string) => (s ?? "").replace(/\D/g, "");
    if (digits(data.phoneCell) === digits(data.emergencyContactPhone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Emergency contact phone must be different from your cell phone",
        path: ["emergencyContactPhone"],
      });
    }
  });

// Schema factory function that creates schema based on prequalification data
export function createApplicationFormPage1Schema(prequalificationData?: { statusInCanada?: string } | null) {
  const isWorkPermit = prequalificationData?.statusInCanada === "Work Permit";

  return baseApplicationFormPage1Schema.safeExtend({
    sinExpiryDate: isWorkPermit
      ? dateYMD.refine(
          (date) => {
            const expiryDate = new Date(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return expiryDate > today;
          },
          {
            message: "SIN expiry date must be in the future",
          }
        )
      : dateYMD.optional().refine(
          (date) => {
            if (!date) return true; // Optional when not Work Permit
            const expiryDate = new Date(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return expiryDate > today;
          },
          {
            message: "SIN expiry date must be in the future",
          }
        ),
  });
}

// Default schema (for backward compatibility)
export const applicationFormPage1Schema = createApplicationFormPage1Schema();

export type ApplicationFormPage1Schema = z.infer<typeof applicationFormPage1Schema>;
