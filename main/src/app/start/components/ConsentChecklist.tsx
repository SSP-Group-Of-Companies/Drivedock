/**
 * Consent Checklist Component — DriveDock
 *
 * Description:
 * Displays a two-column checklist of required documents for Canada and USA applicants.
 * Each section shows required and optional documents with proper visual separation.
 *
 * Key Components & Hooks:
 * - `useTranslation`: Loads multilingual checklist items from `common.json`.
 * - `CheckCircle` (lucide-react): Icon used to indicate completed/required points.
 *
 * Functionality:
 * - Renders a responsive two-column layout (Canada & USA).
 * - Shows required documents and optional documents with divider.
 * - Uses consistent icons and spacing for visual clarity.
 * - Responsive design that adapts to different screen sizes.
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
import Image from "next/image";

//components & hooks
import useMounted from "@/hooks/useMounted";

export default function ConsentChecklist() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) return null;

  return (
    <div className="space-y-6 mb-6">
      {/* Two Column Layout with better visual balance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Canada Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-center mb-4">
            <div className="overflow-hidden ">
              <Image
                src="/assets/logos/canadaFlag.png"
                alt="Canada Flag"
                width={50}
                height={50}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Canada</h3>
          </div>

          <div className="space-y-4">
            {/* Required Documents */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">
                {t("start.docs.RequiredDocuments")}
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-blue-500 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-700">
                    {t("start.CanadaDocChecklist.driverLicense")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-blue-500 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-700">
                    {t("start.CanadaDocChecklist.SINnumber")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-blue-500 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-700">
                    {t("start.CanadaDocChecklist.healthCard")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-blue-500 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-700">
                    {t("start.CanadaDocChecklist.Passport")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-blue-500 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-700">
                    {t("start.CanadaDocChecklist.visa")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-blue-500 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-700">
                    {t("start.CanadaDocChecklist.permit")}
                  </span>
                </li>
              </ul>
            </div>

            {/* Optional Documents */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-600">
                {t("start.docs.OptionalDocuments")}
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-gray-400 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-600">
                    {t("start.CanadaDocChecklist.fastCard")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-gray-400 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-600">
                    {t("start.CanadaDocChecklist.IncorporateDocuments")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-gray-400 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-600">
                    {t("start.CanadaDocChecklist.bankingInfo")}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* USA Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-center mb-4">
            <div className="overflow-hidden">
              <Image
                src="/assets/logos/AmericaFlag.png"
                alt="USA Flag"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">USA</h3>
          </div>

          <div className="space-y-4">
            {/* Required Documents */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">
                {t("start.docs.RequiredDocuments")}
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-blue-500 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-700">
                    {t("start.USAChecklist.driverLicense")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-blue-500 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-700">
                    {t("start.USAChecklist.SSNnumber")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-blue-500 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-700">
                    {t("start.USAChecklist.healthCard")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-blue-500 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-700">
                    {t("start.USAChecklist.Passport")}
                  </span>
                </li>
                {/* Invisible placeholders to align with Canada's 6 items */}
                <li className="invisible h-5"></li>
                <li className="invisible h-5"></li>
              </ul>
            </div>

            {/* Optional Documents */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-600">
                {t("start.docs.OptionalDocuments")}
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-gray-400 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-600">
                    {t("start.USAChecklist.IncorporateDocuments")}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle
                    className="text-gray-400 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <span className="text-sm text-gray-600">
                    {t("start.USAChecklist.bankingInfo")}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
