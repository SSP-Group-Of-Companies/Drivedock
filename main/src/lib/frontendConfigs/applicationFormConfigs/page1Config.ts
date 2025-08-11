/**
 * ===============================================================
 * page1Config.ts — Application Form Page 1 (POST/PATCH payload builder)
 * ---------------------------------------------------------------
 * Powers <ContinueButton /> for Page 1.
 *
 * Responsibilities:
 * - Provide RHF field paths for scroll-to-first-error UX
 * - Build JSON payload for both POST (create) and PATCH (update)
 * - Include `applicationType` when company is SSP-Canada (from store)
 *
 * Notes:
 * - Files are uploaded to S3 before submit; we only send { s3Key, url }
 * - Zod handles all validation (including stricter address rules)
 *
 * Owner: SSP Tech Team – Faruq Adebayo Atanda
 * ===============================================================
 */

/**
 * page1Config.ts — Application Form Page 1 (POST/PATCH payload builder)
 */
"use client";

import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { FormPageConfig } from "@/lib/frontendConfigs/formPageConfig.types";
import { ECompanyId } from "@/constants/companies";

export const page1Config: FormPageConfig<ApplicationFormPage1Schema> = {
  validationFields: (values) => {
    const fields: string[] = [
      "firstName",
      "lastName",
      "sin",
      "sinPhoto",
      "dob",
      "phoneCell",
      "canProvideProofOfAge",
      "email",
      "emergencyContactName",
      "emergencyContactPhone",
      "birthCity",
      "birthCountry",
      "birthStateOrProvince",
      "licenses",
      "addresses",
    ];

    values.licenses?.forEach((_, index) => {
      fields.push(`licenses.${index}.licenseNumber`);
      fields.push(`licenses.${index}.licenseStateOrProvince`);
      fields.push(`licenses.${index}.licenseExpiry`);
      fields.push(`licenses.${index}.licenseType`);
      if (index === 0) {
        fields.push(`licenses.${index}.licenseFrontPhoto`);
        fields.push(`licenses.${index}.licenseBackPhoto`);
      }
    });

    values.addresses?.forEach((_, index) => {
      fields.push(`addresses.${index}.address`);
      fields.push(`addresses.${index}.city`);
      fields.push(`addresses.${index}.stateOrProvince`);
      fields.push(`addresses.${index}.postalCode`);
      fields.push(`addresses.${index}.from`);
      fields.push(`addresses.${index}.to`);
    });

    return fields;
  },

  validateBusinessRules: () => null,

  buildPayload: (values, ctx) => {
    const cleanedSin = values.sin?.replace(/\D/g, "") || "";

    const cleaned = {
      ...values,
      sin: cleanedSin,
    };

    // Decide shape by route—not store
    if (ctx.isPatch) {
      return { page1: cleaned };
    }

    return {
      applicationFormPage1: cleaned,
      prequalifications: ctx.prequalifications,
      companyId: ctx.companyId,
      ...(ctx.companyId === ECompanyId.SSP_CA && ctx.applicationType
        ? { applicationType: ctx.applicationType }
        : {}),
    };
  },

  nextRoute: "/onboarding/[id]/application-form/page-2",
  submitSegment: "page-1",
};
