"use client";

import { FormProvider, useForm } from "react-hook-form";

export default function PoliciesPage() {
  const methods = useForm({
    defaultValues: {}, // no values needed for now
  });

  return (
    <FormProvider {...methods}>
      <main className="max-w-2xl mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">Policies Acknowledgment</h1>
        <p className="text-gray-600 mb-8">
          This is a placeholder page. No policies are listed yet.
        </p>
      </main>
    </FormProvider>
  );
}
