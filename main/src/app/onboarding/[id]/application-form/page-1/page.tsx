"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applicationFormPage1Schema,
  ApplicationFormPage1Schema,
} from "@/lib/zodSchemas/applicationFormPage1.schema";
import { ELicenseType } from "@/types/shared.types";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// Components
import PersonalDetails from "./components/PersonalDetails";
import PlaceOfBirth from "./components/PlaceOfBirth";
import LicenseSection from "./components/LicenseSection";
import AddressSection from "./components/AddressSection";
import ContinueButton from "../../../application-form/ContinueButton";

// Config
import { page1Config } from "@/lib/frontendConfigs/applicationFormConfigs/page1Config";
import { formatInputDate } from "@/lib/utils/dateUtils";

export default function ApplicationFormPage1() {
  const params = useParams();
  const id = params?.id as string;

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const methods = useForm<ApplicationFormPage1Schema>({
    resolver: zodResolver(applicationFormPage1Schema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      sin: "",
      sinPhoto: undefined,
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
      licenses: [
        {
          licenseNumber: "",
          licenseStateOrProvince: "",
          licenseType: ELicenseType.AZ,
          licenseExpiry: "",
          licenseFrontPhoto: undefined,
          licenseBackPhoto: undefined,
        },
      ],
      addresses: [],
    },
  });

  // Fetch and prefill form data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/v1/onboarding/${id}/application-form/page-1`,
          {
            method: "GET",
            cache: "no-store",
          }
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data?.message || "An error occurred while loading the form.");
          setLoading(false);
          return;
        }
        if (data?.data?.page1) {
          methods.reset({
            ...methods.getValues(),
            ...{
              ...data.data.page1,
              // Dates to yyyy-mm-dd for input fields
              dob: formatInputDate(data.data.page1.dob),
              addresses: data.data.page1.addresses.map((addr: any) => ({
                ...addr,
                from: formatInputDate(addr.from),
                to: formatInputDate(addr.to)
              })),
              licenses: data.data.page1.licenses.map((lic: any) => ({
                ...lic,
                licenseExpiry: formatInputDate(lic.licenseExpiry)
              })),
            },
          });
        }
        setLoading(false);
      } catch (e: any) {
        setError(
          e?.message || "An error occurred while loading the form."
        );
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = () => {
    // Not used — handled by ContinueButton
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto mt-10 p-4 text-center text-gray-600">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-10 p-4 bg-red-100 text-red-700 rounded">
        {error}
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form
        className="space-y-8"
        onSubmit={methods.handleSubmit(onSubmit)}
        noValidate
      >
        <PersonalDetails />
        <PlaceOfBirth />
        <LicenseSection />
        <AddressSection />
        <ContinueButton<ApplicationFormPage1Schema> config={page1Config} />
      </form>
    </FormProvider>
  );
}
