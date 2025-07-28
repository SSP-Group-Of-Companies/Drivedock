"use client";

import { useTranslation } from "react-i18next";

export default function ApplicationFormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">
          Driver Application Form
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Complete your driver application.
        </p>
      </div>
      
      {children}
    </div>
  );
}
