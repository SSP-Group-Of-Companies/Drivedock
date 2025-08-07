// src/lib/frontendConfigs/applicationFormConfigs/page3Config.ts

"use client";

/**
 * page3Config.ts
 *
 * Placeholder config for Application Form Page 3 in DriveDock.
 * Should be replaced with real fields when the page is implemented.
 *
 * Required by the <ContinueButton /> component to support config-driven submission.
 */

import { ApplicationFormPage3Schema } from "@/lib/zodSchemas/applicationFormPage3.schema";
import { FormPageConfig } from "../formPageConfig.types";

export const page3Config: FormPageConfig<ApplicationFormPage3Schema> = {
  validationFields: (_values) => {
    const fields: string[] = [
      "emergencyContactName",
      "emergencyContactPhone",
      "birthPlace",
      "citizenshipStatus",
    ];
    return fields;
  },

  buildPayload: (values) => {
    return {
      page3: values,
    };
  },

  nextRoute: "/onboarding/[id]/application-form/page-4",
  submitSegment: "page-3",
};
