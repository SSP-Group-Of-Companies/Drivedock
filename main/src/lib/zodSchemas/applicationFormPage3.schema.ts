import { z } from "zod";

// Accident Entry Schema
export const accidentEntrySchema = z.object({
  date: z.string().min(1, "Date is required"),
  natureOfAccident: z.string().min(1, "Nature of accident is required"),
  fatalities: z.number().min(0, "Fatalities must be 0 or greater"),
  injuries: z.number().min(0, "Injuries must be 0 or greater"),
});

// Traffic Conviction Entry Schema
export const trafficConvictionEntrySchema = z.object({
  date: z.string().min(1, "Date is required"),
  location: z.string().min(1, "Location is required"),
  charge: z.string().min(1, "Charge is required"),
  penalty: z.string().min(1, "Penalty is required"),
});

// Education Schema
export const educationSchema = z.object({
  gradeSchool: z
    .number()
    .min(0, "Grade school years must be 0 or greater")
    .max(12, "Grade school years cannot exceed 12"),
  college: z
    .number()
    .min(0, "College years must be 0 or greater")
    .max(4, "College years cannot exceed 4"),
  postGraduate: z
    .number()
    .min(0, "Post graduate years must be 0 or greater")
    .max(4, "Post graduate years cannot exceed 4"),
});

// Canadian Daily Hours Schema
export const canadianDailyHoursSchema = z.object({
  day: z.number().min(1, "Day number must be between 1 and 14").max(14, "Day number must be between 1 and 14"),
  hours: z.number().min(0).max(24, "Hours cannot exceed 24"),
});

// Canadian Hours of Service Schema
export const canadianHoursOfServiceSchema = z.object({
  dayOneDate: z.string().min(1, "Date is required"),
  dailyHours: z
    .array(canadianDailyHoursSchema)
    .length(14, "Must have exactly 14 days"),
  totalHours: z.number().optional(),
});

// Page 3 Schema - Simplified validation since we filter empty entries before submission
export const applicationFormPage3Schema = z.object({
  accidentHistory: z.array(accidentEntrySchema).max(10, "Maximum 10 accident entries allowed"),
  trafficConvictions: z.array(trafficConvictionEntrySchema).max(10, "Maximum 10 traffic conviction entries allowed"),
  education: educationSchema,
  canadianHoursOfService: canadianHoursOfServiceSchema,
});

export type ApplicationFormPage3Schema = z.infer<
  typeof applicationFormPage3Schema
>;
export type AccidentEntrySchema = z.infer<typeof accidentEntrySchema>;
export type TrafficConvictionEntrySchema = z.infer<
  typeof trafficConvictionEntrySchema
>;
export type EducationSchema = z.infer<typeof educationSchema>;
export type CanadianDailyHoursSchema = z.infer<typeof canadianDailyHoursSchema>;
export type CanadianHoursOfServiceSchema = z.infer<
  typeof canadianHoursOfServiceSchema
>;
