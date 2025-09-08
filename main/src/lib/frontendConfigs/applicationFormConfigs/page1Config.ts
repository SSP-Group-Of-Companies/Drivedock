// main/src/lib/frontendConfigs/applicationFormConfigs/page1Config.ts

/**
 * page1ConfigFactory — Application Form Page 1 (POST/PATCH payload builder)
 * - Factory receives runtime ctx (trackerId, company, prequal, etc.)
 * - Returns a fully-resolved config (no [id] tokens)
 */

import {
  BuildPayloadCtx,
  FormPageConfig,
  FormPageConfigFactory,
} from "@/lib/frontendConfigs/formPageConfig.types";
import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { ECompanyId } from "@/constants/companies";

export const page1ConfigFactory: FormPageConfigFactory<
  ApplicationFormPage1Schema
> = (ctx: BuildPayloadCtx): FormPageConfig<ApplicationFormPage1Schema> => {
  const id = ctx.effectiveTrackerId; // undefined on true fresh POST (first submit)

  return {
    validationFields: (values) => {
      const fields: string[] = [
        // Personal
        "firstName",
        "lastName",
        "sin",
        "sinIssueDate",
        "gender",
        // include nested photo keys so RHF can surface specific errors
        "sinPhoto.s3Key",
        "sinPhoto.url",
        "dob",
        "phoneCell",
        "canProvideProofOfAge",
        "email",
        "emergencyContactName",
        "emergencyContactPhone",

        // Birth
        "birthCity",
        "birthCountry",
        "birthStateOrProvince",

        // Root collections for any superRefine banner placement
        "licenses",
        "addresses",
      ];

      // Validate each visible license row (ensure first has photos)
      values.licenses?.forEach((_lic, index) => {
        fields.push(
          `licenses.${index}.licenseNumber`,
          `licenses.${index}.licenseStateOrProvince`,
          `licenses.${index}.licenseExpiry`,
          `licenses.${index}.licenseType`
        );
        if (index === 0) {
          fields.push(
            `licenses.0.licenseFrontPhoto.s3Key`,
            `licenses.0.licenseFrontPhoto.url`,
            `licenses.0.licenseBackPhoto.s3Key`,
            `licenses.0.licenseBackPhoto.url`
          );
        }
      });

      // Validate each visible address row
      values.addresses?.forEach((_addr, index) => {
        fields.push(
          `addresses.${index}.address`,
          `addresses.${index}.city`,
          `addresses.${index}.stateOrProvince`,
          `addresses.${index}.postalCode`,
          `addresses.${index}.from`,
          `addresses.${index}.to`
        );
      });

      return fields;
    },

    validateBusinessRules: () => null,

    buildPayload: (values, ctx2) => {
      // Normalize SIN to digits only
      const cleanedSin = values.sin?.replace(/\D/g, "") || "";
      const cleaned = { ...values, sin: cleanedSin };

      // POST (new): include prequalifications + company/appType + page1 slice
      if (!ctx2.isPatch) {
        return {
          applicationFormPage1: cleaned,
          prequalifications: ctx2.prequalifications,
          companyId: ctx2.companyId,
          ...(ctx2.companyId === ECompanyId.SSP_CA && ctx2.applicationType
            ? { applicationType: ctx2.applicationType }
            : {}),
        };
      }

      // PATCH (resume)
      return { page1: cleaned };
    },

    // Fully resolved fallback; on POST we still prefer server nextUrl
    nextRoute: id ? `/onboarding/${id}/application-form/page-2` : "/onboarding", // harmless fallback for first-time POST (no id yet)

    submitSegment: "page-1",
  };
};
