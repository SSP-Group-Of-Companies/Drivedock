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
import { createApplicationFormPage1Schema, ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { ELicenseType } from "@/types/shared.types";

// Use the factory (not the old object)
import { page1ConfigFactory } from "@/lib/frontendConfigs/applicationFormConfigs/page1Config";
import PersonalDetails from "../../[id]/(has-step)/application-form/page-1/components/PersonalDetails";
import PlaceOfBirth from "../../[id]/(has-step)/application-form/page-1/components/PlaceOfBirth";
import LicenseSection from "../../[id]/(has-step)/application-form/page-1/components/LicenseSection";
import AddressSection from "../../[id]/(has-step)/application-form/page-1/components/AddressSection";
import ContinueButton from "../../[id]/(has-step)/ContinueButton";
import { usePrequalificationStore } from "@/store/usePrequalificationStore";

const EMPTY_PHOTO = { s3Key: "", url: "", mimeType: "", sizeBytes: 0, originalName: "" };

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
  // Get prequalification data from store to determine if user has Work Permit status
  const { data: prequalificationData } = usePrequalificationStore();

  // Create dynamic schema based on prequalification data
  const dynamicSchema = createApplicationFormPage1Schema(prequalificationData);

  const methods = useForm<ApplicationFormPage1Schema>({
    resolver: zodResolver(dynamicSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      sin: "",
      sinIssueDate: "",
      sinExpiryDate: "",
      gender: "" as "male" | "female",
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
        <PersonalDetails prequalificationData={prequalificationData ? { statusInCanada: prequalificationData.statusInCanada } : null} />
        <PlaceOfBirth />
        <LicenseSection />
        <AddressSection />

        {/* Pass the factory directly. No trackerId here (POST flow). */}
        <ContinueButton<ApplicationFormPage1Schema> config={page1ConfigFactory} trackerId={undefined} />
      </form>
    </FormProvider>
  );
}
