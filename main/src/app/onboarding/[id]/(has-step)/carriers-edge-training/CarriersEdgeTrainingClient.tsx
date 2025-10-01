"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useProtectedRouter } from "@/hooks/onboarding/useProtectedRouter";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { CheckCircle2, Award } from "lucide-react";

import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { ICarriersEdgeTraining } from "@/types/carriersEdgeTraining.types";
import { Confetti } from "@/components/shared";



export interface CarriersEdgeTrainingClientProps {
  carriersEdgeTraining: ICarriersEdgeTraining;
  onboardingContext: IOnboardingTrackerContext;
}

export default function CarriersEdgeTrainingClient({
  carriersEdgeTraining,
  onboardingContext,
}: CarriersEdgeTrainingClientProps) {
  const { t } = useTranslation("common");
  const router = useProtectedRouter();
  const [showConfetti, setShowConfetti] = useState(false);

  const { emailSent, completed } = carriersEdgeTraining;
  const { id: trackerId, nextStep, itemSummary } = onboardingContext;
  const email = itemSummary?.driverEmail;

  const handleContinue = useCallback(() => {
    if (nextStep) {
      router.push(`/onboarding/${trackerId}/${nextStep}`);
    }
  }, [router, trackerId, nextStep]);

  const contentBlock = useMemo(() => {
    if (completed) {
      // Show congratulations message with confetti
      if (!showConfetti) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }

      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          {/* Carrier's Edge Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center p-2"
          >
            <Image
              src="/assets/logos/ce-logo.png"
              alt="Carrier's Edge Logo"
              width={80}
              height={80}
              className="object-contain"
            />
          </motion.div>

          {/* Congratulations Message */}

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 max-w-2xl mx-auto">
            <h2 className="text-lg font-bold text-gray-800 pb-2">
              {t("form.step4.success.title")}
            </h2>
            <p className="text-sm text-green-800 max-w-2xl mx-auto">
              {t("form.step5.completed.message")}
            </p>
          </div>

          {/* Continue Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            onClick={handleContinue}
            className="px-8 py-3 bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white font-semibold rounded-full shadow-lg hover:opacity-90 transition-all duration-200 transform hover:scale-105"
          >
            {t("form.step5.completed.continueButton")}
          </motion.button>
        </motion.div>
      );
    }

    if (emailSent) {
      // Show email sent message
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          {/* Carrier's Edge Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center p-2"
          >
            <Image
              src="/assets/logos/ce-logo.png"
              alt="Carrier's Edge Logo"
              width={80}
              height={80}
              className="object-contain"
            />
          </motion.div>

          {/* Email Sent Message */}
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 max-w-3xl mx-auto text-left space-y-4">
              <div className="flex items-start gap-3">
                <p className="text-gray-700 text-sm">
                  Your Carrier edge training test credential has been sent to
                  your email @{" "}
                  <span className="text-blue-500 underline">
                    {email || "your email"}
                  </span>{" "}
                  please visit your email and follow the instruction to complete
                  your test.
                </p>
              </div>
            </div>
          </div>

          {/* Disabled Continue Button */}
          <div className="pt-4">
            <button
              disabled
              className="px-8 py-3 bg-gray-400 text-white font-semibold rounded-full cursor-not-allowed opacity-60"
            >
              {t("form.step5.button.next")}
            </button>
          </div>
        </motion.div>
      );
    }

    // Show initial instructions
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-6"
      >
        {/* Carrier's Edge Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center p-2"
        >
          <Image
            src="/assets/logos/ce-logo.png"
            alt="Carrier's Edge Logo"
            width={80}
            height={80}
            className="object-contain"
          />
        </motion.div>

        {/* Instructions */}
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 max-w-3xl mx-auto text-left space-y-4">
            <p className="text-gray-700 leading-relaxed text-sm text-center font-semibold">
              {t("form.step5.instructions.header")}{" "}
              <span className="text-blue-500 underline">
                {" "}
                {email || "your email"}
              </span>
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700 text-sm">
                  {t("form.step5.instructions.completionRequired")}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700 text-sm">
                  {t("form.step5.instructions.nextStepInfo")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Disabled Continue Button */}
        <div className="pt-4">
          <button
            disabled
            className="px-8 py-3 bg-gray-400 text-white font-semibold rounded-full cursor-not-allowed opacity-60"
          >
            {t("form.step5.button.next")}
          </button>
        </div>
      </motion.div>
    );
  }, [completed, emailSent, email, showConfetti, handleContinue, t]);

  return (
    <div className="space-y-6">
      {/* Confetti Effect */}
      <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>

      {contentBlock}
    </div>
  );
}
