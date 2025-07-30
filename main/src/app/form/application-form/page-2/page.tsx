"use client";

import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function ApplicationFormPage2() {
  const { t } = useTranslation("common");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("form.back")}
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Page 2! 🎉
          </h1>
          <p className="text-gray-600">
            Your Page 1 data has been successfully submitted.
          </p>
        </div>

        {/* Success Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl"></span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Form Submission Successful!
            </h2>
            <p className="text-gray-600 mb-6">
              Your application form data has been successfully submitted and
              saved. This is a placeholder page for Page 2 of the application
              form.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                What happens next?
              </h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Your data has been securely stored</li>
                <li>• Page 2 form components will be implemented here</li>
                <li>
                  • Additional validation and submission logic will be added
                </li>
              </ul>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push("/form/application-form/page-1")}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Page 1
              </button>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
