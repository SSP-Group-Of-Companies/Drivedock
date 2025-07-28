"use client";

import { CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ConsentChecklist() {
  const { t } = useTranslation("common");

  const items = [
    t("start.checklist.accurateInfo"),
    t("start.checklist.digitalProcess"),
    t("start.checklist.consentChecks"),
    t("start.checklist.termsAgreement")
  ];

  return (
    <ul className="space-y-3 mb-4">
      {items.map((text, index) => (
        <li key={index} className="flex items-start gap-3">
          <CheckCircle className="text-blue-500 mt-1" size={18} />
          <p className="text-sm text-gray-700">{text}</p>
        </li>
      ))}
    </ul>
  );
}
