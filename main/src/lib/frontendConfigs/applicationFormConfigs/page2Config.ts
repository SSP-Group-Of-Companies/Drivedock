// main/src/lib/frontendConfigs/applicationFormConfigs/page2Config.ts

import { FormPageConfig } from "../formPageConfig.types";
import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";

export const page2Config: FormPageConfig<ApplicationFormPage2Schema> = {
  validationFields: (values) => {
    // Include array root so Zod superRefine can attach a top-level error.
    const fields: string[] = ["employments"];

    values.employments.forEach((e, i) => {
      // (Optional) only validate rows currently rendered
      const rendered = document.querySelector(`[data-field="employments.${i}.employerName"]`);
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
  // Keep the ctx param to satisfy the shared interface (even if unused here).
  buildPayload: (values, _ctx) => {
    return { employments: values.employments };
  },

  nextRoute: "/onboarding/[id]/application-form/page-3",
  submitSegment: "page-2",
};
