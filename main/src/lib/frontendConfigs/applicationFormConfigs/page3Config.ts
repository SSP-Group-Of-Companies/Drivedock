// src/lib/frontendConfigs/applicationFormConfigs/page3Config.ts

"use client";

import { ApplicationFormPage3Schema } from "@/lib/zodSchemas/applicationFormPage3.schema";
import { FormPageConfig } from "../formPageConfig.types";

export const page3Config: FormPageConfig<ApplicationFormPage3Schema> = {
  validationFields: (values) => {
    const fields: string[] = [
      "emergencyContactName",
      "emergencyContactPhone",
      "birthPlace",
      "citizenshipStatus",
      // ...etc.
    ];
    return fields;
  },

  buildFormData: (values) => {
    const formData = new FormData();
    formData.append("page3", JSON.stringify(values)); // ✅ This key must match what submitFormStep expects
    return formData;
  },

  nextRoute: "/onboarding/[id]/application-form/page-4",
};
