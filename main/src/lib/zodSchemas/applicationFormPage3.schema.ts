import { z } from "zod";

/**
 * Ensure input type is NUMBER (not union). We still coerce NaN -> 0 on parse.
 * Use in combination with RHF `setValueAs` so inputs always pass numbers.
 */
const zeroOnEmpty = (min = 0, max?: number) => {
  const numeric =
    max != null ? z.number().min(min).max(max) : z.number().min(min);
  // If NaN sneaks in, normalize it to 0
  return numeric.transform((v) => (Number.isNaN(v) ? 0 : v));
};

// Accident Entry Schema - Allow empty entries; numbers default to 0 if present
export const accidentEntrySchema = z.object({
  date: z.string().optional(),
  natureOfAccident: z.string().optional(),
  // Treat as user-entered; do not default to 0 implicitly
  fatalities: z.number().min(0).optional(),
  injuries: z.number().min(0).optional(),
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

// Canadian Daily Hours Schema (hours is required; NaN -> 0; <=24)
export const canadianDailyHoursSchema = z.object({
  day: z
    .number()
    .min(1, "Day number must be between 1 and 14")
    .max(14, "Day number must be between 1 and 14"),
  hours: zeroOnEmpty(0, 24),
});

// Canadian Hours of Service Schema
export const canadianHoursOfServiceSchema = z.object({
  dayOneDate: z.string().trim().min(1, "Date is required"),
  dailyHours: z
    .array(canadianDailyHoursSchema)
    .length(14, "Must have exactly 14 days"),
  totalHours: z.number().optional(),
});

// Page 3 Schema - All-or-nothing validation for accident and traffic conviction entries
export const applicationFormPage3Schema = z
  .object({
    // Allow undefined so we can show a friendly root error instead of Zod's type error
    hasAccidentHistory: z.boolean().optional(),
    hasTrafficConvictions: z.boolean().optional(),
    accidentHistory: z
      .array(accidentEntrySchema)
      .max(10, "Maximum 10 accident entries allowed"),
    trafficConvictions: z
      .array(trafficConvictionEntrySchema)
      .max(10, "Maximum 10 traffic conviction entries allowed"),
    education: educationSchema,
    canadianHoursOfService: canadianHoursOfServiceSchema,
  })
  .superRefine((data, ctx) => {
    // ---------- Accident History Root + Row Validation ----------
    const hasAccidents = data.hasAccidentHistory === true;

    if (data.hasAccidentHistory !== true && data.hasAccidentHistory !== false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hasAccidentHistory"],
        message: "Please answer if you have ever been involved in an accident",
      });
    }

    if (hasAccidents) {
      // Require at least one fully completed row when user declares YES
      const isRowComplete = (a?: (typeof data.accidentHistory)[number]) =>
        !!a?.date?.trim() &&
        !!a?.natureOfAccident?.trim() &&
        typeof a?.fatalities === "number" &&
        a.fatalities >= 0 &&
        typeof a?.injuries === "number" &&
        a.injuries >= 0;

      const anyComplete =
        Array.isArray(data.accidentHistory) &&
        data.accidentHistory.some(isRowComplete);
      if (!anyComplete) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["accidentHistory"],
          message:
            "At least one report is needed when declared to have been involved in an accident",
        });

        // Also surface field-level errors for the first row to trigger borders and scroll
        const firstIndex = 0;
        const first = Array.isArray(data.accidentHistory)
          ? data.accidentHistory[firstIndex]
          : undefined;
        if (first) {
          if (!first.date?.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accidentHistory", firstIndex, "date"], message: "required" });
          }
          if (!first.natureOfAccident?.trim()) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accidentHistory", firstIndex, "natureOfAccident"], message: "required" });
          }
          if (first.fatalities == null || first.fatalities < 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accidentHistory", firstIndex, "fatalities"], message: "required" });
          }
          if (first.injuries == null || first.injuries < 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accidentHistory", firstIndex, "injuries"], message: "required" });
          }
        }
      }

      // All-or-nothing per row: if any field present, require the rest
      data.accidentHistory?.forEach((accident, index) => {
        const hasAnyData =
          !!accident?.date?.trim() ||
          !!accident?.natureOfAccident?.trim() ||
          (typeof accident?.fatalities === "number" &&
            accident.fatalities >= 0) ||
          (typeof accident?.injuries === "number" && accident.injuries >= 0);

        if (hasAnyData) {
          if (!accident?.date?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["accidentHistory", index, "date"],
              message: "Date is required",
            });
          }
          if (!accident?.natureOfAccident?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["accidentHistory", index, "natureOfAccident"],
              message: "Nature of accident is required",
            });
          }
          if (accident?.fatalities == null || accident.fatalities < 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["accidentHistory", index, "fatalities"],
              message: "required",
            });
          }
          if (accident?.injuries == null || accident.injuries < 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["accidentHistory", index, "injuries"],
              message: "required",
            });
          }
        }
      });
    }

    // Validate traffic conviction entries - all-or-nothing per row
    const hasConvictions = data.hasTrafficConvictions === true;

    if (data.hasTrafficConvictions !== true && data.hasTrafficConvictions !== false) {
      // Only surface this requirement if the section is visible/used; if both flags undefined, let flow continue
      // We'll still add a gentle prompt so the user answers explicitly when they reach this section
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hasTrafficConvictions"],
        message: "Please answer if you have ever been convicted of a traffic offense",
      });
    }

    if (hasConvictions) {
      const isRowComplete = (c?: (typeof data.trafficConvictions)[number]) =>
        !!c?.date?.trim() && !!c?.location?.trim() && !!c?.charge?.trim() && !!c?.penalty?.trim();

      const anyComplete = Array.isArray(data.trafficConvictions) && data.trafficConvictions.some(isRowComplete);
      if (!anyComplete) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["trafficConvictions"],
          message: "At least one conviction is needed when declared to have traffic convictions",
        });

        // Also add field-level errors for first row to trigger borders/scroll
        const firstIndex = 0;
        const first = Array.isArray(data.trafficConvictions) ? data.trafficConvictions[firstIndex] : undefined;
        if (first) {
          if (!first.date?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trafficConvictions", firstIndex, "date"], message: "required" });
          if (!first.location?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trafficConvictions", firstIndex, "location"], message: "required" });
          if (!first.charge?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trafficConvictions", firstIndex, "charge"], message: "required" });
          if (!first.penalty?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["trafficConvictions", firstIndex, "penalty"], message: "required" });
        }
      }
    }

    data.trafficConvictions?.forEach((conviction, index) => {
      const hasAnyData =
        !!conviction.date?.trim() ||
        !!conviction.location?.trim() ||
        !!conviction.charge?.trim() ||
        !!conviction.penalty?.trim();

      if (hasAnyData) {
        if (!conviction.date?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["trafficConvictions", index, "date"],
            message: "Date is required",
          });
        }
        if (!conviction.location?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["trafficConvictions", index, "location"],
            message: "Location is required",
          });
        }
        if (!conviction.charge?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["trafficConvictions", index, "charge"],
            message: "Charge is required",
          });
        }
        if (!conviction.penalty?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["trafficConvictions", index, "penalty"],
            message: "Penalty is required",
          });
        }
      }
    });
  });

// Use the parsed/output type for RHF generics
export type ApplicationFormPage3Schema = z.output<
  typeof applicationFormPage3Schema
>;
export type AccidentEntrySchema = z.output<typeof accidentEntrySchema>;
export type TrafficConvictionEntrySchema = z.output<
  typeof trafficConvictionEntrySchema
>;
export type EducationSchema = z.output<typeof educationSchema>;
export type CanadianDailyHoursSchema = z.output<
  typeof canadianDailyHoursSchema
>;
export type CanadianHoursOfServiceSchema = z.output<
  typeof canadianHoursOfServiceSchema
>;
