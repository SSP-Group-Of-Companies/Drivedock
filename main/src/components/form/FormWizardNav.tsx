"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

type FormWizardNavProps = {
  currentStep: number;
  totalSteps: number;
};

export default function FormWizardNav({ currentStep, totalSteps }: FormWizardNavProps) {
  const { t } = useTranslation("common");
  const [showModal, setShowModal] = useState(false);

  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="flex flex-col items-center mb-6 w-full">
      {/* Step Indicator + Info */}
      {/* Mobile: compact, scrollable; Desktop: original centered style */}
      <div className="w-full">
        <div className="flex flex-row items-center justify-between bg-white/80 shadow-sm rounded-xl py-2 px-2 mb-2 sm:bg-transparent sm:shadow-none sm:rounded-none sm:py-0 sm:px-0 sm:mb-0">
          <div className="flex-1 overflow-x-auto sm:overflow-visible">
            <div className="flex items-center gap-1 min-w-max sm:gap-2 sm:justify-center sm:min-w-0">
              {steps.map((step, index) => (
                <div key={step} className="relative flex items-center">
                  {/* Step Circle */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-colors
                      ${step === currentStep ? "bg-red-600 text-white" : "bg-gray-200 text-gray-600"}`}
                  >
                    {step}
                  </motion.div>
                  {/* Connecting Line */}
                  {index < steps.length - 1 && (
                    <div className="w-4 sm:w-8 h-1 bg-gray-300 mx-0.5 sm:mx-1 rounded-full" />
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Info Icon: right on mobile, right-aligned on desktop */}
          <button
            onClick={() => setShowModal(true)}
            title={t("wizard.infoTitle")}
            className="ml-2 flex-shrink-0 sm:ml-4"
          >
            <AlertCircle className="text-gray-400 hover:text-gray-600 w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {showModal && (
          <Dialog open={showModal} onClose={() => setShowModal(false)} className="relative z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30"
              aria-hidden="true"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Dialog.Panel className="max-w-md w-full bg-white rounded-xl p-6 shadow-xl space-y-4">
                  <Dialog.Title className="text-lg font-bold text-gray-900">
                    {t("wizard.modalTitle")}
                  </Dialog.Title>
                  <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                    {steps.map((step) => (
                      <li key={step}>
                        <strong>{t(`wizard.step${step}.label`)}:</strong>{" "}
                        {t(`wizard.step${step}.desc`)}
                      </li>
                    ))}
                  </ul>
                  <div className="text-right">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                    >
                      {t("wizard.close")}
                    </button>
                  </div>
                </Dialog.Panel>
              </motion.div>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
