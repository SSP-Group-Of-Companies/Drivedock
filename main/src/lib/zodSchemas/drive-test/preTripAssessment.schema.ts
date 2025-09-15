// src/lib/zodSchemas/drive-test/preTripAssessment.schema.ts
import { z } from "zod";
import { EDriveTestOverall, EExpectedStandard } from "@/types/driveTest.types";

/* -------------------- Generic building blocks -------------------- */

const AssessmentItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  checked: z.boolean(),
});

const AssessmentSectionSchema = z.object({
  key: z.string(),
  title: z.string(),
  items: z.array(AssessmentItemSchema),
});

/* -------------------- PreTrip Sections -------------------- */

const PreTripSectionsSchema = z.object({
  underHood: AssessmentSectionSchema,
  outside: AssessmentSectionSchema,
  uncoupling: AssessmentSectionSchema,
  coupling: AssessmentSectionSchema,
  airSystem: AssessmentSectionSchema,
  inCab: AssessmentSectionSchema,
  backingUp: AssessmentSectionSchema,
});

/* -------------------- PreTrip Assessment -------------------- */

const PreTripAssessmentSchema = z.object({
  sections: PreTripSectionsSchema,
  supervisorName: z.string().min(1, "Supervisor name is required"),
  expectedStandard: z.union([z.literal(""), z.enum(EExpectedStandard)]).refine((val) => val !== "", { message: "Expected standard is required" }),

  overallAssessment: z.union([z.literal(""), z.enum(EDriveTestOverall)]).refine((val) => val !== "", { message: "Overall assessment is required" }),

  comments: z.string().optional(),
  supervisorSignature: z.object({
    s3Key: z.string().min(1, { message: "Supervisor signature is required" }),
    url: z.string().url({ message: "A valid signature URL is required" }),
    mimeType: z.string().min(1, { message: "MIME type is required" }),
    sizeBytes: z.number().optional(),
    originalName: z.string().optional(),
  }),
  // Use coerce to accept Date | string | number and make it optional for UI flexibility
  assessedAt: z.coerce.date().optional(),
});

/* -------------------- Wrapper for validation -------------------- */

export const PreTripWrapperSchema = z.object({
  powerUnitType: z.string().min(1, "Power unit type is required"),
  trailerType: z.string().min(1, "Trailer type is required"),
  preTrip: PreTripAssessmentSchema,
});

export type PreTripWrapperInput = z.infer<typeof PreTripWrapperSchema>;
