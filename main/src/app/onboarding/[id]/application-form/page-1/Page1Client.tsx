/**
 * Application Form Page 1 Client Component — DriveDock (SSP Portal)
 *
 * Description:
 * Client-side component for Page 1 of the application form (Identity, Licenses, Addresses).
 * Manages form state using React Hook Form with Zod validation, orchestrates form sections,
 * and handles submission through the ContinueButton component.
 *
 * Features:
 * - React Hook Form with Zod validation
 * - Modular form sections (PersonalDetails, PlaceOfBirth, LicenseSection, AddressSection)
 * - Tracker store hydration for navigation
 * - SIN normalization (digits only)
 * - Form submission orchestration via ContinueButton
 *
 * Form Sections:
 * - PersonalDetails: Name, SIN, contact information
 * - PlaceOfBirth: Birth location information
 * - LicenseSection: Driver license details and photos
 * - AddressSection: Current and previous addresses
 *
 * Author: Faruq Adebayo Atanda
 * Company: SSP Group of Companies
 * Created: 2025-01-27
 */

"use client";

import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createApplicationFormPage1Schema, ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";

import PersonalDetails from "./components/PersonalDetails";
import PlaceOfBirth from "./components/PlaceOfBirth";
import LicenseSection from "./components/LicenseSection";
import AddressSection from "./components/AddressSection";
import ContinueButton from "@/app/onboarding/[id]/ContinueButton";

import { page1ConfigFactory } from "@/lib/frontendConfigs/applicationFormConfigs/page1Config";
import { useEffect } from "react";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

/**
 * Props for Page1Client component
 */
type Page1ClientProps = {
  defaultValues: ApplicationFormPage1Schema;
  trackerId: string;
  // Optional: when the server wrapper passes onboardingContext from GET,
  // we hydrate the store so no-op continue can navigate forward without PATCH.
  trackerContextFromGet?: IOnboardingTrackerContext | null;
  prequalificationData?: {
    statusInCanada?: string;
  } | null;
};

export default function Page1Client({ defaultValues, trackerId, trackerContextFromGet, prequalificationData }: Page1ClientProps) {
  // Normalize SIN to digits only for consistent formatting
  const cleanedDefaults: ApplicationFormPage1Schema = {
    ...defaultValues,
    sin: defaultValues.sin?.replace(/\D/g, "") || "",
  };

  // Create dynamic schema based on prequalification data
  const dynamicSchema = createApplicationFormPage1Schema(prequalificationData);

  // Initialize React Hook Form with Zod validation
  const methods = useForm<ApplicationFormPage1Schema>({
    resolver: zodResolver(dynamicSchema),
    mode: "onChange",
    defaultValues: cleanedDefaults,
  });

  // Hydrate tracker store with latest context for navigation
  const { setTracker } = useOnboardingTracker();
  useEffect(() => {
    if (trackerContextFromGet) setTracker(trackerContextFromGet);
  }, [trackerContextFromGet, setTracker]);

  return (
    <FormProvider {...methods}>
      <form
        className="space-y-8"
        // Prevent native submit; ContinueButton orchestrates submission
        onSubmit={(e) => e.preventDefault()}
        noValidate
      >
        <PersonalDetails onboardingContext={trackerContextFromGet} prequalificationData={prequalificationData} />
        <PlaceOfBirth />
        <LicenseSection />
        <AddressSection />

        <ContinueButton<ApplicationFormPage1Schema>
          // Provide a tracker-aware config at runtime (factory)
          config={(ctx) =>
            page1ConfigFactory({
              ...ctx,
              // When resuming, we already know the trackerId
              effectiveTrackerId: trackerId,
            })
          }
          trackerId={trackerId}
        />
      </form>
    </FormProvider>
  );
}
