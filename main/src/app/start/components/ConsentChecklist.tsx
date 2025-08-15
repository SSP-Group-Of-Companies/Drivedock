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

//components & hooks
import useMounted from "@/hooks/useMounted";

export default function ConsentChecklist() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) return null;

  return (
    <div className="space-y-6 mb-6">
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Canada Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 text-center lg:text-left">
            Canada
          </h3>

          <div className="space-y-3">
            {/* Required Documents */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Required Documents:
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

            {/* Divider */}
            <div className="border-t border-gray-200 pt-3">
              <h4 className="text-sm font-medium text-gray-600 mb-2">
                Optional Documents:
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
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 text-center lg:text-left">
            USA
          </h3>

          <div className="space-y-3">
            {/* Required Documents */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Required Documents:
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
              </ul>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 pt-3">
              <h4 className="text-sm font-medium text-gray-600 mb-2">
                Optional Documents:
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
