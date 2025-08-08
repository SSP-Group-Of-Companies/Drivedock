/**
 * CompanyPage.tsx
 *
 * Purpose:
 * - Displays a list of SSP Group companies for applicants to choose from.
 * - Supports both standard "Apply Now" flow and special application flow requiring type selection (e.g., Flatbed / Dry Van).
 * - Integrates with Zustand store for global company selection.
 * - Routes users to the prequalification step after selection.
 *
 * Features:
 * - Responsive layout with separate grid rows for company cards.
 * - Modal for selecting application type (shown for specific companies).
 * - Uses i18n translations for multi-language support.
 * - Includes persistent Navbar, Footer, and Watermark background.
 */

"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { useCompanySelection } from "@/hooks/frontendHooks/useCompanySelection";

// Components
import Navbar from "@/components/shared/Navbar";
import WatermarkBackground from "@/components/shared/WatermarkBackground";
import CompanyCard from "@/app/start/company/components/CompanyCard";
import Footer from "@/components/shared/Footer";
import useMounted from "@/hooks/useMounted";

// Constants
import { COMPANIES, Company } from "@/constants/companies";

export default function CompanyPage() {
  const mounted = useMounted();
  const { t } = useTranslation("common");

  const router = useRouter();

  // Local state for Flatbed/Dry Van modal
  const [showModal, setShowModal] = useState(false);

  // Global Zustand store for selected company
  const { selectedCompany, setSelectedCompany } = useCompanySelection();

  /**
   * Handles standard "Apply Now" click.
   * Sets selected company in store, then navigates to Prequalifications page.
   */
  const handleApply = (company: Company) => {
    setSelectedCompany(company);
    router.push("/onboarding/prequalifications");
  };

  /**
   * Handles special "Apply Now" click for companies requiring a type selection.
   * Opens modal to select Flatbed or Dry Van before proceeding.
   */
  const handleSpecialApply = (company: Company) => {
    setSelectedCompany(company);
    setShowModal(true);
  };

  /**
   * Handles type selection inside modal (Flatbed / Dry Van).
   * Updates store with chosen type and navigates to Prequalifications page.
   */
  const handleModalSelect = (type: string) => {
    setShowModal(false);
    if (selectedCompany) {
      setSelectedCompany({ ...selectedCompany, type });
      router.push("/onboarding/prequalifications");
    }
  };

  // Layout grouping: first 2 companies in row 1, rest in row 2
  const firstRow = COMPANIES.slice(0, 2);
  const secondRow = COMPANIES.slice(2);

  // Prevent rendering until mounted to avoid hydration mismatch
  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50">
      {/* Top navigation */}
      <Navbar />

      {/* Main content */}
      <main className="relative flex-1 flex flex-col justify-between px-4 py-10">
        <WatermarkBackground />

        {/* Page heading */}
        <div className="max-w-5xl mx-auto w-full">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">
            {t("company.heading", "Join Our Family of Companies")}
          </h1>
          <p className="text-center text-gray-500 mb-10">
            {t(
              "company.subheading",
              "Choose the company where you want to build your driving career"
            )}
          </p>

          {/* First row: 2 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
            {firstRow.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onApply={handleApply}
                onSpecialApply={handleSpecialApply}
              />
            ))}
          </div>

          {/* Second row: 3 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {secondRow.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onApply={handleApply}
              />
            ))}
          </div>
        </div>

        {/* Modal for Flatbed/Drop Deck selection */}
        <Dialog
          open={showModal}
          onClose={() => setShowModal(false)}
          className="relative z-50"
        >
          {/* Modal overlay */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
          />
          {/* Modal panel */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              {/* Modal title */}
              <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
                {t("company.selectType", "Select Application Type")}
              </Dialog.Title>
              {/* Modal description */}
              <Dialog.Description className="text-sm text-gray-600 mb-4">
                {t(
                  "company.selectTypeDesc",
                  "Please choose the type of position you are applying for:"
                )}
              </Dialog.Description>

              {/* Action buttons */}
              <div className="flex flex-col gap-4">
                <button
                  className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 shadow hover:opacity-90 transition"
                  onClick={() => handleModalSelect("Flatbed")}
                >
                  {t("company.flatbed", "Flatbed")}
                </button>
                <button
                  className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 shadow hover:opacity-90 transition"
                  onClick={() => handleModalSelect("Dry Van")}
                >
                  {t("company.dropdeck", "Dry Van")}
                </button>
              </div>

              {/* Cancel button */}
              <button
                className="mt-6 w-full py-2 rounded-lg text-gray-600 border border-gray-300 hover:bg-gray-100 transition"
                onClick={() => setShowModal(false)}
              >
                {t("company.cancel", "Cancel")}
              </button>
            </Dialog.Panel>
          </div>
        </Dialog>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
