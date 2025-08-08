// main/src/lib/frontendConfigs/applicationFormConfigs/page2Config.ts
import { FormPageConfig } from "../formPageConfig.types";
import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";

export const page2Config: FormPageConfig<ApplicationFormPage2Schema> = {
  validationFields: (values) => {
    const fields: string[] = [];
    values.employments.forEach((emp, i) => {
      // Only validate rendered rows (optional UX optimization)
      if (
        !document?.querySelector?.(
          `[data-field="employments.${i}.employerName"]`
        )
      )
        return;

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

      if (emp.gapExplanationBefore !== undefined) {
        fields.push(`employments.${i}.gapExplanationBefore`);
      }
    });
    return fields;
  },

  //  Send the array at the root, not wrapped in { page2: ... }
  buildPayload: (values) => ({ employments: values.employments }),

  nextRoute: "/onboarding/[id]/application-form/page-3",
  submitSegment: "page-2",
};
