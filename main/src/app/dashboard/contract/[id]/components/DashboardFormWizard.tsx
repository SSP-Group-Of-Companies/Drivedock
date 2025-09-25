"use client";

import { motion } from "framer-motion";
import type { ContractContext } from "@/lib/dashboard/api/contracts";
import { EStepPath } from "@/types/onboardingTracker.types";

type Props = {
  contractContext: ContractContext;
};

/** Convert a fine-grained step path to the 1..6/7 macro step used by the wizard. */
function toMacroStep(step?: EStepPath | null): number {
  switch (step) {
    case EStepPath.PRE_QUALIFICATIONS:
      return 1;
    case EStepPath.APPLICATION_PAGE_1:
    case EStepPath.APPLICATION_PAGE_2:
    case EStepPath.APPLICATION_PAGE_3:
    case EStepPath.APPLICATION_PAGE_4:
    case EStepPath.APPLICATION_PAGE_5:
      return 2;
    case EStepPath.POLICIES_CONSENTS:
      return 3;
    case EStepPath.DRIVE_TEST:
      return 4; // Drive Test is step 4
    case EStepPath.CARRIERS_EDGE_TRAINING:
      return 5; // Carriers Edge is step 5
    case EStepPath.DRUG_TEST:
      return 6;
    case EStepPath.FLATBED_TRAINING:
      return 7;
    default:
      return 0;
  }
}

/** 0/20/40/60/80/100% when on application-form pages; otherwise 0. */
function applicationConnectorPercent(step?: EStepPath | null): number {
  switch (step) {
    case EStepPath.APPLICATION_PAGE_1:
      return 20;
    case EStepPath.APPLICATION_PAGE_2:
      return 40;
    case EStepPath.APPLICATION_PAGE_3:
      return 60;
    case EStepPath.APPLICATION_PAGE_4:
      return 80;
    case EStepPath.APPLICATION_PAGE_5:
      return 100;
    default:
      return 0;
  }
}

export default function DashboardFormWizard({ contractContext }: Props) {
  const currentStep = contractContext.status?.currentStep;
  const isCompleted = contractContext.status?.completed;
  const activeMacro = toMacroStep(currentStep);
  const appPercent = applicationConnectorPercent(currentStep);
  
  const isInApplication =
    currentStep === EStepPath.APPLICATION_PAGE_1 ||
    currentStep === EStepPath.APPLICATION_PAGE_2 ||
    currentStep === EStepPath.APPLICATION_PAGE_3 ||
    currentStep === EStepPath.APPLICATION_PAGE_4 ||
    currentStep === EStepPath.APPLICATION_PAGE_5;

  // Default to 6 steps without context; add flatbed step when the app needs it
  const includeFlatbed = Boolean(contractContext?.needsFlatbedTraining);
  const totalSteps = includeFlatbed ? 7 : 6;
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="flex items-center w-full mb-4">
      <div className="w-full flex justify-center">
        <div className="flex flex-row items-center justify-between bg-white/80 shadow-sm rounded-xl py-2 px-2 mb-2 sm:bg-transparent sm:shadow-none sm:rounded-none sm:py-0 sm:px-0 sm:mb-0">
          <div className="flex-1 overflow-x-auto sm:overflow-visible">
            <div className="flex items-center gap-1 min-w-max sm:gap-2 sm:justify-center sm:min-w-0">
              {steps.map((n, idx) => {
                const isCurrent = activeMacro === n;
                const isStepCompleted = isCompleted || activeMacro > n;

                return (
                  <div key={n} className="relative flex items-center">
                    {/* Step circle */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-colors
                        ${isCurrent ? "bg-red-600 text-white" : isStepCompleted ? "bg-red-500 text-white" : "bg-gray-200 text-gray-600"}`}
                    >
                      {isStepCompleted ? (
                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        n
                      )}
                    </motion.div>

                    {/* Connector to next step */}
                    {n < totalSteps && (
                      <div className="relative w-4 sm:w-8 h-1 bg-gray-300 mx-0.5 sm:mx-1 rounded-full overflow-hidden">
                        {/* Full connectors strictly before the active macro step */}
                        {(isCompleted || activeMacro > n) && !(isInApplication && n === 2) && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="absolute top-0 left-0 h-full bg-red-500 rounded-full"
                          />
                        )}

                        {/* Partial fill for Application (macro step 2): 2→3 at 20..100% */}
                        {isInApplication && n === 2 && appPercent > 0 && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${appPercent}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="absolute top-0 left-0 h-full bg-red-500 rounded-full"
                          />
                        )}

                        {/* If already beyond macro step 2, ensure 2→3 is full */}
                        {!isInApplication && (isCompleted || activeMacro > 2) && n === 2 && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="absolute top-0 left-0 h-full bg-red-500 rounded-full"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
