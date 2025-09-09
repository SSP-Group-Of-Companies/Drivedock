"use client";

import { ApplicationFormPage4Schema } from "@/lib/zodSchemas/applicationFormPage4.Schema";
import { FormPageConfig } from "@/lib/frontendConfigs/formPageConfig.types";

function isBlank(str?: string) {
  return !str || str.trim() === "";
}

function pruneCriminalRecordRows(rows: ApplicationFormPage4Schema["criminalRecords"] | undefined) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => {
      const offenseEmpty = isBlank(r?.offense);
      const dateEmpty = isBlank(r?.dateOfSentence);
      const courtEmpty = isBlank(r?.courtLocation);
      // keep if NOT an empty placeholder row
      return !(offenseEmpty && dateEmpty && courtEmpty);
    })
    .map((obj) => {
      return {
        ...obj,
        offense: isBlank(obj.offense) ? undefined : obj.offense!.trim(),
        dateOfSentence: isBlank(obj.dateOfSentence) ? undefined : obj.dateOfSentence!.trim(),
        courtLocation: isBlank(obj.courtLocation) ? undefined : obj.courtLocation!.trim(),
      };
    });
}

/**
 * Page 4 needs the trackerId to build a concrete nextRoute.
 * Usage in client: const config = useMemo(() => makePage4Config(trackerId), [trackerId])
 */
export function makePage4Config(trackerId: string): FormPageConfig<ApplicationFormPage4Schema> {
  return {
    validationFields: (values) => {
      const fields = [
        "criminalRecords",
        "deniedLicenseOrPermit",
        "suspendedOrRevoked",
        "suspensionNotes",
        "testedPositiveOrRefused",
        "completedDOTRequirements",
        "hasAccidentalInsurance",

        "employeeNumber",
        "hstNumber",
        "businessName",
        "hstPhotos",
        "incorporatePhotos",
        "bankingInfoPhotos",

        "healthCardPhotos",
        "medicalCertificationPhotos",
        "passportPhotos",
        "usVisaPhotos",
        "prPermitCitizenshipPhotos",
        "eligibilityDocs.root", // For US driver passport/PR validation

        // validate leaves (not just "fastCard")
        "fastCard.fastCardNumber",
        "fastCard.fastCardExpiry",
        "fastCard.fastCardFrontPhoto",
        "fastCard.fastCardBackPhoto",
      ];

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
      const fc = values.fastCard;
      const hasFast = !!fc && !!(fc.fastCardNumber?.trim() || fc.fastCardExpiry || fc.fastCardFrontPhoto || fc.fastCardBackPhoto);

      const payload = { 
        ...values,
        // Criminal Records: remove empty placeholders (same pattern as page 3)
        criminalRecords: pruneCriminalRecordRows(values.criminalRecords),
      };
      
      if (!hasFast) delete (payload as any).fastCard; // <- drop empty object

      return payload;
    },

    // NOTE: bake the trackerId here so ContinueButton can route directly
    nextRoute: `/onboarding/${trackerId}/application-form/page-5`,

    // Segment label for any analytics/logging you use
    submitSegment: "page-4",
  };
}