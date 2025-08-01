"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

type FormWizardNavProps = {
  currentStep: number;
  totalSteps: number;
};

export default function FormWizardNav({
  currentStep,
  totalSteps,
}: FormWizardNavProps) {
  const pathname = usePathname();
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  // Special handling for application form (stage 2)
  const getApplicationFormProgress = () => {
    if (pathname.includes("application-form/page-1")) return 20;
    if (pathname.includes("application-form/page-2")) return 40;
    if (pathname.includes("application-form/page-3")) return 60;
    if (pathname.includes("application-form/page-4")) return 80;
    if (pathname.includes("application-form/page-5")) return 100;
    return 20; // default for application-form
  };

  const isApplicationForm = currentStep === 2;
  const applicationProgress = getApplicationFormProgress();

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
                          : step < currentStep
                          ? "bg-red-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                  >
                    {step < currentStep ? (
                      <svg
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      step
                    )}
                  </motion.div>

                  {/* Connecting Line */}
                  {index < steps.length - 1 && (
                    <div className="relative w-4 sm:w-8 h-1 bg-gray-300 mx-0.5 sm:mx-1 rounded-full overflow-hidden">
                      {/* Progress fill for application form */}
                      {isApplicationForm && step === 2 && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${applicationProgress}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="absolute top-0 left-0 h-full bg-red-500 rounded-full"
                        />
                      )}
                      {/* Progress fill for other steps */}
                      {!isApplicationForm && step < currentStep && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="absolute top-0 left-0 h-full bg-green-500 rounded-full"
                        />
                      )}
                    </div>
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
