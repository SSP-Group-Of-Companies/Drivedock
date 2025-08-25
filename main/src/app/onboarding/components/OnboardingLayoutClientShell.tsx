// src/app/onboarding/components/ClientOnboardingShell.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft } from "lucide-react";

import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import CompanyLogoHeader from "@/components/shared/CompanyLogoHeader";
import LanguageDropdown from "@/components/shared/LanguageDropdown";
import FormWizardNav from "@/app/onboarding/components/FormWizardNav";

import useMounted from "@/hooks/useMounted";
import { handleBackNavigation } from "@/lib/utils/onboardingUtils";
import { useOnboardingTrackerContext } from "@/app/providers/OnboardingTrackerContextProvider";
import { useActiveOnboardingStep } from "@/hooks/useActiveOnboardingStep";

export default function OnboardingLayoutClientShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const mounted = useMounted();
  const ctx = useOnboardingTrackerContext();
  const { pathname, activeMacro } = useActiveOnboardingStep();

  const [showModal, setShowModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Back navigation: use ctx (id + needsFlatbedTraining) and the current pathname
  const handleBackClick = useCallback(() => {
    const trackerId = ctx?.id || "";
    const needsFlatbedTraining = !!ctx?.needsFlatbedTraining;
    handleBackNavigation(pathname, trackerId, router, { needsFlatbedTraining });
  }, [pathname, router, ctx?.id, ctx?.needsFlatbedTraining]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!mounted) return null;

  // For the title, prefer the active macro step from the URL; fallback to 1 (prequalifications) if 0/unknown.
  const titleStep = activeMacro || 1;

  return (
    <>
      {/* Top navbar hidden on scroll */}
      <div className={isScrolled ? "hidden" : "block"}>
        <Navbar />
      </div>

      {/* Sticky Header on scroll */}
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
              {/* Desktop */}
              <div className="hidden md:flex items-center justify-between w-full">
                <div className="flex items-center h-full">
                  <CompanyLogoHeader logoOnly />
                </div>

                <div className="flex-1 flex justify-center items-center">
                  <FormWizardNav />
                </div>

                <div className="flex items-center gap-2 ml-auto h-full">
                  <LanguageDropdown />
                  <button
                    onClick={handleBackClick}
                    className="ml-2 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white font-medium shadow hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer active:translate-y-[1px] active:shadow"
                    aria-label={t("navbar.back", "Go Back")}
                  >
                    <ArrowLeft size={18} />
                    <span className="hidden sm:inline">{t("navbar.back", "Back")}</span>
                  </button>
                </div>
              </div>

              {/* Mobile */}
              <div className="md:hidden w-full">
                <div className="flex items-center justify-between mb-2">
                  <CompanyLogoHeader logoOnly />
                  <div className="flex items-center gap-2">
                    <LanguageDropdown />
                    <button
                      onClick={handleBackClick}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white text-xs font-medium shadow hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer active:translate-y-[1px] active:shadow"
                      aria-label={t("navbar.back", "Go Back")}
                    >
                      <ArrowLeft size={14} />
                      <span className="hidden sm:inline">{t("navbar.back", "Back")}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-center">
                  <FormWizardNav />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main body */}
      <main className="relative min-h-[calc(100vh-120px)] bg-gradient-to-b from-slate-50 via-sky-100 to-sky-200 px-4 py-6 sm:px-8">
        <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-lg space-y-6 relative">
          {/* Info icon */}
          <button
            onClick={() => setShowModal(true)}
            title={t("wizard.infoTitle")}
            className="absolute top-4 right-4 z-20 ml-2 flex-shrink-0 sm:ml-4 bg-white/80 rounded-full p-1 shadow hover:bg-white"
          >
            <AlertCircle className="text-gray-400 hover:text-gray-600 w-5 h-5" />
          </button>

          {/* Info modal */}
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
                            <strong>{t(`wizard.step${step}.label`)}</strong>: {t(`wizard.step${step}.desc`)}
                          </li>
                        ))}
                        {ctx?.needsFlatbedTraining && (
                          <li>
                            <strong>{t("wizard.step7.label", "Flatbed Training")}</strong>: {t("wizard.step7.desc", "Upload proof of training or complete the required sessions.")}
                          </li>
                        )}
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

          {/* Header + wizard */}
          <CompanyLogoHeader logoOnly />
          <FormWizardNav />

          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-800">{t(`form.step${titleStep}.title`)}</h1>
            <p className="text-sm text-gray-600">{t("form.subtitle")}</p>
          </div>

          {/* Page content */}
          {children}
        </div>
      </main>

      <Footer />
    </>
  );
}
