import { z } from "zod";

/**
 * Ensure input type is NUMBER (not union). We still coerce NaN -> 0 on parse.
 * Use in combination with RHF `setValueAs` so inputs always pass numbers.
 */
const zeroOnEmpty = (min = 0, max?: number) => {
  const numeric = max != null ? z.number().min(min).max(max) : z.number().min(min);
  // If NaN sneaks in, normalize it to 0
  return numeric.transform((v) => (Number.isNaN(v) ? 0 : v));
};

// Accident Entry Schema - Allow empty entries; numbers default to 0 if present
export const accidentEntrySchema = z.object({
  date: z.string().optional(),
  natureOfAccident: z.string().optional(),
  // Optional means the whole field can be undefined; if present, it's a number (NaN -> 0)
  fatalities: zeroOnEmpty(0).optional(),
  injuries: zeroOnEmpty(0).optional(),
});

// Traffic Conviction Entry Schema - Allow empty entries
export const trafficConvictionEntrySchema = z.object({
  date: z.string().optional(),
  location: z.string().optional(),
  charge: z.string().optional(),
  penalty: z.string().optional(),
});

// Education Schema
export const educationSchema = z.object({
  gradeSchool: z.number().min(0, "Grade school years must be 0 or greater").max(12, "Grade school years cannot exceed 12"),
  college: z.number().min(0, "College years must be 0 or greater").max(4, "College years cannot exceed 4"),
  postGraduate: z.number().min(0, "Post graduate years must be 0 or greater").max(4, "Post graduate years cannot exceed 4"),
});

// Canadian Daily Hours Schema (hours is required; NaN -> 0; <=24)
export const canadianDailyHoursSchema = z.object({
  day: z.number().min(1, "Day number must be between 1 and 14").max(14, "Day number must be between 1 and 14"),
  hours: zeroOnEmpty(0, 24),
});

// Canadian Hours of Service Schema
export const canadianHoursOfServiceSchema = z.object({
  dayOneDate: z.string().min(1, "Date is required"),
  dailyHours: z.array(canadianDailyHoursSchema).length(14, "Must have exactly 14 days"),
  totalHours: z.number().optional(),
});

// Page 3 Schema - All-or-nothing validation for accident and traffic conviction entries
export const applicationFormPage3Schema = z
  .object({
    accidentHistory: z.array(accidentEntrySchema).max(10, "Maximum 10 accident entries allowed"),
    trafficConvictions: z.array(trafficConvictionEntrySchema).max(10, "Maximum 10 traffic conviction entries allowed"),
    education: educationSchema,
    canadianHoursOfService: canadianHoursOfServiceSchema,
  })
  .superRefine((data, ctx) => {
    // Validate accident history entries - all-or-nothing per row
    data.accidentHistory?.forEach((accident, index) => {
      const hasAnyData =
        !!accident.date?.trim() ||
        !!accident.natureOfAccident?.trim() ||
        (typeof accident.fatalities === "number" && accident.fatalities > 0) ||
        (typeof accident.injuries === "number" && accident.injuries > 0);

      if (hasAnyData) {
        if (!accident.date?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accidentHistory", index, "date"], message: "Date is required" });
        }
        if (!accident.natureOfAccident?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accidentHistory", index, "natureOfAccident"], message: "Nature of accident is required" });
        }
        if (accident.fatalities == null || accident.fatalities < 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accidentHistory", index, "fatalities"], message: "required" });
        }
        if (accident.injuries == null || accident.injuries < 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accidentHistory", index, "injuries"], message: "required" });
        }
      }
    });

    // Validate traffic conviction entries - all-or-nothing per row
    data.trafficConvictions?.forEach((conviction, index) => {
      const hasAnyData = !!conviction.date?.trim() || !!conviction.location?.trim() || !!conviction.charge?.trim() || !!conviction.penalty?.trim();

      if (hasAnyData) {
        if (!conviction.date?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trafficConvictions", index, "date"], message: "Date is required" });
        }
        if (!conviction.location?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trafficConvictions", index, "location"], message: "Location is required" });
        }
        if (!conviction.charge?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trafficConvictions", index, "charge"], message: "Charge is required" });
        }
        if (!conviction.penalty?.trim()) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trafficConvictions", index, "penalty"], message: "Penalty is required" });
        }
      }
    });
  });

// Use the parsed/output type for RHF generics
export type ApplicationFormPage3Schema = z.output<typeof applicationFormPage3Schema>;
export type AccidentEntrySchema = z.output<typeof accidentEntrySchema>;
export type TrafficConvictionEntrySchema = z.output<typeof trafficConvictionEntrySchema>;
export type EducationSchema = z.output<typeof educationSchema>;
export type CanadianDailyHoursSchema = z.output<typeof canadianDailyHoursSchema>;
export type CanadianHoursOfServiceSchema = z.output<typeof canadianHoursOfServiceSchema>;
