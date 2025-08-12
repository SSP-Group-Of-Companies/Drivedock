// main/src/lib/frontendConfigs/applicationFormConfigs/page2Config.ts

import { FormPageConfig, FormPageConfigFactory } from "../formPageConfig.types";
import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";

export const page2ConfigFactory: FormPageConfigFactory<ApplicationFormPage2Schema> = (ctx): FormPageConfig<ApplicationFormPage2Schema> => {
  const id = ctx.effectiveTrackerId!; // Page 2+ should always have an ID

  return {
    validationFields: (values) => {
      // Include array root so Zod superRefine can attach a top-level error.
      const fields: string[] = ["employments"];

      values.employments.forEach((e, i) => {
        // (Optional) only validate rows currently rendered
        const rendered = typeof document !== "undefined" ? document.querySelector(`[data-field="employments.${i}.employerName"]`) : null;
        if (!rendered) return;

        fields.push(
          `employments.${i}.employerName`,
          `employments.${i}.supervisorName`,
          `employments.${i}.address`,
          `employments.${i}.postalCode`,
          `employments.${i}.city`,
          `employments.${i}.stateOrProvince`,
          `employments.${i}.phone1`,
          `employments.${i}.email`,
          `employments.${i}.positionHeld`,
          `employments.${i}.from`,
          `employments.${i}.to`,
          `employments.${i}.salary`,
          `employments.${i}.reasonForLeaving`,
          `employments.${i}.subjectToFMCSR`,
          `employments.${i}.safetySensitiveFunction`
        );

        if (typeof e.gapExplanationBefore !== "undefined") {
          fields.push(`employments.${i}.gapExplanationBefore`);
        }
      });

      return fields;
    },

    // Backend expects { employments: [...] } for PATCH /page-2
    buildPayload: (values) => ({ employments: values.employments }),

    // Fully resolved fallback (no [id] token)
    nextRoute: `/onboarding/${id}/application-form/page-3`,
    submitSegment: "page-2",
  };
};
