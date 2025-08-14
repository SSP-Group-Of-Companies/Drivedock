// main/src/lib/frontendConfigs/applicationFormConfigs/page3Config.ts

import { FormPageConfig, FormPageConfigFactory } from "../formPageConfig.types";
import { ApplicationFormPage3Schema } from "@/lib/zodSchemas/applicationFormPage3.schema";

export const page3ConfigFactory: FormPageConfigFactory<
  ApplicationFormPage3Schema
> = (ctx): FormPageConfig<ApplicationFormPage3Schema> => {
  const id = ctx.effectiveTrackerId!; // Page 3 should always have an ID

  return {
    validationFields: (values) => {
      const fields: string[] = [
        // Education
        "education.gradeSchool",
        "education.college",
        "education.postGraduate",

        // Canadian Hours of Service
        "canadianHoursOfService.dayOneDate",
        "canadianHoursOfService.dailyHours",
      ];

      // Include all accident and traffic conviction fields for validation
      // The Zod schema will handle the all-or-nothing logic
      values.accidentHistory?.forEach((_, index) => {
        fields.push(
          `accidentHistory.${index}.date`,
          `accidentHistory.${index}.natureOfAccident`,
          `accidentHistory.${index}.fatalities`,
          `accidentHistory.${index}.injuries`
        );
      });

      values.trafficConvictions?.forEach((_, index) => {
        fields.push(
          `trafficConvictions.${index}.date`,
          `trafficConvictions.${index}.location`,
          `trafficConvictions.${index}.charge`,
          `trafficConvictions.${index}.penalty`
        );
      });

      // Validate each daily hours entry (14 days as per backend schema)
      values.canadianHoursOfService?.dailyHours?.forEach((_day, index) => {
        fields.push(`canadianHoursOfService.dailyHours.${index}.hours`);
      });

      return fields;
    },

    validateBusinessRules: () => null,

    buildPayload: (values) => {
      // Send all data as-is, let the backend handle validation
      // This matches the FastCard approach - don't filter on the frontend
      const payload = {
        page3: values,
      };

      return payload;
    },

    // Fully resolved fallback (no [id] token)
    nextRoute: `/onboarding/${id}/application-form/page-4`,
    submitSegment: "page-3",
  };
};
