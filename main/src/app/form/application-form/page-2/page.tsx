"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applicationFormPage2Schema,
  ApplicationFormPage2Schema,
} from "@/lib/zodSchemas/applicationFormPage2.schema";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";

// Components
import EmploymentSection from "./components/EmploymentSection";

export default function ApplicationFormPage2() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { tracker, setTracker } = useOnboardingTracker();
  const [submitting, setSubmitting] = useState(false);

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

  const onSubmit = async (values: ApplicationFormPage2Schema) => {
    try {
      setSubmitting(true);

      // Get SIN from tracker or from previous step
      let sin = tracker?.sin;

      // Fallback: If no tracker, try to get SIN from localStorage or previous step
      if (!sin) {
        // Try to get from localStorage (if user navigated back)
        const storedTracker = localStorage.getItem(
          "drivedock-onboarding-tracker"
        );
        if (storedTracker) {
          const parsedTracker = JSON.parse(storedTracker);
          sin = parsedTracker.state?.tracker?.sin;
        }
      }

      if (!sin) {
        alert("No SIN found. Please restart the application from Page 1.");
        return;
      }

      const res = await fetch(`/api/v1/forms/application-form/${sin}/page-2`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      // Update tracker with response data
      const responseData = await res.json();
      if (responseData?.data?.onboardingTracker) {
        // Update tracker using the store method
        setTracker(responseData.data.onboardingTracker);
      }

      router.push("/form/application-form/page-3");
    } catch (err) {
      console.error("Submission error:", err);
      alert("An error occurred while submitting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Check if form is valid for submission
  const isFormValid = true; // Always allow clicking, let Zod handle validation on submit

  return (
    <FormProvider {...methods}>
      <form
        className="space-y-8"
        onSubmit={methods.handleSubmit(onSubmit)}
        noValidate
      >
        <EmploymentSection />

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={submitting || !isFormValid}
            className={`px-8 py-2 mt-6 rounded-full font-semibold transition-colors shadow-md flex items-center gap-2
              ${
                submitting || !isFormValid
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90"
              }
            `}
          >
            {submitting ? t("form.submitting") : t("form.continue")}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
