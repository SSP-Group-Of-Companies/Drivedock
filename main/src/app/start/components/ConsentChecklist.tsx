/**
 * Consent Checklist Component — DriveDock
 *
 * Description:
 * Displays a checklist of important points the applicant must read and understand
 * before starting the onboarding process. Each point is pulled from translations
 * to support multiple languages.
 *
 * Key Components & Hooks:
 * - `useTranslation`: Loads multilingual checklist items from `common.json`.
 * - `CheckCircle` (lucide-react): Icon used to indicate completed/required points.
 *
 * Functionality:
 * - Renders a vertical list of translated checklist items.
 * - Uses a consistent icon and spacing for visual clarity.
 * - No interactivity — purely informational.
 *
 * Routing:
 * This component is typically displayed on the onboarding start page (`/start`)
 * above the consent checkbox.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

import { CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

//components & hooks
import useMounted from "@/hooks/useMounted";

export default function ConsentChecklist() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  // Checklist items from translations
  const items = [
    t("start.checklist.accurateInfo"),
    t("start.checklist.digitalProcess"),
    t("start.checklist.consentChecks"),
    t("start.checklist.termsAgreement"),
  ];

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) return null;

  return (
    <ul className="space-y-3 mb-4">
      {items.map((text, index) => (
        <li key={index} className="flex items-start gap-3">
          {/* Blue checkmark icon */}
          <CheckCircle className="text-blue-500 mt-1" size={18} />

          {/* Checklist text */}
          <p className="text-sm text-gray-700">{text}</p>
        </li>
      ))}
    </ul>
  );
}
