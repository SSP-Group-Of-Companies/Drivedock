// main/src/app/onboarding/[id]/application-form/page-2/Page2Client.tsx
"use client";

/**
 * Page 2 Client (Employment History)
 * - RHF + Zod
 * - Uses page2ConfigFactory + <ContinueButton />
 * - Hydrates tracker store from GET for no-op continue
 */

import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applicationFormPage2Schema,
  ApplicationFormPage2Schema,
} from "@/lib/zodSchemas/applicationFormPage2.schema";

import EmploymentSection from "./components/EmploymentSection";
import ContinueButton from "@/app/onboarding/[id]/ContinueButton";
import { page2ConfigFactory } from "@/lib/frontendConfigs/applicationFormConfigs/page2Config";
import { useEffect } from "react";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";
import type { ITrackerContext } from "@/types/onboardingTracker.types";

type Page2ClientProps = {
  defaultValues: ApplicationFormPage2Schema;
  trackerId: string;
  trackerContextFromGet?: ITrackerContext | null;
};

export default function Page2Client({
  defaultValues,
  trackerId,
  trackerContextFromGet,
}: Page2ClientProps) {
  const methods = useForm<ApplicationFormPage2Schema>({
    resolver: zodResolver(applicationFormPage2Schema),
    mode: "onChange",
    defaultValues,
  });

  const { setTracker } = useOnboardingTracker();
  useEffect(() => {
    if (trackerContextFromGet) setTracker(trackerContextFromGet);
  }, [trackerContextFromGet, setTracker]);

  return (
    <FormProvider {...methods}>
      <form
        className="space-y-8"
        onSubmit={(e) => e.preventDefault()}
        noValidate
      >
        <EmploymentSection />

        <ContinueButton<ApplicationFormPage2Schema>
          config={(ctx) =>
            page2ConfigFactory({
              ...ctx,
              effectiveTrackerId: trackerId,
            })
          }
          trackerId={trackerId}
        />
      </form>
    </FormProvider>
  );
}
