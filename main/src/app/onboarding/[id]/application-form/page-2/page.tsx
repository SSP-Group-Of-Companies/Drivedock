"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applicationFormPage2Schema,
  ApplicationFormPage2Schema,
} from "@/lib/zodSchemas/applicationFormPage2.schema";

// Components
import EmploymentSection from "./components/EmploymentSection";
import ContinueButton from "@/app/onboarding/application-form/ContinueButton";

// Config
import { page2Config } from "@/lib/frontendConfigs/applicationFormConfigs/page2Config";

export default function ApplicationFormPage2() {
  const methods = useForm<ApplicationFormPage2Schema>({
    resolver: zodResolver(applicationFormPage2Schema),
    mode: "onChange",
    defaultValues: {
      employments: [
        {
          employerName: "",
          supervisorName: "",
          address: "",
          postalCode: "",
          city: "",
          stateOrProvince: "",
          phone1: "",
          phone2: "",
          email: "",
          positionHeld: "",
          from: "",
          to: "",
          salary: "",
          reasonForLeaving: "",
          subjectToFMCSR: undefined,
          safetySensitiveFunction: undefined,
          gapExplanationBefore: "",
        },
      ],
    },
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
        <ContinueButton<ApplicationFormPage2Schema> config={page2Config} />
      </form>
    </FormProvider>
  );
}
