// main/src/app/onboarding/[id]/application-form/page-2/Page2Client.tsx
"use client";

/**
 * ===============================================================
 * DriveDock Onboarding — Page 2 Client (Employment History)
 * ---------------------------------------------------------------
 * - RHF + Zod for validation
 * - Uses page2Config + <ContinueButton /> for PATCH flow
 * - Form submit is prevented; ContinueButton handles submission
 *
 * Owner: SSP Tech Team — Faruq Adebayo Atanda
 * ===============================================================
 */

import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applicationFormPage2Schema,
  ApplicationFormPage2Schema,
} from "@/lib/zodSchemas/applicationFormPage2.schema";

import EmploymentSection from "./components/EmploymentSection";
import ContinueButton from "@/app/onboarding/[id]/ContinueButton";
import { page2Config } from "@/lib/frontendConfigs/applicationFormConfigs/page2Config";

type Page2ClientProps = {
  defaultValues: ApplicationFormPage2Schema;
  trackerId: string;
};

export default function Page2Client({
  defaultValues,
  trackerId,
}: Page2ClientProps) {
  const methods = useForm<ApplicationFormPage2Schema>({
    resolver: zodResolver(applicationFormPage2Schema),
    mode: "onChange",
    defaultValues,
  });

  return (
    <FormProvider {...methods}>
      <form
        className="space-y-8"
        // Prevent native form submit; ContinueButton drives the flow
        onSubmit={(e) => e.preventDefault()}
        noValidate
      >
        <EmploymentSection />

        <ContinueButton<ApplicationFormPage2Schema>
          config={page2Config}
          trackerId={trackerId}
        />
      </form>
    </FormProvider>
  );
}
