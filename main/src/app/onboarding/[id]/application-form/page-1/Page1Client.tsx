"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applicationFormPage1Schema,
  ApplicationFormPage1Schema,
} from "@/lib/zodSchemas/applicationFormPage1.schema";

// Components
import PersonalDetails from "./components/PersonalDetails";
import PlaceOfBirth from "./components/PlaceOfBirth";
import LicenseSection from "./components/LicenseSection";
import AddressSection from "./components/AddressSection";
import ContinueButton from "@/app/onboarding/[id]/ContinueButton";

// Config
import { page1Config } from "@/lib/frontendConfigs/applicationFormConfigs/page1Config";

type Page1ClientProps = {
  defaultValues: ApplicationFormPage1Schema;
  trackerId: string;
};

export default function Page1Client({
  defaultValues,
  trackerId,
}: Page1ClientProps) {
  const cleanedDefaults: ApplicationFormPage1Schema = {
    ...defaultValues,
    sin: defaultValues.sin?.replace(/\D/g, "") || "",
  };

  const methods = useForm<ApplicationFormPage1Schema>({
    resolver: zodResolver(applicationFormPage1Schema),
    mode: "onChange",
    defaultValues: cleanedDefaults,
  });

  return (
    <FormProvider {...methods}>
      <form className="space-y-8" noValidate>
        <PersonalDetails />
        <PlaceOfBirth />
        <LicenseSection />
        <AddressSection />
        <ContinueButton<ApplicationFormPage1Schema>
          config={page1Config}
          trackerId={trackerId}
        />
      </form>
    </FormProvider>
  );
}
