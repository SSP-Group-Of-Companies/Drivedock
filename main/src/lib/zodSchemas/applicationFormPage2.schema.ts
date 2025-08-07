// src/lib/zodSchemas/applicationFormPage2.schema.ts

import { z } from "zod";
import { validateEmploymentHistory } from "@/lib/utils/validationUtils";

// Schema for a single employment entry
export const employmentEntrySchema = z.object({
  employerName: z.string().min(1, "Employer name is required"),
  supervisorName: z.string().min(1, "Supervisor name is required"),
  address: z.string().min(1, "Address is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  city: z.string().min(1, "City is required"),
  stateOrProvince: z.string().min(1, "State/Province is required"),
  phone1: z.string().min(1, "Primary phone number is required"),
  phone2: z.string().optional(),
  email: z.string().email("Invalid email address"),
  positionHeld: z.string().min(1, "Position held is required"),
  from: z.string().min(1, "Start date is required"),
  to: z.string().min(1, "End date is required"),
  salary: z.string().min(1, "Salary is required"),
  reasonForLeaving: z.string().min(1, "Reason is required"),
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
  gapExplanationBefore: z.string().optional(),
});

// Main schema for Page 2 (with custom validation applied)
export const applicationFormPage2Schema = z
  .object({
    employments: z
      .array(employmentEntrySchema)
      .min(1, "At least one employment entry is required"),
  })
  .superRefine(({ employments }, ctx) => {
    // Perform backend-style validation in frontend
    const entries = employments.map((emp) => ({
      ...emp,
      subjectToFMCSR: emp.subjectToFMCSR ?? false,
      safetySensitiveFunction: emp.safetySensitiveFunction ?? false,
    }));

    // Run validation check
    const errorMessage = validateEmploymentHistory(entries);

    if (!errorMessage) return;

    // Inject errors dynamically based on returned message
    // Gap explanation example:
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
          message: "Please explain the gap in your employment history.",
          path: ["employments", index, "gapExplanationBefore"],
        });
        return;
      }
    }

    // Overlap message
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
          message: "Employment dates overlap with another job entry.",
          path: ["employments", index, "from"],
        });
        return;
      }
    }

    // Fallback if nothing matched above
    ctx.addIssue({
      code: "custom",
      message: errorMessage,
      path: ["employments"],
    });
  });

// For React Hook Form usage
export type ApplicationFormPage2Schema = z.infer<
  typeof applicationFormPage2Schema
>;
