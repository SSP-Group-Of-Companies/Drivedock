// src/app/onboarding/layout.tsx
"use client";

import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import CompanyLogoHeader from "@/components/shared/CompanyLogoHeader";
import FormWizardNav from "@/app/onboarding/components/FormWizardNav";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import LanguageDropdown from "@/components/shared/LanguageDropdown";

export default function FormLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const [showModal, setShowModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // ✅ Smart back navigation that preserves tracker ID
  const handleBackClick = () => {
    const trackerId = params.id as string;

    // If we're in onboarding with tracker ID, navigate to previous step
    if (trackerId && pathname.includes("/onboarding/")) {
      if (pathname.includes("/page-2")) {
        router.push(`/onboarding/${trackerId}/application-form/page-1`);
      } else if (pathname.includes("/page-1")) {
        router.push(`/onboarding/${trackerId}/prequalifications`);
      } else if (pathname.includes("/prequalifications")) {
        router.push("/start");
      } else {
        router.back(); // Fallback
      }
    } else {
      router.back(); // Fallback for other pages
    }
  };

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Step detection (simple mapping)
  const getCurrentStep = (): number => {
    if (pathname.includes("prequalifications")) return 1;
    if (pathname.includes("application-form")) return 2;
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
      {/* Hide navbar when scrolled */}
      <div className={isScrolled ? "hidden" : "block"}>
        <Navbar />
      </div>

      {/* Sticky Header - appears on scroll */}
      <AnimatePresence>
        {isScrolled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
              {/* Desktop Layout - Single Row */}
              <div className="hidden md:flex items-center justify-between w-full">
                <div className="flex items-center h-full">
                  {/* Company Logo */}
                  <div className="flex items-center">
                    <CompanyLogoHeader logoOnly />
                  </div>
                </div>

                {/* Form Wizard - centered */}
                <div className="flex-1 flex justify-center items-center">
                  <FormWizardNav currentStep={currentStep} totalSteps={6} />
                </div>

                {/* Language and Back Button */}
                <div className="flex items-center gap-2 ml-auto h-full">
                  <LanguageDropdown />
                  <button
                    onClick={handleBackClick}
                    className="ml-2 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white font-medium shadow hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-blue-300"
                    aria-label={t("navbar.back", "Go Back")}
                  >
                    <ArrowLeft size={18} />
                    <span className="hidden sm:inline">{t("navbar.back", "Back")}</span>
                  </button>
                </div>
              </div>

              {/* Mobile Layout - Two Rows */}
              <div className="md:hidden w-full">
                {/* First Row - Logo, Language, Back Button */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <CompanyLogoHeader logoOnly />
                  </div>
                  <div className="flex items-center gap-2">
                    <LanguageDropdown />
                    <button
                      onClick={handleBackClick}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white text-xs font-medium shadow hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-blue-300"
                      aria-label={t("navbar.back", "Go Back")}
                    >
                      <ArrowLeft size={14} />
                      <span className="hidden sm:inline">{t("navbar.back", "Back")}</span>
                    </button>
                  </div>
                </div>

                {/* Second Row - Form Wizard Only */}
                <div className="flex justify-center">
                  <FormWizardNav currentStep={currentStep} totalSteps={6} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative min-h-[calc(100vh-120px)] bg-gradient-to-b from-slate-50 via-sky-100 to-sky-200 px-4 py-6 sm:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-lg space-y-6 relative">
          {/* Info Icon: absolute top right */}
          <button
            onClick={() => setShowModal(true)}
            title={t("wizard.infoTitle")}
            className="absolute top-4 right-4 z-20 ml-2 flex-shrink-0 sm:ml-4 bg-white/80 rounded-full p-1 shadow hover:bg-white"
          >
            <AlertCircle className="text-gray-400 hover:text-gray-600 w-5 h-5" />
          </button>
          {/* Info Modal */}
          <AnimatePresence>
            {showModal && (
              <Dialog open={showModal} onClose={() => setShowModal(false)} className="relative z-50">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <DialogPanel className="max-w-md w-full bg-white rounded-xl p-6 shadow-xl space-y-4">
                      <DialogTitle className="text-lg font-bold text-gray-900">{t("wizard.modalTitle")}</DialogTitle>
                      <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                        {[1, 2, 3, 4, 5, 6].map((step) => (
                          <li key={step}>
                            <strong>{t(`wizard.step${step}.label`)}:</strong> {t(`wizard.step${step}.desc`)}
                          </li>
                        ))}
                      </ul>
                      <div className="text-right">
                        <button onClick={() => setShowModal(false)} className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                          {t("wizard.close")}
                        </button>
                      </div>
                    </DialogPanel>
                  </motion.div>
                </div>
              </Dialog>
            )}
          </AnimatePresence>
          {/* Company Logo */}
          <CompanyLogoHeader logoOnly />

          {/* Step Nav + Title */}
          <FormWizardNav currentStep={currentStep} totalSteps={6} />
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-800">{t(`form.step${currentStep}.title`)}</h1>
            <p className="text-sm text-gray-600">{t("form.subtitle")}</p>
          </div>

          {/* Page Content */}
          {children}
        </motion.div>
      </main>

      <Footer />
    </>
  );
}
