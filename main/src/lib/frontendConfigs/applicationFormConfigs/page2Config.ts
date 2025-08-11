// page2Config.ts
import { FormPageConfig } from "../formPageConfig.types";
import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";
import { IOnboardingTracker } from "@/types/onboardingTracker.type";

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
    // Include the array root so Zod superRefine runs and can emit the top summary error.
    const fields: string[] = ["employments"];

    values.employments.forEach((e, i) => {
      // Validate only rendered rows (optional optimization if you hide rows)
      const rendered = document.querySelector(
        `[data-field="employments.${i}.employerName"]`
      );
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

  // Backend expects { employments: [...] } for PATCH page-2
  buildPayload: (values) => {
    return { employments: values.employments };
  },

  nextRoute: "/onboarding/[id]/application-form/page-3",
  submitSegment: "page-2",
};
