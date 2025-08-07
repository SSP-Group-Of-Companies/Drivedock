"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applicationFormPage2Schema,
  ApplicationFormPage2Schema,
} from "@/lib/zodSchemas/applicationFormPage2.schema";

// Components
import EmploymentSection from "./components/EmploymentSection";
import ContinueButton from "@/app/onboarding/[id]/ContinueButton";

// Config
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

  const onSubmit = () => {
    // Not used — handled by ContinueButton
  };

  return (
    <FormProvider {...methods}>
      <form
        className="space-y-8"
        onSubmit={methods.handleSubmit(onSubmit)}
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
