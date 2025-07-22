"use client";
import Navbar from "@/components/Navbar";
import { COMPANIES, Company } from "@/constants/companies";
import CompanyCard from "@/components/start/CompanyCard";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Footer from "@/components/Footer";
import { useState } from "react";
import { Dialog } from "@headlessui/react";
import WatermarkBackground from "@/components/WatermarkBackground";

export default function CompanyPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const handleApply = (company: Company) => {
    router.push(`/start/apply?company=${company.id}`);
  };

  const handleSpecialApply = (company: Company) => {
    setSelectedCompany(company);
    setShowModal(true);
  };

  const handleModalSelect = (type: string) => {
    setShowModal(false);
    if (selectedCompany) {
      router.push(`/start/apply?company=${selectedCompany.id}&type=${type}`);
    }
  };

  // Split companies for custom rows
  const firstRow = COMPANIES.slice(0, 2);
  const secondRow = COMPANIES.slice(2);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50">
      <Navbar />
      <main className="relative flex-1 flex flex-col justify-between px-4 py-10">
        <WatermarkBackground />
        <div className="max-w-5xl mx-auto w-full">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">
            {t("company.heading", "Join Our Family of Companies")}
          </h1>
          <p className="text-center text-gray-500 mb-10">
            {t("company.subheading", "Choose the company where you want to build your driving career")}
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
              <CompanyCard key={company.id} company={company} onApply={handleApply} />
            ))}
          </div>
        </div>
        {/* Modal for Flatbed/Drop Deck selection */}
        <Dialog open={showModal} onClose={() => setShowModal(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
                {t("company.selectType", "Select Application Type")}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-gray-600 mb-4">
                {t("company.selectTypeDesc", "Please choose the type of position you are applying for:")}
              </Dialog.Description>
              <div className="flex flex-col gap-4">
                <button
                  className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 shadow hover:opacity-90 transition"
                  onClick={() => handleModalSelect("flatbed")}
                >
                  {t("company.flatbed", "Flatbed")}
                </button>
                <button
                  className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 shadow hover:opacity-90 transition"
                  onClick={() => handleModalSelect("dropdeck")}
                >
                  {t("company.dropdeck", "Drop Deck")}
                </button>
              </div>
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
      <Footer />
    </div>
  );
} 