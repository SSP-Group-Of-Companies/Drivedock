"use client";

import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Zod
import { makeApplicationFormPage4Schema, ApplicationFormPage4Input } from "@/lib/zodSchemas/applicationFormPage4.Schema";

import { ECountryCode } from "@/types/shared.types";
import { IApplicationFormPage4 } from "@/types/applicationForm.types";
import { ITrackerContext } from "@/types/onboardingTracker.type";

// UI
import ContinueButton from "@/app/onboarding/[id]/ContinueButton";
import { makePage4Config } from "@/lib/frontendConfigs/applicationFormConfigs/page4Config";

// Sections (assume you already have or will create these)
import CriminalRecordsSection from "./components/CriminalRecordsSection";
import BusinessSection from "./components/BusinessSection";
import EligibilityDocsSection from "./components/EligibilityDocsSection";
import FastCardSection from "./components/FastCardSection";
import AdditionalInfoSection from "./components/AdditionalInfoSection";
import { isCanadianCompany } from "@/constants/companies";

// ---- helpers ----
function formatDate(d?: string | Date | null) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toISOString().split("T")[0];
}

function mapDefaults(page4: IApplicationFormPage4 | null): ApplicationFormPage4Input {
  return {
    criminalRecords:
      page4?.criminalRecords?.map((r) => ({
        offense: r.offense || "",
        dateOfSentence: formatDate(r.dateOfSentence),
        courtLocation: r.courtLocation || "",
      })) ?? [],

    employeeNumber: page4?.employeeNumber ?? "",
    hstNumber: page4?.hstNumber ?? "",
    businessNumber: page4?.businessNumber ?? "",
    hstPhotos: page4?.hstPhotos ?? [],
    incorporatePhotos: page4?.incorporatePhotos ?? [],
    bankingInfoPhotos: page4?.bankingInfoPhotos ?? [],

    healthCardPhotos: page4?.healthCardPhotos ?? [],
    medicalCertificationPhotos: page4?.medicalCertificationPhotos ?? [],
    passportPhotos: page4?.passportPhotos ?? [],
    usVisaPhotos: page4?.usVisaPhotos ?? [],
    prPermitCitizenshipPhotos: page4?.prPermitCitizenshipPhotos ?? [],

    fastCard: page4?.fastCard
      ? {
          fastCardNumber: page4.fastCard.fastCardNumber || "",
          fastCardExpiry: formatDate(page4.fastCard.fastCardExpiry),
          // leave undefined unless real photos exist
          fastCardFrontPhoto: page4.fastCard.fastCardFrontPhoto ?? undefined,
          fastCardBackPhoto: page4.fastCard.fastCardBackPhoto ?? undefined,
        }
      : undefined,

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
  onboardingContext: ITrackerContext;
  page4: IApplicationFormPage4 | null;
};

export default function Page4Client({ trackerId, onboardingContext, page4 }: Props) {
  const defaultValues = useMemo(() => mapDefaults(page4), [page4]);

  // derive country from companyId
  const countryCode: ECountryCode = isCanadianCompany(onboardingContext.companyId) ? ECountryCode.CA : ECountryCode.US;

  const schema = useMemo(
    () =>
      makeApplicationFormPage4Schema({
        countryCode,
        existing: page4 ?? undefined,
      }),
    [countryCode, page4]
  );

  const methods = useForm<ApplicationFormPage4Input>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues,
  });

  const config = useMemo(() => makePage4Config(trackerId), [trackerId]);

  return (
    <FormProvider {...methods}>
      <form className="space-y-8" noValidate>
        <CriminalRecordsSection />
        <BusinessSection />
        <EligibilityDocsSection countryCode={countryCode} />
        {countryCode === ECountryCode.CA && <FastCardSection isCanadian />}
        <AdditionalInfoSection />
        <ContinueButton<ApplicationFormPage4Input> config={config} trackerId={trackerId} />
      </form>
    </FormProvider>
  );
}
