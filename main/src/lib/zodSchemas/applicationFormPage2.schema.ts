// src/lib/zodSchemas/applicationFormPage2.schema.ts

import { z } from "zod";
import { validateEmploymentHistory } from "@/lib/utils/validationUtils";

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

export const applicationFormPage2Schema = z.object({
  employments: z
    .array(employmentEntrySchema)
    .min(1, "At least one employment entry is required")
    .refine(
      (employments) => {
        // Convert to the format expected by validateEmploymentHistory
        const employmentData = employments.map((emp) => ({
          ...emp,
          subjectToFMCSR: emp.subjectToFMCSR ?? false,
          safetySensitiveFunction: emp.safetySensitiveFunction ?? false,
        }));

        const error = validateEmploymentHistory(employmentData);
        return !error; // Return true if no error (validation passes)
      },
      {
        message:
          "Employment history must cover at least 2 years of driving experience",
      }
    ),
});

// For React Hook Form usage
export type ApplicationFormPage2Schema = z.infer<
  typeof applicationFormPage2Schema
>;
