// src/lib/zodSchemas/applicationFormPage2.schema.ts
import { z } from "zod";
import {
  validateEmploymentHistory,
  isValidPhoneNumber,
} from "@/lib/utils/validationUtils";

// Previous work details schema
export const previousWorkDetailsSchema = z.object({
  from: z.string().trim().min(1, "Start date is required"),
  to: z.string().trim().min(1, "End date is required"),
  rateOfPay: z.string().trim().min(1, "Rate of pay is required"),
  position: z.string().trim().min(1, "Position is required"),
}).refine(
  (data) => {
    const from = new Date(data.from);
    const to = new Date(data.to);
    return !isNaN(from.getTime()) && !isNaN(to.getTime()) && to > from;
  },
  { path: ["to"], message: "End date must be after start date" }
);

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
    // tri-state until the user chooses
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
    
    // New employment-related questions
    workedWithCompanyBefore: z
      .union([z.boolean(), z.undefined()])
      .refine((val) => val !== undefined, {
        message: "Please select whether you have worked with this company before",
      }),
    
    reasonForLeavingCompany: z.string().optional(),
    
    previousWorkDetails: previousWorkDetailsSchema.optional(),
    
    currentlyEmployed: z
      .union([z.boolean(), z.undefined()])
      .refine((val) => val !== undefined, {
        message: "Please select whether you are currently employed",
      }),
    
    referredBy: z.string().trim().optional(),
    
    expectedRateOfPay: z.string().trim().min(1, "Expected rate of pay is required"),
  })
  .superRefine((data, ctx) => {
    // Validate conditional fields based on workedWithCompanyBefore
    if (data.workedWithCompanyBefore === true) {
      if (!data.reasonForLeavingCompany || data.reasonForLeavingCompany.trim() === "") {
        ctx.addIssue({
          code: "custom",
          path: ["reasonForLeavingCompany"],
          message: "Please explain your reason for leaving the company",
        });
      }
      
      if (!data.previousWorkDetails) {
        ctx.addIssue({
          code: "custom",
          path: ["previousWorkDetails"],
          message: "Please provide your previous work details",
        });
      }
    }
    
    // Validate employments array
    const { employments } = data;
    
    // normalize booleans for util
    const normalized = employments.map((emp) => ({
      ...emp,
      subjectToFMCSR: emp.subjectToFMCSR ?? false,
      safetySensitiveFunction: emp.safetySensitiveFunction ?? false,
    }));

    const errorMessage = validateEmploymentHistory(normalized);
    if (!errorMessage) return;

    // For gap errors, redirect to root banner so scroll lands at the top
    const gapMatch = errorMessage.match(
      /Missing gap explanation before employment at (.+)/
    );
    if (gapMatch) {
      ctx.addIssue({
        code: "custom",
        path: ["employments", "totals", "root"], // 👈 matches the data-field anchor
        message: "Please explain the gap(s) in your employment history. Look for the red gap explanation fields below.",
      });
      return;
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

    // Fallback: attach to the banner anchor so scroll lands at the top message
    ctx.addIssue({
      code: "custom",
      path: ["employments", "totals", "root"], // 👈 matches the data-field anchor
      message: errorMessage,
    });
  });

export type ApplicationFormPage2Schema = z.infer<
  typeof applicationFormPage2Schema
>;
