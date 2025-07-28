// src/app/form/layout.tsx
"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CompanyLogoHeader from "@/components/shared/CompanyLogoHeader";
import FormWizardNav from "@/components/form/FormWizardNav";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

export default function FormLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common");
  const pathname = usePathname();

  // Step detection (simple mapping)
  const getCurrentStep = (): number => {
    if (pathname.includes("pre-qualification")) return 1;
    if (pathname.includes("driver-application")) return 2;
    if (pathname.includes("policies-consents")) return 3;
    if (pathname.includes("carrieredge-training")) return 4;
    if (pathname.includes("drive-test")) return 5;
    if (pathname.includes("drug-test")) return 6;
    if (pathname.includes("flatbed-training")) return 7;
    return 0;
  };

  const currentStep = getCurrentStep();

  return (
    <>
      <Navbar />

      <main className="relative min-h-screen bg-gradient-to-b from-slate-50 via-sky-100 to-sky-200 px-4 py-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-lg space-y-6"
        >
          {/* Company Logo */}
          <CompanyLogoHeader logoOnly />

          {/* Step Nav + Title */}
          <FormWizardNav currentStep={currentStep} totalSteps={6} />
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-800">{t(`form.step${currentStep}.title`)}</h1>
            <p className="text-sm text-gray-600">
              {t("form.subtitle")}
            </p>
          </div>

          {/* Page Content */}
          {children}
        </motion.div>
      </main>

      <Footer />
    </>
  );
}
