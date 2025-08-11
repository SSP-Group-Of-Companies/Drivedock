import { z } from "zod";
import { ECountryCode } from "@/types/shared.types";
import { IApplicationFormPage4, IFastCard } from "@/types/applicationForm.types";

// Reuse your common helpers
const dateYMD = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const photoSchema = z.object({
  s3Key: z.string().min(1, "Photo is required"),
  url: z.string().min(1, "Photo URL is required"),
});

// --- Atomic entries ---
export const criminalRecordEntrySchema = z.object({
  offense: z.string().min(1, "Offense is required."),
  dateOfSentence: dateYMD,
  courtLocation: z.string().min(1, "Court location is required."),
});

export const fastCardSchema = z.object({
  fastCardNumber: z.string().min(1, "Fast card number is required"),
  fastCardExpiry: dateYMD,
  fastCardFrontPhoto: photoSchema.optional(),
  fastCardBackPhoto: photoSchema.optional(),
});

// ---- Factory so we can consider existing values and country rules ----
type FactoryOpts = {
  countryCode: ECountryCode; // 'CA' | 'US'
  existing?: Partial<IApplicationFormPage4> | null; // page4 data returned by GET
};

function countWithExisting<T>(current: T[] | undefined, existing: T[] | undefined) {
  return (current?.length ?? 0) + (existing?.length ?? 0);
}

export function makeApplicationFormPage4Schema(opts: FactoryOpts) {
  const { countryCode, existing } = opts ?? {};
  const isCanadian = countryCode === ECountryCode.CA;
  const isUS = countryCode === ECountryCode.US;

  // The raw (unrefined) shape mirrors your Mongoose schema
  const base = z.object({
    // Criminal Records (optional list; when present, entries must be valid)
    criminalRecords: z.array(criminalRecordEntrySchema).default([]),

    // Business section
    employeeNumber: z
      .string()
      .optional()
      .transform((v) => v?.trim() ?? ""),
    hstNumber: z
      .string()
      .optional()
      .transform((v) => v?.trim() ?? ""),
    businessNumber: z
      .string()
      .optional()
      .transform((v) => v?.trim() ?? ""),
    hstPhotos: z.array(photoSchema).default([]),
    incorporatePhotos: z.array(photoSchema).default([]),
    bankingInfoPhotos: z.array(photoSchema).default([]),

    // ID / work eligibility photos
    healthCardPhotos: z.array(photoSchema).default([]),
    medicalCertificationPhotos: z.array(photoSchema).default([]),
    passportPhotos: z.array(photoSchema).default([]),
    usVisaPhotos: z.array(photoSchema).default([]),
    prPermitCitizenshipPhotos: z.array(photoSchema).default([]),

    // Optional FAST card
    fastCard: fastCardSchema.optional(),

    // Additional info
    deniedLicenseOrPermit: z.boolean({
      error: "Denial of license or permit must be specified.",
    }),
    suspendedOrRevoked: z.boolean({
      error: "Suspension or revocation status must be specified.",
    }),
    suspensionNotes: z
      .string()
      .optional()
      .transform((v) => v ?? ""),
    testedPositiveOrRefused: z.boolean({
      error: "Drug test refusal or positive result must be specified.",
    }),
    completedDOTRequirements: z.boolean({
      error: "DOT requirements completion must be specified.",
    }),
    hasAccidentalInsurance: z.boolean({
      error: "Accidental insurance status must be specified.",
    }),
  });

  type Out = z.infer<typeof base>;

  // --- Refinements that depend on existing + country ---
  const schema = base
    // Business section: if ANY provided, require ALL (numbers + each photo group ≥ 1 considering existing)
    .superRefine((data: Out, ctx) => {
      const anyProvided = !!data.employeeNumber || !!data.businessNumber || !!data.hstNumber || data.hstPhotos.length > 0 || data.incorporatePhotos.length > 0 || data.bankingInfoPhotos.length > 0;

      if (!anyProvided) return;

      const hstCount = countWithExisting(data.hstPhotos, existing?.hstPhotos as any);
      const incCount = countWithExisting(data.incorporatePhotos, existing?.incorporatePhotos as any);
      const bankCount = countWithExisting(data.bankingInfoPhotos, existing?.bankingInfoPhotos as any);

      const allOk = data.employeeNumber && data.businessNumber && data.hstNumber && hstCount > 0 && incCount > 0 && bankCount > 0;

      if (!allOk) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "All business section fields and files must be provided if any are.",
          path: [], // form-level error, match backend message
        });
      }
    })

    // Country-specific requirements
    .superRefine((data: Out, ctx) => {
      if (isCanadian) {
        const needs: Array<{
          key: keyof Pick<Out, "healthCardPhotos" | "passportPhotos" | "usVisaPhotos" | "prPermitCitizenshipPhotos">;
          label: string;
          existing?: any[];
        }> = [
          {
            key: "healthCardPhotos",
            label: "Health card photo",
            existing: (existing?.healthCardPhotos as any) ?? [],
          },
          {
            key: "passportPhotos",
            label: "Passport photo",
            existing: (existing?.passportPhotos as any) ?? [],
          },
          {
            key: "usVisaPhotos",
            label: "US visa photo",
            existing: (existing?.usVisaPhotos as any) ?? [],
          },
          {
            key: "prPermitCitizenshipPhotos",
            label: "PR/Citizenship photo",
            existing: (existing?.prPermitCitizenshipPhotos as any) ?? [],
          },
        ];

        for (const n of needs) {
          const total = countWithExisting(data[n.key] as any[], n.existing as any[]);
          if (total === 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${n.label} required for Canadian applicants.`,
              path: [n.key],
            });
          }
        }
      }

      if (isUS) {
        const medTotal = countWithExisting(data.medicalCertificationPhotos, (existing?.medicalCertificationPhotos as any) ?? []);
        if (medTotal === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Medical certificate required for US drivers",
            path: ["medicalCertificationPhotos"],
          });
        }

        const passportTotal = countWithExisting(data.passportPhotos, (existing?.passportPhotos as any) ?? []);
        const prTotal = countWithExisting(data.prPermitCitizenshipPhotos, (existing?.prPermitCitizenshipPhotos as any) ?? []);
        if (passportTotal === 0 && prTotal === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "US drivers must provide passport or PR/citizenship photo",
            path: [], // form-level like your backend
          });
        }
      }
    })

    // FAST card (Canada only): If user provides a fastCard now, require number+expiry and BOTH photos,
    // allowing either new or existing photos to satisfy the rule.
    .superRefine((data: Out, ctx) => {
      if (!isCanadian) return;

      const providedNow = !!data.fastCard;
      const existingFast = existing?.fastCard as IFastCard | undefined;

      if (!providedNow) return; // optional unless they provide it now

      const numOk = !!data.fastCard?.fastCardNumber?.trim();
      const expOk = !!data.fastCard?.fastCardExpiry;

      const frontTotal = countWithExisting(
        data.fastCard?.fastCardFrontPhoto ? [data.fastCard.fastCardFrontPhoto] : [],
        existingFast?.fastCardFrontPhoto ? [existingFast.fastCardFrontPhoto as any] : []
      );
      const backTotal = countWithExisting(data.fastCard?.fastCardBackPhoto ? [data.fastCard.fastCardBackPhoto] : [], existingFast?.fastCardBackPhoto ? [existingFast.fastCardBackPhoto as any] : []);

      if (!numOk || !expOk) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Fast card must have number and expiry if provided",
          path: ["fastCard"],
        });
      }
      if (frontTotal === 0 || backTotal === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Fast card must include both front and back photo if provided",
          path: ["fastCard"],
        });
      }
    });

  return schema;
}

export type ApplicationFormPage4Input = z.input<ReturnType<typeof makeApplicationFormPage4Schema>>;
export type ApplicationFormPage4Output = z.output<ReturnType<typeof makeApplicationFormPage4Schema>>;

// If you were using this name elsewhere, re-alias it to INPUT (what RHF wants):
export type ApplicationFormPage4Schema = ApplicationFormPage4Input;
