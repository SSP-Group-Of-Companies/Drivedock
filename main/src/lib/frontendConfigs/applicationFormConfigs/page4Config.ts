// main/src/lib/frontendConfigs/applicationFormConfigs/page4Config.ts

import { FormPageConfig, FormPageConfigFactory } from "../formPageConfig.types";

export const page4ConfigFactory: FormPageConfigFactory<any> = (ctx): FormPageConfig<any> => {
  const id = ctx.effectiveTrackerId!; // Page 4 should always have an ID

  return {
    validationFields: () => {
      // No validation for placeholder page
      return [];
    },

    validateBusinessRules: () => null,

    buildPayload: (values) => {
      // Simple payload for placeholder page
      return { page4: values };
    },

    // Route to Page 5
    nextRoute: `/onboarding/${id}/application-form/page-5`,
    submitSegment: "page-4",
  };
};
