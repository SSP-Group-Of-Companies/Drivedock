// main/src/lib/frontendConfigs/applicationFormConfigs/page1Config.ts

/**
 * page1ConfigFactory — Application Form Page 1 (POST/PATCH payload builder)
 * - Factory receives runtime ctx (trackerId, company, prequal, etc.)
 * - Returns a fully-resolved config (no [id] tokens)
 */

import { BuildPayloadCtx, FormPageConfig, FormPageConfigFactory } from "@/lib/frontendConfigs/formPageConfig.types";
import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { ECompanyId } from "@/constants/companies";
import { t } from "i18next";

export const page1ConfigFactory: FormPageConfigFactory<ApplicationFormPage1Schema> = (ctx: BuildPayloadCtx): FormPageConfig<ApplicationFormPage1Schema> => {
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
      ];

      // Add sinExpiryDate only for Work Permit holders
      const status = ctx.prequalifications?.statusInCanada || ctx.prequalificationStatusInCanada;
      if (status === "Work Permit") {
        fields.push("sinExpiryDate");
      }

      // include nested photo keys so RHF can surface specific errors
      fields.push(
        "sinPhoto.s3Key",
        "sinPhoto.url",
        "sinPhoto.mimeType",
        "sinPhoto.sizeBytes",
        "sinPhoto.originalName",
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
        "addresses"
      );

      // ✅ On fresh POST (no tracker id), require Turnstile token client-side too
      if (!id) {
        fields.push("turnStileVerificationToken");
      }

      // Validate each visible license row (ensure first has photos)
      values.licenses?.forEach((_lic, index) => {
        fields.push(`licenses.${index}.licenseNumber`, `licenses.${index}.licenseStateOrProvince`, `licenses.${index}.licenseExpiry`, `licenses.${index}.licenseType`);
        if (index === 0) {
          fields.push(
            `licenses.0.licenseFrontPhoto.s3Key`,
            `licenses.0.licenseFrontPhoto.url`,
            `licenses.0.licenseBackPhoto.mimeType`,
            `licenses.0.licenseFrontPhoto.sizeBytes`,
            `licenses.0.licenseFrontPhoto.originalName`,
            `licenses.0.licenseBackPhoto.s3Key`,
            `licenses.0.licenseBackPhoto.url`,
            `licenses.0.licenseBackPhoto.mimeType`,
            `licenses.0.licenseBackPhoto.sizeBytes`,
            `licenses.0.licenseBackPhoto.originalName`
          );
        }
      });

      // Validate each visible address row
      values.addresses?.forEach((_addr, index) => {
        fields.push(`addresses.${index}.address`, `addresses.${index}.city`, `addresses.${index}.stateOrProvince`, `addresses.${index}.postalCode`, `addresses.${index}.from`, `addresses.${index}.to`);
      });

      return fields;
    },

    validateBusinessRules: () => null,

    buildPayload: (values, ctx2) => {
      // Normalize SIN to digits only
      const cleanedSin = values.sin?.replace(/\D/g, "") || "";
      const cleaned = { ...values, sin: cleanedSin };

      // POST (new)
      if (!ctx2.isPatch) {
        return {
          applicationFormPage1: {
            ...cleaned,
            // include Turnstile token only for POST
            turnStileVerificationToken: values.turnStileVerificationToken || "",
          },
          prequalifications: ctx2.prequalifications,
          companyId: ctx2.companyId,
          ...(ctx2.companyId === ECompanyId.SSP_CA && ctx2.applicationType ? { applicationType: ctx2.applicationType } : {}),
        };
      }

      // PATCH (resume) — no captcha required, do not send token
      return { page1: cleaned };
    },

    confirmationPopup: !id
      ? {
          show: true,
          title: t("form.step2.page1.confirmation.title"),
          message: t("form.step2.page1.confirmation.message"),
          confirmLabel: t("form.step2.page1.confirmation.confirmLabel"),
          cancelLabel: t("form.step2.page1.confirmation.cancelLabel"),
        }
      : undefined,

    // Fully resolved fallback; on POST we still prefer server nextUrl
    nextRoute: id ? `/onboarding/${id}/application-form/page-2` : "/onboarding", // harmless fallback for first-time POST (no id yet)

    submitSegment: "page-1",
  };
};
