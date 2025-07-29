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
import ContinueButton from "../ContinueButton";

export default function ApplicationFormPage1() {
  const methods = useForm<ApplicationFormPage1Schema>({
    resolver: zodResolver(applicationFormPage1Schema),
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      sin: "",
      sinEncrypted: "",
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
      licenses: [],
      addresses: [],
    },
  });

  const onSubmit = (data: ApplicationFormPage1Schema) => {
    // The ContinueButton will call this manually via context
    // So this will never be triggered unless we fallback to native form submission
    console.log("Form submitted with:", data);
  };

  return (
    <FormProvider {...methods}>
      <form
        className="space-y-8"
        onSubmit={methods.handleSubmit(onSubmit)} // Industry-standard binding
        noValidate // Optional: disable native browser validations
      >
        <PersonalDetails />
        <PlaceOfBirth />
        <LicenseSection />
        <AddressSection />
        <ContinueButton />
      </form>
    </FormProvider>
  );
}
