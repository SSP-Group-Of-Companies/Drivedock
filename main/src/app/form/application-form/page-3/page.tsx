"use client";

import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";

export default function ApplicationFormPage3() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { tracker, setTracker } = useOnboardingTracker();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methods = useFormContext<ApplicationFormPage2Schema>();

  const onSubmit = async (data: ApplicationFormPage2Schema) => {
    if (!tracker?.sin) {
      alert("No SIN found. Please restart the application from Page 1.");
      router.push("/form/application-form/page-1");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/v1/forms/application-form/${tracker.sin}/page-3`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();

      // Update tracker with response data if needed
      if (responseData.data?.onboardingTracker) {
        setTracker(responseData.data.onboardingTracker);
      }

      // Navigate to next page or completion
      router.push("/form/application-form/page-4");
    } catch (error) {
      console.error("Error submitting page 3:", error);
      alert("An error occurred while submitting the form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t("form.page3.title", "Application Form - Page 3")}
            </h1>
            <p className="text-gray-600">
              {t(
                "form.page3.subtitle",
                "Please complete the following information"
              )}
            </p>
          </div>

          <div className="space-y-8">
            {/* Page 3 content will go here */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-blue-800 mb-4">
                Page 3 - Coming Soon
              </h2>
              <p className="text-blue-700">
                This page is currently under development. The form submission
                will be implemented here.
              </p>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={() => router.push("/form/application-form/page-2")}
                className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() => onSubmit(methods.getValues())}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "Submitting..." : "Continue"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
