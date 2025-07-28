"use client";

import { useTranslation } from "react-i18next";

export default function PoliciesConsentsPage() {

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">
          Policies and Consents
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          This page will contain company policies and consent forms.
        </p>
      </div>
      
      {/* Placeholder content */}
      <div className="bg-gray-50 rounded-lg p-6">
        <p className="text-gray-600">
          Policies and consents content will be implemented here.
        </p>
      </div>
    </div>
  );
}
