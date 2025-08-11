// main/src/app/onboarding/[id]/application-form/page-1/Page1Client.tsx
"use client";

/**
 * Page 1 Client (Identity, Licenses, Addresses)
 * - RHF + Zod
 * - Uses page1ConfigFactory + <ContinueButton />
 * - Hydrates tracker store from GET for no-op continue
 */

import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applicationFormPage1Schema,
  ApplicationFormPage1Schema,
} from "@/lib/zodSchemas/applicationFormPage1.schema";

import PersonalDetails from "./components/PersonalDetails";
import PlaceOfBirth from "./components/PlaceOfBirth";
import LicenseSection from "./components/LicenseSection";
import AddressSection from "./components/AddressSection";
import ContinueButton from "@/app/onboarding/[id]/ContinueButton";

import { page1ConfigFactory } from "@/lib/frontendConfigs/applicationFormConfigs/page1Config";
import { useEffect } from "react";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import type { ITrackerContext } from "@/types/onboardingTracker.type";

type Page1ClientProps = {
  defaultValues: ApplicationFormPage1Schema;
  trackerId: string;
  // Optional: when the server wrapper passes onboardingContext from GET,
  // we hydrate the store so no-op continue can navigate forward without PATCH.
  trackerContextFromGet?: ITrackerContext | null;
};

export default function Page1Client({
  defaultValues,
  trackerId,
  trackerContextFromGet,
}: Page1ClientProps) {
  // Normalize SIN (digits only) in defaults
  const cleanedDefaults: ApplicationFormPage1Schema = {
    ...defaultValues,
    sin: defaultValues.sin?.replace(/\D/g, "") || "",
  };

  const methods = useForm<ApplicationFormPage1Schema>({
    resolver: zodResolver(applicationFormPage1Schema),
    mode: "onChange",
    defaultValues: cleanedDefaults,
  });

  // Keep the tracker store fresh with latest nextUrl (enables no-op continue)
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
        <PersonalDetails />
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
