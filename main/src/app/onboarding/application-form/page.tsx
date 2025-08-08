"use client";

/**
 * DriveDock Onboarding - Page 1 Initial Entry
 *
 * This client component handles:
 * - The first-time rendering of the Application Form (Page 1)
 * - Collects both `applicationFormPage1` and `prequalifications` data
 * - Submits to POST /api/v1/onboarding/application-form to create tracker
 *
 * This page is used only **once** before the tracker ID exists.
 * After submission, routing shifts to ID-based folder structure.
 *
 * @route /onboarding/application-form
 * @owner SSP Tech Team - Faruq Adebayo
 */

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applicationFormPage1Schema,
  ApplicationFormPage1Schema,
} from "@/lib/zodSchemas/applicationFormPage1.schema";
import { ELicenseType } from "@/types/shared.types";

// Components, types and hooks imports
import PersonalDetails from "../[id]/application-form/page-1/components/PersonalDetails";
import PlaceOfBirth from "../[id]/application-form/page-1/components/PlaceOfBirth";
import LicenseSection from "../[id]/application-form/page-1/components/LicenseSection";
import AddressSection from "../[id]/application-form/page-1/components/AddressSection";
import ContinueButton from "../[id]/ContinueButton";
import { page1Config } from "@/lib/frontendConfigs/applicationFormConfigs/page1Config";

// Minimal placeholders that satisfy the zod shape (validation enforces non-empty on submit)
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
      //  StrictMode-safe: start with exactly one address so "Previous 1" never appears on first load
      addresses: [BLANK_ADDRESS],
    },
  });

  return (
    <FormProvider {...methods}>
      <form className="space-y-8" noValidate>
        <PersonalDetails />
        <PlaceOfBirth />
        <LicenseSection />
        <AddressSection />
        <ContinueButton<ApplicationFormPage1Schema> config={page1Config} />
      </form>
    </FormProvider>
  );
}
