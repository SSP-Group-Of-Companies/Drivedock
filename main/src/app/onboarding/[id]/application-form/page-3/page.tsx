// src/app/onboarding/[id]/application-form/page-3/page.tsx

"use client";

import { useForm, FormProvider } from "react-hook-form";
import ContinueButton from "@/app/onboarding/application-form/ContinueButton";
import { page3Config } from "@/lib/frontendConfigs/applicationFormConfigs/page3Config";

export default function Page3() {
  const methods = useForm({
    defaultValues: {
      emergencyContactName: "",
      emergencyContactPhone: "",
      birthPlace: "",
      citizenshipStatus: "",
    },
  });

  return (
    <FormProvider {...methods}>
      <main className="p-6">
        <h1 className="text-xl font-semibold mb-4">Page 3</h1>
        {/* form fields here */}
        <ContinueButton config={page3Config} />
      </main>
    </FormProvider>
  );
}
