import { FormPageConfig } from "../formPageConfig.types";
import { ApplicationFormPage5Schema } from "@/lib/zodSchemas/applicationFormPage5.schema";

// No onboardingTracker is needed in payload
export const page5Config: FormPageConfig<ApplicationFormPage5Schema> = {
  validationFields: (values) => {
    return values.answers.map((_, i) => `answers.${i}.answerId`);
  },

  buildPayload: (values) => {
    return values;
  },

  nextRoute: "/onboarding/[id]/policies-consents",
  submitSegment: "page-5",
};
