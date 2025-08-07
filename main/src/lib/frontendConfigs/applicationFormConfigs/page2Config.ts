// page2Config.ts

import { FormPageConfig } from "../formPageConfig.types";
import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";
import { IOnboardingTracker } from "@/types/onboardingTracker.type";

// 🔐 Custom config contract for Page 2 (no prequal/companyId required)
type Page2FormPageConfig = Omit<
  FormPageConfig<ApplicationFormPage2Schema>,
  "buildPayload"
> & {
  buildPayload: (
    values: ApplicationFormPage2Schema,
    tracker?: IOnboardingTracker
  ) => Record<string, unknown>;
};

export const page2Config: Page2FormPageConfig = {
  validationFields: (values) => {
    const fields: string[] = [];

    values.employments.forEach((employment, i) => {
      const isRendered = document.querySelector(
        `[data-field="employments.${i}.employerName"]`
      );

      if (!isRendered) return;

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

      if (employment.gapExplanationBefore !== undefined) {
        fields.push(`employments.${i}.gapExplanationBefore`);
      }
    });

    return fields;
  },

  buildPayload: (values) => {
    return {
      page2: values,
    };
  },

  nextRoute: "/onboarding/[id]/application-form/page-3",
  submitSegment: "page-2",
};
