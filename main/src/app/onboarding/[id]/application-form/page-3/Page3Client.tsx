"use client";

/**
 * Page 3 Client (Accident History, Traffic Convictions, Education, Canadian Hours of Service)
 * - RHF + Zod
 * - Uses page3ConfigFactory + <ContinueButton />
 * - Hydrates tracker store from GET for no-op continue
 */

import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

import {
  applicationFormPage3Schema,
  ApplicationFormPage3Schema,
} from "@/lib/zodSchemas/applicationFormPage3.schema";

import ContinueButton from "@/app/onboarding/[id]/ContinueButton";
import { page3ConfigFactory } from "@/lib/frontendConfigs/applicationFormConfigs/page3Config";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import type { ITrackerContext } from "@/types/onboardingTracker.types";

// Import modular components
import AccidentHistorySection from "./components/AccidentHistorySection";
import TrafficConvictionsSection from "./components/TrafficConvictionsSection";
import EducationSection from "./components/EducationSection";
import CanadianHoursSection from "./components/CanadianHoursSection";

type Page3ClientProps = {
  defaultValues: ApplicationFormPage3Schema;
  trackerId: string;
  // Optional: when the server wrapper passes onboardingContext from GET,
  // we hydrate the store so no-op continue can navigate forward without PATCH.
  trackerContextFromGet?: ITrackerContext | null;
};

export default function Page3Client({
  defaultValues,
  trackerId,
  trackerContextFromGet,
}: Page3ClientProps) {
  const methods = useForm<ApplicationFormPage3Schema>({
    resolver: zodResolver(applicationFormPage3Schema),
    mode: "onChange",
    defaultValues,
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
        <AccidentHistorySection />
        <TrafficConvictionsSection />
        <EducationSection />
        <CanadianHoursSection />

        <ContinueButton<ApplicationFormPage3Schema>
          // Provide a tracker-aware config at runtime (factory)
          config={(ctx) =>
            page3ConfigFactory({
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
