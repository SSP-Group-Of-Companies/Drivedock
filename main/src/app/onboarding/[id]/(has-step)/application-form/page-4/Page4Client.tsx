"use client";

import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Zod
import {
  makeApplicationFormPage4Schema,
  ApplicationFormPage4Input,
} from "@/lib/zodSchemas/applicationFormPage4.Schema";

import { ECountryCode } from "@/types/shared.types";
import { IApplicationFormPage4 } from "@/types/applicationForm.types";
import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

// UI
import ContinueButton from "@/app/onboarding/[id]/(has-step)/ContinueButton";
import { makePage4Config } from "@/lib/frontendConfigs/applicationFormConfigs/page4Config";

// Sections
import CriminalRecordsSection from "./components/CriminalRecordsSection";
import BusinessSection from "./components/BusinessSection";
import BankingInfoSection from "@/app/onboarding/[id]/(has-step)/application-form/page-4/components/BankingInfoSection";
import EligibilityDocsSection from "./components/EligibilityDocsSection";
import FastCardSection from "./components/FastCardSection";
import AdditionalInfoSection from "./components/AdditionalInfoSection";
import { isCanadianCompany } from "@/constants/companies";
import { EDriverType } from "@/types/preQualifications.types";

// ---- helpers ----
function formatDate(d?: string | Date | null) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toISOString().split("T")[0];
}

function mapDefaults(
  page4: IApplicationFormPage4 | null
): ApplicationFormPage4Input {
  // Derive sensible defaults for nested details
  const medicalDetails = page4?.medicalCertificateDetails ?? undefined;
  const passportDetails = page4?.passportDetails ?? undefined;
  const prDetails = page4?.prPermitCitizenshipDetails ?? undefined;

  // Infer US work auth bundle from existing data (for edit flows)
  let usWorkAuthBundle: "passport" | "pr_permit" | "" = "";
  if (
    (page4?.passportPhotos && page4.passportPhotos.length > 0) ||
    (passportDetails && passportDetails.documentNumber)
  ) {
    usWorkAuthBundle = "passport";
  } else if (
    (page4?.prPermitCitizenshipPhotos &&
      page4.prPermitCitizenshipPhotos.length > 0) ||
    (prDetails && prDetails.documentNumber)
  ) {
    usWorkAuthBundle = "pr_permit";
  }

  return {
    hasCriminalRecords:
      page4 && Object.prototype.hasOwnProperty.call(page4, "hasCriminalRecords")
        ? (page4.hasCriminalRecords as boolean)
        : (page4?.criminalRecords?.length ?? 0) > 0
        ? true
        : (undefined as unknown as boolean),
    criminalRecords:
      page4?.criminalRecords && page4.criminalRecords.length > 0
        ? page4.criminalRecords.map((r) => ({
            offense: r.offense || "",
            dateOfSentence: formatDate(r.dateOfSentence),
            courtLocation: r.courtLocation || "",
          }))
        : [{ offense: "", dateOfSentence: "", courtLocation: "" }],

    // Business / banking
    hstNumber: page4?.hstNumber ?? "",
    businessName: page4?.businessName ?? "",
    hstPhotos: page4?.hstPhotos ?? [],
    incorporatePhotos: page4?.incorporatePhotos ?? [],
    bankingInfoPhotos: page4?.bankingInfoPhotos ?? [],

    // Health / medical
    healthCardPhotos: page4?.healthCardPhotos ?? [],
    medicalCertificationPhotos: page4?.medicalCertificationPhotos ?? [],
    medicalCertificateDetails: medicalDetails
      ? {
          documentNumber: medicalDetails.documentNumber ?? "",
          issuingAuthority: medicalDetails.issuingAuthority ?? "",
          expiryDate: formatDate(medicalDetails.expiryDate ?? null),
        }
      : {
          documentNumber: "",
          issuingAuthority: "",
          expiryDate: "",
        },

    // US immigration
    immigrationStatusInUS: page4?.immigrationStatusInUS ?? "",

    // Passport type selection (Canadian companies only)
    passportType: page4?.passportType ?? undefined,
    workAuthorizationType: page4?.workAuthorizationType ?? undefined,

    // Work authorization docs (CA + US)
    passportPhotos: page4?.passportPhotos ?? [],
    usVisaPhotos: page4?.usVisaPhotos ?? [],
    prPermitCitizenshipPhotos: page4?.prPermitCitizenshipPhotos ?? [],

    passportDetails: passportDetails
      ? {
          documentNumber: passportDetails.documentNumber ?? "",
          issuingAuthority: passportDetails.issuingAuthority ?? "",
          countryOfIssue: passportDetails.countryOfIssue ?? "",
          expiryDate: formatDate(passportDetails.expiryDate ?? null),
        }
      : {
          documentNumber: "",
          issuingAuthority: "",
          countryOfIssue: "",
          expiryDate: "",
        },

    prPermitCitizenshipDetails: prDetails
      ? {
          documentType: prDetails.documentType,
          documentNumber: prDetails.documentNumber ?? "",
          issuingAuthority: prDetails.issuingAuthority ?? "",
          countryOfIssue: prDetails.countryOfIssue ?? "",
          expiryDate: formatDate(prDetails.expiryDate ?? null),
        }
      : {
          // documentType left undefined by default; user must choose
          documentType: undefined as any,
          documentNumber: "",
          issuingAuthority: "",
          countryOfIssue: "",
          expiryDate: "",
        },

    // UI-only toggle for US bundle selection
    usWorkAuthBundle,

    // FAST card
    fastCard: page4?.fastCard
      ? {
          fastCardNumber: page4.fastCard.fastCardNumber || "",
          fastCardExpiry: formatDate(page4.fastCard.fastCardExpiry),
          fastCardFrontPhoto: page4.fastCard.fastCardFrontPhoto ?? undefined,
          fastCardBackPhoto: page4.fastCard.fastCardBackPhoto ?? undefined,
        }
      : undefined,

    // Additional info
    deniedLicenseOrPermit: page4?.deniedLicenseOrPermit ?? undefined,
    suspendedOrRevoked: page4?.suspendedOrRevoked ?? undefined,
    suspensionNotes: page4?.suspensionNotes ?? "",
    testedPositiveOrRefused: page4?.testedPositiveOrRefused ?? undefined,
    completedDOTRequirements: page4?.completedDOTRequirements ?? undefined,
    hasAccidentalInsurance: page4?.hasAccidentalInsurance ?? undefined,
  };
}

type Props = {
  trackerId: string;
  onboardingContext: IOnboardingTrackerContext;
  page4: IApplicationFormPage4 | null;
  prequalificationData?: { driverType?: string } | null;
};

export default function Page4Client({
  trackerId,
  onboardingContext,
  page4,
  prequalificationData,
}: Props) {
  const defaultValues = useMemo(() => mapDefaults(page4), [page4]);

  // derive country from companyId; default to US if unknown
  const countryCode: ECountryCode =
    onboardingContext.companyId &&
    isCanadianCompany(onboardingContext.companyId)
      ? ECountryCode.CA
      : ECountryCode.US;

  // Use DB prequalification driverType from GET; do not rely on local storage
  const driverType: EDriverType | null =
    (prequalificationData?.driverType as EDriverType) ?? null;

  const schema = useMemo(
    () =>
      makeApplicationFormPage4Schema({
        countryCode,
        existing: page4 ?? undefined,
        driverType,
      }),
    [countryCode, page4, driverType]
  );

  const methods = useForm<ApplicationFormPage4Input>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues,
  });

  const config = useMemo(
    () => makePage4Config(trackerId, countryCode),
    [trackerId, countryCode]
  );

  return (
    <FormProvider {...methods}>
      <form className="space-y-8" noValidate>
        <CriminalRecordsSection />
        <BusinessSection countryCode={countryCode} />
        <BankingInfoSection />
        <EligibilityDocsSection countryCode={countryCode} />
        {countryCode === ECountryCode.CA && <FastCardSection isCanadian />}
        <AdditionalInfoSection />
        <ContinueButton<ApplicationFormPage4Input>
          config={config}
          trackerId={trackerId}
        />
      </form>
    </FormProvider>
  );
}
