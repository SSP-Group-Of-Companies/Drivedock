// main/src/app/onboarding/application-form/page.tsx
"use client";

/**
 * DriveDock Onboarding - Page 1 Initial Entry
 * - First-time render before tracker exists (POST flow)
 * - Uses page1ConfigFactory with <ContinueButton/>
 * - Prevents native submit; ContinueButton orchestrates submission
 */

import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applicationFormPage1Schema, ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { ELicenseType } from "@/types/shared.types";

// Use the factory (not the old object)
import { page1ConfigFactory } from "@/lib/frontendConfigs/applicationFormConfigs/page1Config";
import PersonalDetails from "../../[id]/application-form/page-1/components/PersonalDetails";
import PlaceOfBirth from "../../[id]/application-form/page-1/components/PlaceOfBirth";
import LicenseSection from "../../[id]/application-form/page-1/components/LicenseSection";
import AddressSection from "../../[id]/application-form/page-1/components/AddressSection";
import ContinueButton from "../../[id]/ContinueButton";

const EMPTY_PHOTO = { s3Key: "", url: "" };

// Seed one blank address so only "Current Address" shows on first render
const BLANK_ADDRESS = {
  address: "",
  city: "",
  stateOrProvince: "",
  postalCode: "",
  from: "",
  to: "",
};

export default function ApplicationFormPage1() {
  const methods = useForm<ApplicationFormPage1Schema>({
    resolver: zodResolver(applicationFormPage1Schema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      sin: "",
      sinPhoto: EMPTY_PHOTO,
      dob: "",
      phoneHome: "",
      phoneCell: "",
      canProvideProofOfAge: false,
      email: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      birthCity: "",
      birthCountry: "",
      birthStateOrProvince: "",
      licenses: [
        {
          licenseNumber: "",
          licenseStateOrProvince: "",
          licenseType: ELicenseType.AZ,
          licenseExpiry: "",
          licenseFrontPhoto: EMPTY_PHOTO,
          licenseBackPhoto: EMPTY_PHOTO,
        },
      ],
      // StrictMode-safe: exactly one address row initially
      addresses: [BLANK_ADDRESS],
    },
  });

  return (
    <FormProvider {...methods}>
      <form
        className="space-y-8"
        onSubmit={(e) => e.preventDefault()} // prevent native submit
        noValidate
      >
        <PersonalDetails />
        <PlaceOfBirth />
        <LicenseSection />
        <AddressSection />

        {/* Pass the factory directly. No trackerId here (POST flow). */}
        <ContinueButton<ApplicationFormPage1Schema> config={page1ConfigFactory} />
      </form>
    </FormProvider>
  );
}
