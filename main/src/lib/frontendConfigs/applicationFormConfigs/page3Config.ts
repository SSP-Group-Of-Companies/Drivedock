import { FormPageConfig, FormPageConfigFactory } from "../formPageConfig.types";
import { ApplicationFormPage3Schema } from "@/lib/zodSchemas/applicationFormPage3.schema";

function isBlank(str?: string) {
  return !str || str.trim() === "";
}

function pruneAccidentRows(rows: ApplicationFormPage3Schema["accidentHistory"] | undefined) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => {
      const dateEmpty = isBlank(r?.date);
      const natureEmpty = isBlank(r?.natureOfAccident);
      const fatalitiesZero = !r?.fatalities || r.fatalities === 0;
      const injuriesZero = !r?.injuries || r.injuries === 0;
      // keep if NOT an empty placeholder row
      return !(dateEmpty && natureEmpty && fatalitiesZero && injuriesZero);
    })
    .map((obj) => {
      return {
        ...obj,
        date: isBlank(obj.date) ? undefined : obj.date!.trim(),
        natureOfAccident: isBlank(obj.natureOfAccident) ? undefined : obj.natureOfAccident!.trim(),
      };
    });
}

function pruneConvictionRows(rows: ApplicationFormPage3Schema["trafficConvictions"] | undefined) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => {
      const dateEmpty = isBlank(r?.date);
      const locEmpty = isBlank(r?.location);
      const chargeEmpty = isBlank(r?.charge);
      const penaltyEmpty = isBlank(r?.penalty);
      // keep if NOT an empty placeholder row
      return !(dateEmpty && locEmpty && chargeEmpty && penaltyEmpty);
    })
    .map((obj) => {
      return {
        ...obj,
        date: isBlank(obj.date) ? undefined : obj.date!.trim(),
        location: isBlank(obj.location) ? undefined : obj.location!.trim(),
        charge: isBlank(obj.charge) ? undefined : obj.charge!.trim(),
        penalty: isBlank(obj.penalty) ? undefined : obj.penalty!.trim(),
      };
    });
}

function pruneDailyHours(rows: ApplicationFormPage3Schema["canadianHoursOfService"]["dailyHours"]) {
  // API expects exactly 14; we keep them all, just drop ids
  return rows.map((obj) => {
    return { day: obj.day, hours: obj.hours ?? 0 };
  });
}

export const page3ConfigFactory: FormPageConfigFactory<ApplicationFormPage3Schema> = (ctx): FormPageConfig<ApplicationFormPage3Schema> => {
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
      values.accidentHistory?.forEach((_, index) => {
        fields.push(`accidentHistory.${index}.date`, `accidentHistory.${index}.natureOfAccident`, `accidentHistory.${index}.fatalities`, `accidentHistory.${index}.injuries`);
      });

      values.trafficConvictions?.forEach((_, index) => {
        fields.push(`trafficConvictions.${index}.date`, `trafficConvictions.${index}.location`, `trafficConvictions.${index}.charge`, `trafficConvictions.${index}.penalty`);
      });

      values.canadianHoursOfService?.dailyHours?.forEach((_day, index) => {
        fields.push(`canadianHoursOfService.dailyHours.${index}.hours`);
      });

      return fields;
    },

    validateBusinessRules: () => null,

    buildPayload: (values) => {
      const page3 = {
        // Accidents: remove empty placeholders + strip ids + trim
        accidentHistory: pruneAccidentRows(values.accidentHistory),

        // Traffic convictions: remove empty placeholders + strip ids + trim
        trafficConvictions: pruneConvictionRows(values.trafficConvictions),

        // Education: pass-through
        education: {
          gradeSchool: values.education.gradeSchool,
          college: values.education.college,
          postGraduate: values.education.postGraduate,
        },

        // Canadian hours: keep 14 rows but strip ids
        canadianHoursOfService: {
          dayOneDate: values.canadianHoursOfService.dayOneDate?.trim(),
          dailyHours: pruneDailyHours(values.canadianHoursOfService.dailyHours),
          // Let backend recompute; if you want to send it still, keep the line below:
          totalHours: values.canadianHoursOfService.totalHours,
        },
      };

      return { page3 };
    },

    nextRoute: `/onboarding/${id}/application-form/page-4`,
    submitSegment: "page-3",
  };
};
