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

/* -------------------- On-Road Sections -------------------- */
const OnRoadSectionsSchema = z.object({
  placingVehicleInMotion: AssessmentSectionSchema,
  highwayDriving: AssessmentSectionSchema,
  rightLeftTurns: AssessmentSectionSchema,
  defensiveDriving: AssessmentSectionSchema,
  gps: AssessmentSectionSchema,
  operatingInTraffic: AssessmentSectionSchema,
});

/* -------------------- On-Road Assessment -------------------- */
const OnRoadAssessmentSchema = z.object({
  sections: OnRoadSectionsSchema,
  supervisorName: z.string().min(1, "Supervisor name is required"),

  // same “empty string” refinement trick so select shows a friendly “is required”
  expectedStandard: z.union([z.literal(""), z.enum(EExpectedStandard)]).refine((v) => v !== "", { message: "Expected standard is required" }),

  overallAssessment: z.union([z.literal(""), z.enum(EDriveTestOverall)]).refine((v) => v !== "", { message: "Overall assessment is required" }),

  // shown conditionally in UI; server ignores it for companies where flatbed isn’t possible
  needsFlatbedTraining: z.boolean().optional(),
  milesKmsDriven: z.number().min(0, { message: "Miles/KMs driven cannot be negative" }),
  comments: z.string().optional(),
  supervisorSignature: z.object({
    s3Key: z.string().min(1, { message: "Supervisor signature is required" }),
    url: z.string().url({ message: "A valid signature URL is required" }),
    mimeType: z.string().min(1, { message: "MIME type is required" }),
    sizeBytes: z.number().optional(),
    originalName: z.string().optional(),
  }),
  assessedAt: z.coerce.date().optional(),
});

/* -------------------- Wrapper for validation -------------------- */
export const OnRoadWrapperSchema = z.object({
  powerUnitType: z.string().min(1, "Power unit type is required"),
  trailerType: z.string().min(1, "Trailer type is required"),
  onRoad: OnRoadAssessmentSchema,
});

export type OnRoadWrapperInput = z.infer<typeof OnRoadWrapperSchema>;
