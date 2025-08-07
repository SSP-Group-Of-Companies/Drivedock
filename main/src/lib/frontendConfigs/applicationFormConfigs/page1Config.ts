/**
 * page1Config.ts
 *
 * Configuration for Application Form Page 1 in the DriveDock Onboarding Flow.
 *
 * This config powers the ContinueButton with:
 * - Zod validation field paths for RHF scroll-to-error
 * - Clean JSON payload builder for both POST and PATCH
 * - Dynamic route to the next onboarding step
 *
 *  S3 Upload Flow:
 * - All files (sinPhoto, licenseFrontPhoto, licenseBackPhoto) are uploaded to S3 before submit
 * - The form only sends JSON containing s3Key + url per photo field
 *
 *  POST: /api/v1/onboarding/application-form
 * {
 *   applicationFormPage1: { ... },
 *   prequalifications: { ... },
 *   companyId: "..."
 * }
 *
 *  PATCH: /api/v1/onboarding/:trackerId/application-form/page-1
 * {
 *   page1: { ... }
 * }
 */

"use client";

import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { FormPageConfig } from "@/lib/frontendConfigs/formPageConfig.types";
import { IPreQualifications } from "@/types/preQualifications.types";
import { IOnboardingTracker } from "@/types/onboardingTracker.type";

type Page1FormPageConfig = FormPageConfig<ApplicationFormPage1Schema> & {
  buildPayload: (
    values: ApplicationFormPage1Schema,
    prequalifications: IPreQualifications,
    companyId: string,
    tracker?: IOnboardingTracker
  ) => Record<string, unknown>;
};

export const page1Config: Page1FormPageConfig = {
  validationFields: (values) => {
    const fields: string[] = [
      "firstName",
      "lastName",
      "sin",
      "sinPhoto",
      "dob",
      "phoneHome",
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

  buildPayload: (
    values,
    prequalifications,
    companyId,
    tracker
  ): Record<string, unknown> => {
    const cleaned = {
      ...values,
      sin: values.sin?.replace(/\D/g, "") || "",
    };

    if (!tracker) {
      // First-time POST
      return {
        applicationFormPage1: cleaned,
        prequalifications,
        companyId,
      };
    } else {
      // PATCH update
      return {
        page1: cleaned,
      };
    }
  },

  nextRoute: "/onboarding/[id]/application-form/page-2",
  submitSegment: "page-1",
};
