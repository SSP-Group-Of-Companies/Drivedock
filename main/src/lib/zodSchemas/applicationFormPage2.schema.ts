// src/lib/zodSchemas/applicationFormPage2.schema.ts
import { z } from "zod";
import {
  validateEmploymentHistory,
  isValidPhoneNumber,
} from "@/lib/utils/validationUtils";

// Single employment entry
export const employmentEntrySchema = z
  .object({
    employerName: z.string().trim().min(1, "Employer name is required"),
    supervisorName: z.string().trim().min(1, "Supervisor name is required"),
    address: z.string().trim().min(1, "Address is required"),
    postalCode: z.string().trim().min(1, "Postal code is required"),
    city: z.string().trim().min(1, "City is required"),
    stateOrProvince: z.string().trim().min(1, "State/Province is required"),
    phone1: z
      .string()
      .trim()
      .min(1, "Primary phone number is required")
      .refine((v) => isValidPhoneNumber(v), "Invalid phone number"),
    phone2: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || isValidPhoneNumber(v), "Invalid phone number"),
    email: z.string().trim().email("Invalid email address"),
    positionHeld: z.string().trim().min(1, "Position held is required"),
    from: z.string().trim().min(1, "Start date is required"),
    to: z.string().trim().min(1, "End date is required"),
    salary: z.string().trim().min(1, "Salary is required"),
    reasonForLeaving: z.string().trim().min(1, "Reason is required"),
    // keep tri-state UX: undefined until user chooses
    subjectToFMCSR: z
      .boolean()
      .optional()
      .refine((val) => val !== undefined, {
        message: "Please specify FMCSR applicability",
      }),
    safetySensitiveFunction: z
      .boolean()
      .optional()
      .refine((val) => val !== undefined, {
        message: "Please specify safety-sensitive status",
      }),
    gapExplanationBefore: z.string().trim().optional(),
  })
  // local sanity: from < to
  .refine(
    (e) => {
      const from = new Date(e.from);
      const to = new Date(e.to);
      return !isNaN(from.getTime()) && !isNaN(to.getTime()) && to > from;
    },
    { path: ["to"], message: "End date must be after start date" }
  );

// Page 2 schema + cross-entry validation
export const applicationFormPage2Schema = z
  .object({
    employments: z
      .array(employmentEntrySchema)
      .min(1, "At least one employment entry is required"),
  })
  .superRefine(({ employments }, ctx) => {
    // normalize booleans for util
    const normalized = employments.map((emp) => ({
      ...emp,
      subjectToFMCSR: emp.subjectToFMCSR ?? false,
      safetySensitiveFunction: emp.safetySensitiveFunction ?? false,
    }));

    const errorMessage = validateEmploymentHistory(normalized);
    if (!errorMessage) return;

    // Try to map message → field when possible
    const gapMatch = errorMessage.match(
      /Missing gap explanation before employment at (.+)/
    );
    if (gapMatch) {
      const supervisor = gapMatch[1];
      const index = employments.findIndex(
        (e) => e.supervisorName.toLowerCase() === supervisor.toLowerCase()
      );
      if (index !== -1) {
        ctx.addIssue({
          code: "custom",
          path: ["employments", index, "gapExplanationBefore"],
          message: "Please explain the gap in your employment history.",
        });
        return;
      }
    }

    const overlapMatch = errorMessage.match(
      /Job at (.+) overlaps with job at (.+)/
    );
    if (overlapMatch) {
      const supervisor = overlapMatch[1];
      const index = employments.findIndex(
        (e) => e.supervisorName.toLowerCase() === supervisor.toLowerCase()
      );
      if (index !== -1) {
        ctx.addIssue({
          code: "custom",
          path: ["employments", index, "from"],
          message: "Employment dates overlap with another job entry.",
        });
        return;
      }
    }

    // Fallback: attach to array root
    ctx.addIssue({
      code: "custom",
      path: ["employments"],
      message: errorMessage,
    });
  });

export type ApplicationFormPage2Schema = z.infer<
  typeof applicationFormPage2Schema
>;
