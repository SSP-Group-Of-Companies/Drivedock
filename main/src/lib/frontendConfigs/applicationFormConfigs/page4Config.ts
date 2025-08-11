"use client";

import { ApplicationFormPage4Schema } from "@/lib/zodSchemas/applicationFormPage4.Schema";
import { FormPageConfig } from "@/lib/frontendConfigs/formPageConfig.types";

/**
 * Page 4 needs the trackerId to build a concrete nextRoute.
 * Usage in client: const config = useMemo(() => makePage4Config(trackerId), [trackerId])
 */
export function makePage4Config(trackerId: string): FormPageConfig<ApplicationFormPage4Schema> {
  return {
    validationFields: (values) => {
      const fields: string[] = [
        // criminal records: validate all rows if present
        "criminalRecords",
        "deniedLicenseOrPermit",
        "suspendedOrRevoked",
        "suspensionNotes",
        "testedPositiveOrRefused",
        "completedDOTRequirements",
        "hasAccidentalInsurance",

        // business (all-or-nothing enforced in Zod/server)
        "employeeNumber",
        "hstNumber",
        "businessNumber",
        "hstPhotos",
        "incorporatePhotos",
        "bankingInfoPhotos",

        // docs (CA/US requirements enforced in Zod/server)
        "healthCardPhotos",
        "medicalCertificationPhotos",
        "passportPhotos",
        "usVisaPhotos",
        "prPermitCitizenshipPhotos",

        // fast card (optional, but if provided -> both sides required in Zod/server)
        "fastCard",
      ];

      // expand criminal record children so RHF can scroll precisely
      values.criminalRecords?.forEach((_, i) => {
        fields.push(`criminalRecords.${i}.offense`);
        fields.push(`criminalRecords.${i}.dateOfSentence`);
        fields.push(`criminalRecords.${i}.courtLocation`);
      });

      return fields;
    },

    // Client-only extras if you want (kept null for parity with backend)
    validateBusinessRules: () => null,

    // Build PATCH payload (Page 4 is always PATCH in your flow)
    buildPayload: (values) => {
      return values;
    },

    // NOTE: bake the trackerId here so ContinueButton can route directly
    nextRoute: `/onboarding/${trackerId}/application-form/page-5`,

    // Segment label for any analytics/logging you use
    submitSegment: "page-4",
  };
}
