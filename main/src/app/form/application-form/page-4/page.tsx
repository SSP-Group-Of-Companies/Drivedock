"use client";

import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useOnboardingTracker } from "@/store/useOnboardingTracker";

export default function ApplicationFormPage4() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { tracker } = useOnboardingTracker();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t("form.page4.title", "Application Submitted Successfully!")}
            </h1>
            <p className="text-gray-600">
              {t(
                "form.page4.subtitle",
                "Thank you for completing your application"
              )}
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-green-800 mb-4">
                Application Complete
              </h2>
              <p className="text-green-700 mb-4">
                Your application has been successfully submitted. Our team will
                review your information and contact you soon.
              </p>

              {tracker?.sin && (
                <div className="bg-white border border-green-300 rounded-md p-4">
                  <p className="text-sm text-green-800">
                    <strong>Reference Number:</strong> {tracker.sin}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Please keep this reference number for your records.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-md font-semibold text-blue-800 mb-2">
                Next Steps
              </h3>
              <ul className="text-blue-700 text-sm space-y-2">
                <li>
                  • Our team will review your application within 24-48 hours
                </li>
                <li>• You will receive an email confirmation shortly</li>
                <li>
                  • We may contact you for additional information if needed
                </li>
                <li>
                  • You can track your application status using your reference
                  number
                </li>
              </ul>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-center pt-6">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
