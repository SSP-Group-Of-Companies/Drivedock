// src/lib/frontendConfigs/applicationFormConfigs/page2Config.ts
"use client";

import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";
import { FormPageConfig } from "../formPageConfig.types";

// ✅ Type-safe validator that only checks rendered fields
function validationFields(values: ApplicationFormPage2Schema): string[] {
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
}

// ✅ Clean JSON builder for PATCH
function buildFormData(values: ApplicationFormPage2Schema): FormData {
  const formData = new FormData();
  formData.append("page2", JSON.stringify(values));
  return formData;
}

// ✅ Final export
export const page2Config: FormPageConfig<ApplicationFormPage2Schema> = {
  validationFields,
  buildFormData,
  nextRoute: "/form/application-form/page-3",
};
