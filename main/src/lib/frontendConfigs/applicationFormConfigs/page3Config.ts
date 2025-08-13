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

      // Validate accident entries - if any field has data, all fields become required
      values.accidentHistory?.forEach((accident, index) => {
        const hasAnyData =
          accident.date ||
          accident.natureOfAccident ||
          accident.fatalities > 0 ||
          accident.injuries > 0;

        if (hasAnyData) {
          // If any field has data, all fields in this row must be completed
          fields.push(
            `accidentHistory.${index}.date`,
            `accidentHistory.${index}.natureOfAccident`,
            `accidentHistory.${index}.fatalities`,
            `accidentHistory.${index}.injuries`
          );
        }
      });

      // Validate traffic conviction entries - if any field has data, all fields become required
      values.trafficConvictions?.forEach((conviction, index) => {
        const hasAnyData =
          conviction.date ||
          conviction.location ||
          conviction.charge ||
          conviction.penalty;

        if (hasAnyData) {
          // If any field has data, all fields in this row must be completed
          fields.push(
            `trafficConvictions.${index}.date`,
            `trafficConvictions.${index}.location`,
            `trafficConvictions.${index}.charge`,
            `trafficConvictions.${index}.penalty`
          );
        }
      });

      // Validate each daily hours entry (14 days as per backend schema)
      values.canadianHoursOfService?.dailyHours?.forEach((_day, index) => {
        fields.push(`canadianHoursOfService.dailyHours.${index}.hours`);
      });

      return fields;
    },

    validateBusinessRules: () => null,

    buildPayload: (values) => {
      // Filter out empty accident entries - only send entries with actual data
      const filteredAccidentHistory =
        values.accidentHistory?.filter((accident) => {
          return (
            accident.date ||
            accident.natureOfAccident ||
            accident.fatalities > 0 ||
            accident.injuries > 0
          );
        }) || [];

      // Filter out empty traffic conviction entries - only send entries with actual data
      const filteredTrafficConvictions =
        values.trafficConvictions?.filter((conviction) => {
          return (
            conviction.date ||
            conviction.location ||
            conviction.charge ||
            conviction.penalty
          );
        }) || [];

      // Build the payload with filtered arrays
      const payload = {
        page3: {
          ...values,
          accidentHistory: filteredAccidentHistory,
          trafficConvictions: filteredTrafficConvictions,
        },
      };

      return payload;
    },

    // Fully resolved fallback (no [id] token)
    nextRoute: `/onboarding/${id}/application-form/page-4`,
    submitSegment: "page-3",
  };
};
