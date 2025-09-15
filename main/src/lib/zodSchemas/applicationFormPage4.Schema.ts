// src/lib/zodSchemas/applicationFormPage4.Schema.ts
import { z } from "zod";
import { ECountryCode } from "@/types/shared.types";
import { IApplicationFormPage4 } from "@/types/applicationForm.types";

// Reuse your common helpers
const dateYMD = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const photoSchema = z.object({
  s3Key: z.string().min(1, "Photo is required"),
  url: z.string().min(1, "Photo URL is required"),
  mimeType: z.string().min(1, "Photo mimeType is required"),
  sizeBytes: z.number().optional(),
  originalName: z.string().optional(),
});

// --- Atomic entries ---
export const criminalRecordEntrySchema = z.object({
  offense: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? ""),
  dateOfSentence: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? ""),
  courtLocation: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? ""),
});

export const fastCardSchema = z.object({
  fastCardNumber: z.string().min(1, "Fast card number is required"),
  fastCardExpiry: dateYMD,
  fastCardFrontPhoto: photoSchema.optional(),
  fastCardBackPhoto: photoSchema.optional(),
});

// Truck details schema (all optional)
export const truckDetailsSchema = z.object({
  vin: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? ""),
  make: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? ""),
  model: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? ""),
  year: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? ""),
  province: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? ""),
  truckUnitNumber: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? ""),
  plateNumber: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? ""),
  employeeNumber: z
    .string()
    .optional()
    .transform((v) => v?.trim() ?? ""),
});

// ---- Factory so we can consider existing values and country rules ----
type FactoryOpts = {
  countryCode: ECountryCode; // 'CA' | 'US'
  existing?: Partial<IApplicationFormPage4> | null; // page4 data returned by GET
};

export function makeApplicationFormPage4Schema(opts: FactoryOpts) {
  const { countryCode } = opts ?? {};
  const isCanadian = countryCode === ECountryCode.CA;
  const isUS = countryCode === ECountryCode.US;

  const base = z.object({
    criminalRecords: z.array(criminalRecordEntrySchema).default([]),

    hstNumber: z
      .string()
      .optional()
      .transform((v) => v?.trim() ?? ""),
    businessName: z
      .string()
      .optional()
      .transform((v) => v?.trim() ?? ""),
    hstPhotos: z.array(photoSchema).default([]),
    incorporatePhotos: z.array(photoSchema).default([]),
    bankingInfoPhotos: z.array(photoSchema).default([]),

    healthCardPhotos: z.array(photoSchema).default([]),
    medicalCertificationPhotos: z.array(photoSchema).default([]),
    passportPhotos: z.array(photoSchema).default([]),
    usVisaPhotos: z.array(photoSchema).default([]),
    prPermitCitizenshipPhotos: z.array(photoSchema).default([]),

    // Optional FAST card (Canada only) — keep it optional + empty-string transforms
    fastCard: z
      .object({
        fastCardNumber: z
          .string()
          .optional()
          .transform((v) => v?.trim() ?? ""),
        fastCardExpiry: z
          .string()
          .optional()
          .transform((v) => v ?? ""),
        fastCardFrontPhoto: photoSchema.optional(),
        fastCardBackPhoto: photoSchema.optional(),
      })
      .optional(),

    deniedLicenseOrPermit: z.boolean().optional(),
    suspendedOrRevoked: z.boolean().optional(),
    suspensionNotes: z
      .string()
      .optional()
      .transform((v) => (v ?? "").trim()),
    testedPositiveOrRefused: z.boolean().optional(),
    completedDOTRequirements: z.boolean().optional(),
    hasAccidentalInsurance: z.boolean().optional(),

    // Truck Details (Admin-only, all optional)
    truckDetails: truckDetailsSchema.optional(),
  });

  type Out = z.infer<typeof base>;

  const schema = base
    // Business all-or-nothing (unchanged)
    .superRefine((data: Out, ctx) => {
      const textProvided = !!data.businessName?.trim() || !!data.hstNumber?.trim();
      const photosProvided = data.hstPhotos.length > 0 || data.incorporatePhotos.length > 0 || data.bankingInfoPhotos.length > 0;
      if (!textProvided && !photosProvided) return;

      let hadError = false;
      if (!data.businessName?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["businessName"], message: "Business name is required when any business detail is provided." });
        hadError = true;
      }
      if (!data.hstNumber?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["hstNumber"], message: "HST number is required when any business detail is provided." });
        hadError = true;
      }
      if (data.incorporatePhotos.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["incorporatePhotos"], message: "At least one Incorporate photo is required." });
        hadError = true;
      }
      if (data.hstPhotos.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["hstPhotos"], message: "At least one HST photo is required." });
        hadError = true;
      }
      if (data.bankingInfoPhotos.length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bankingInfoPhotos"], message: "At least one Banking Info photo is required." });
        hadError = true;
      }
      if (hadError) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["business.root"], message: "All business section fields and files must be provided if any are." });
      }
    })

    // Country-specific docs (unchanged logic, still use leaf paths and the eligibility section anchor)
    .superRefine((data: Out, ctx) => {
      if (isCanadian) {
        if (data.healthCardPhotos.length !== 2)
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["healthCardPhotos"], message: "Health card front and back photos required for Canadian applicants." });
        if (data.passportPhotos.length !== 2) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["passportPhotos"], message: "Passport bio and back photos required for Canadian applicants." });
        if (data.usVisaPhotos.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["usVisaPhotos"], message: "US visa photo required for Canadian applicants." });
        if (data.prPermitCitizenshipPhotos.length === 0)
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["prPermitCitizenshipPhotos"], message: "PR/Citizenship photo required for Canadian applicants." });
      }

      if (isUS) {
        if (data.medicalCertificationPhotos.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["medicalCertificationPhotos"],
            message: "Medical certificate required for US drivers",
          });
        }

        // Passport & PR/Citizenship rules
        const hasPassport = data.passportPhotos.length > 0;
        const hasPR = data.prPermitCitizenshipPhotos.length > 0;

        if (!hasPassport && !hasPR) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["eligibilityDocs.root"], // section banner anchor
            message: "US drivers must provide passport or PR/citizenship photo",
          });
        }

        if (hasPassport && data.passportPhotos.length !== 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["passportPhotos"],
            message: "Passport requires two photos (bio and back) for US applicants.",
          });
        }

        if (hasPR && data.prPermitCitizenshipPhotos.length < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["prPermitCitizenshipPhotos"],
            message: "At least one PR/Citizenship photo is required for US applicants.",
          });
        }
      }
    })

    // FAST card (Canada only): validate **only if the form sends a fastCard object**,
    // and validate strictly against the payload (ignore any existing on-file photos).
    .superRefine((data, ctx) => {
      if (!isCanadian) return;
      const fc = data.fastCard;
      if (!fc) return;

      // Only validate if ANY leaf is provided
      const anyProvided = !!fc.fastCardNumber?.trim() || !!fc.fastCardExpiry || !!fc.fastCardFrontPhoto || !!fc.fastCardBackPhoto;

      // If all are empty → treat as optional and skip
      if (!anyProvided) return;

      // Now enforce "all-or-nothing"
      if (!fc.fastCardNumber?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fastCard.fastCardNumber"],
          message: "Fast card number is required",
        });
      }
      if (!fc.fastCardExpiry) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fastCard.fastCardExpiry"],
          message: "Fast card expiry is required",
        });
      }
      if (!fc.fastCardFrontPhoto) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fastCard.fastCardFrontPhoto"],
          message: "Front photo is required",
        });
      }
      if (!fc.fastCardBackPhoto) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fastCard.fastCardBackPhoto"],
          message: "Back photo is required",
        });
      }
    })

    // Criminal Records: all-or-nothing validation per row
    .superRefine((data: Out, ctx) => {
      data.criminalRecords.forEach((record, index) => {
        // Check if any field in this row has data
        const hasAnyData = !!record.offense?.trim() || !!record.dateOfSentence?.trim() || !!record.courtLocation?.trim();

        if (hasAnyData) {
          // If any field has data, all fields become required
          if (!record.offense?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["criminalRecords", index, "offense"],
              message: "Offense is required when any field in this row has data.",
            });
          }
          if (!record.dateOfSentence?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["criminalRecords", index, "dateOfSentence"],
              message: "Date of sentence is required when any field in this row has data.",
            });
          }
          if (!record.courtLocation?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["criminalRecords", index, "courtLocation"],
              message: "Court location is required when any field in this row has data.",
            });
          }
        }
      });
    })

    .superRefine((data: Out, ctx) => {
      // Force a selection for all Yes/No questions
      (["deniedLicenseOrPermit", "suspendedOrRevoked", "testedPositiveOrRefused", "completedDOTRequirements", "hasAccidentalInsurance"] as const).forEach((key) => {
        if (typeof data[key] !== "boolean") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: "Please select Yes or No.",
          });
        }
      });

      // If suspendedOrRevoked is Yes → notes required
      if (data.suspendedOrRevoked === true && !data.suspensionNotes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["suspensionNotes"],
          message: "Please provide details about the suspension/revocation.",
        });
      }
    })

    .transform((val) => {
      // Fast card cleanup (existing logic)
      const fc = val.fastCard;
      if (fc) {
        const anyProvided = !!fc.fastCardNumber?.trim() || !!fc.fastCardExpiry || !!fc.fastCardFrontPhoto || !!fc.fastCardBackPhoto;
        if (!anyProvided) (val as any).fastCard = undefined;
      }
      return val;
    });

  return schema;
}

export type ApplicationFormPage4Input = z.input<ReturnType<typeof makeApplicationFormPage4Schema>>;
export type ApplicationFormPage4Output = z.output<ReturnType<typeof makeApplicationFormPage4Schema>>;

// If you were using this name elsewhere, re-alias it to INPUT (what RHF wants):
export type ApplicationFormPage4Schema = ApplicationFormPage4Input;
