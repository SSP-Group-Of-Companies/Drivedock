"use client";

import { motion } from "framer-motion";

type FormWizardNavProps = {
  currentStep: number;
  totalSteps: number;
};

export default function FormWizardNav({
  currentStep,
  totalSteps,
}: FormWizardNavProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);
  return (
    <div className="flex items-center w-full">
      {/* Step Indicator */}
      <div className="w-full flex justify-center">
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
                      ${
                        step === currentStep
                          ? "bg-red-600 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
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
        </div>
      </div>
    </div>
  );
}
