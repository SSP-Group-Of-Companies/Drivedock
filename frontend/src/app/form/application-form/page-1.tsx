"use client";

import { useTranslation } from "react-i18next";

export default function ApplicationFormPage1() {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">
          Application Form - Page 1
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          This is the first page of the driver application form.
        </p>
      </div>
      
      {/* Placeholder content */}
      <div className="bg-gray-50 rounded-lg p-6">
        <p className="text-gray-600">
          Application form page 1 content will be implemented here.
        </p>
      </div>
    </div>
  );
}
