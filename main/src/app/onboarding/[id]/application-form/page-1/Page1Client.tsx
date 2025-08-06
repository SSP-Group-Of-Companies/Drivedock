/**
 * Page1Client.tsx
 *
 *   Client-side Page 1 of the Driver Application Form
 * - Uses RHF + Zod for form context and validation
 * - Renders personal info, place of birth, licenses, and address sections
 * - Submits via a shared config-driven <ContinueButton> component
 *
 * Props:
 * - defaultValues: hydrated form data from server
 * - trackerId: resume tracker used for PATCH requests
 */

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
import ContinueButton from "@/app/onboarding/application-form/ContinueButton";

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
  const methods = useForm<ApplicationFormPage1Schema>({
    resolver: zodResolver(applicationFormPage1Schema),
    mode: "onChange",
    defaultValues,
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
