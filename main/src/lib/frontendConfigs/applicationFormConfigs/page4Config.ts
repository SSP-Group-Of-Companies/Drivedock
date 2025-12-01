// main/src/lib/frontendConfigs/applicationFormConfigs/page4Config.ts
"use client";

import { ApplicationFormPage4Schema } from "@/lib/zodSchemas/applicationFormPage4.Schema";
import { FormPageConfig } from "@/lib/frontendConfigs/formPageConfig.types";
import { ECountryCode } from "@/types/shared.types";

function isBlank(str?: string) {
  return !str || str.trim() === "";
}

function pruneCriminalRecordRows(
  rows: ApplicationFormPage4Schema["criminalRecords"] | undefined
) {
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
        dateOfSentence: isBlank(obj.dateOfSentence)
          ? undefined
          : obj.dateOfSentence!.trim(),
        courtLocation: isBlank(obj.courtLocation)
          ? undefined
          : obj.courtLocation!.trim(),
      };
    });
}

/**
 * Page 4 needs the trackerId to build a concrete nextRoute.
 * Usage:
 *   const config = useMemo(
 *     () => makePage4Config(trackerId, countryCode),
 *     [trackerId, countryCode]
 *   );
 */
export function makePage4Config(
  trackerId: string,
  countryCode: ECountryCode
): FormPageConfig<ApplicationFormPage4Schema> {
  const isUS = countryCode === ECountryCode.US;
  const isCA = countryCode === ECountryCode.CA;

  return {
    validationFields: (values) => {
      const fields: string[] = [
        "hasCriminalRecords",
        "criminalRecords",
        "deniedLicenseOrPermit",
        "suspendedOrRevoked",
        "suspensionNotes",
        "testedPositiveOrRefused",
        "completedDOTRequirements",
        "hasAccidentalInsurance",

        // Business / incorporation (banking has its own section)
        "businessName",
        "incorporatePhotos",
        "bankingInfoPhotos",

        // Health / medical (both countries have this key, but UI differs)
        "healthCardPhotos",
        "medicalCertificationPhotos",

        // Passport type selection (Canadian flow)
        "passportType",
        "workAuthorizationType",

        // Work auth photos (shared keys; rules differ by country)
        "passportPhotos",
        "usVisaPhotos",
        "prPermitCitizenshipPhotos",

        // FAST card (leafs, not just object)
        "fastCard.fastCardNumber",
        "fastCard.fastCardExpiry",
        "fastCard.fastCardFrontPhoto",
        "fastCard.fastCardBackPhoto",
      ];

      // HST fields only matter for non-US applicants
      if (!isUS) {
        fields.push("hstNumber");
        fields.push("hstPhotos");
      }

      // US-only detail / bundle fields – we only care when country is US
      if (isUS) {
        // Medical certificate details
        fields.push("medicalCertificateDetails.documentNumber");
        fields.push("medicalCertificateDetails.issuingAuthority");
        fields.push("medicalCertificateDetails.expiryDate");

        // Immigration + bundle selector
        fields.push("immigrationStatusInUS");
        fields.push("usWorkAuthBundle");

        // Passport details bundle A
        fields.push("passportDetails.documentNumber");
        fields.push("passportDetails.issuingAuthority");
        fields.push("passportDetails.countryOfIssue");
        fields.push("passportDetails.expiryDate");

        // PR / Permit / Citizenship details bundle B
        fields.push("prPermitCitizenshipDetails.documentType");
        fields.push("prPermitCitizenshipDetails.documentNumber");
        fields.push("prPermitCitizenshipDetails.issuingAuthority");
        fields.push("prPermitCitizenshipDetails.countryOfIssue");
        fields.push("prPermitCitizenshipDetails.expiryDate");

        // Anchor used by eligibility section for bundle errors
        fields.push("eligibilityDocs.root");
      }

      values.criminalRecords?.forEach((_, i) => {
        fields.push(`criminalRecords.${i}.offense`);
        fields.push(`criminalRecords.${i}.dateOfSentence`);
        fields.push(`criminalRecords.${i}.courtLocation`);
      });

      return fields;
    },

    // Client-only business rules → must return string | null
    // Used for a top-level (root) error message.
    validateBusinessRules: (values) => {
      if (
        isUS &&
        (!values.usWorkAuthBundle ||
          (values.usWorkAuthBundle !== "passport" &&
            values.usWorkAuthBundle !== "pr_permit"))
      ) {
        return "Please choose which document bundle you will provide: Passport OR PR / Permit / Citizenship.";
      }
      return null;
    },

    // Build PATCH payload (Page 4 is always PATCH in your flow)
    buildPayload: (values) => {
      const fc = values.fastCard;
      const hasFast =
        !!fc &&
        !!(
          fc.fastCardNumber?.trim() ||
          fc.fastCardExpiry ||
          fc.fastCardFrontPhoto ||
          fc.fastCardBackPhoto
        );

      const payload: any = {
        ...values,
        // Criminal Records: remove empty placeholders (same pattern as page 3)
        criminalRecords: values.hasCriminalRecords
          ? pruneCriminalRecordRows(values.criminalRecords)
          : [],
      };

      if (!hasFast) {
        // drop empty object so backend can treat absence as "clear"
        delete payload.fastCard;
      }

      // ── Country-specific clean-up ────────────────────────────────────────
      if (isUS) {
        // Never send HST for US
        delete payload.hstNumber;
        delete payload.hstPhotos;

        const bundle = values.usWorkAuthBundle; // "passport" | "pr_permit" | ""

        if (bundle === "passport") {
          // User chose passport → strip ALL PR/Permit fields so backend never sees both
          delete payload.prPermitCitizenshipPhotos;
          delete payload.prPermitCitizenshipDetails;
        } else if (bundle === "pr_permit") {
          // User chose PR/Permit → strip ALL passport fields
          delete payload.passportPhotos;
          delete payload.passportDetails;
        }
        // If bundle is unset, Zod + validateBusinessRules should already block submit.
      } else if (isCA) {
        // Canadian applicants should NEVER send US-only detail/bundle fields.
        // Leaving them in with empty strings causes Mongoose subdoc validators to fire.
        delete payload.immigrationStatusInUS;
        delete payload.usWorkAuthBundle;
        delete payload.medicalCertificateDetails;
        delete payload.passportDetails;
        delete payload.prPermitCitizenshipDetails;

        // Med cert photos are CA-forbidden but UI never exposes them.
        // We still allow the empty [] default to go through; backend's forbidNonEmpty()
        // treats empty array as ok but rejects if any file sneaks in.
      } else {
        // Future third-country safety: strip both US- and CA-specific toggles
        delete payload.immigrationStatusInUS;
        delete payload.usWorkAuthBundle;
        delete payload.medicalCertificateDetails;
        delete payload.passportDetails;
        delete payload.prPermitCitizenshipDetails;
      }
      // ─────────────────────────────────────────────────────────────────────

      return payload as ApplicationFormPage4Schema;
    },

    // NOTE: bake the trackerId here so ContinueButton can route directly
    nextRoute: `/onboarding/${trackerId}/application-form/page-5`,

    // Segment label for any analytics/logging you use
    submitSegment: "page-4",
  };
}
