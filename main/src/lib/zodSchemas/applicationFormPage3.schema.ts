// src/lib/zodSchemas/applicationFormPage3.schema.ts

import { z } from "zod";

export const ApplicationFormPage3Schema = z.object({
  emergencyContactName: z.string().min(1, "Required"),
  emergencyContactPhone: z.string().min(10, "Phone number required"),
  birthPlace: z.string().min(1, "Required"),
  citizenshipStatus: z.enum([
    "Citizen",
    "Permanent Resident",
    "Work Permit",
    "Visitor",
    "Other",
  ]),
  hasPreviousConvictions: z.boolean().optional(), // Example field
  // Add more fields as needed based on your PDF/forms
});

export type ApplicationFormPage3Schema = z.infer<
  typeof ApplicationFormPage3Schema
>;
