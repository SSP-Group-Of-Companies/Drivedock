// main/src/lib/frontendConfigs/applicationFormConfigs/page5Config.ts

import { FormPageConfig, FormPageConfigFactory } from "../formPageConfig.types";

export const page5ConfigFactory: FormPageConfigFactory<any> = (ctx): FormPageConfig<any> => {
  const id = ctx.effectiveTrackerId!; // Page 5 should always have an ID

  return {
    validationFields: () => {
      // No validation for placeholder page
      return [];
    },

    validateBusinessRules: () => null,

    buildPayload: (values) => {
      // Simple payload for placeholder page
      return { page5: values };
    },

    // Route to policies-consents (final step of application form)
    nextRoute: `/onboarding/${id}/policies-consents`,
    submitSegment: "page-5",
  };
};
