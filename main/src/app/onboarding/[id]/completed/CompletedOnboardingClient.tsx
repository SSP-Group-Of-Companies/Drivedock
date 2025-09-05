"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Home, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import useMounted from "@/hooks/useMounted";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { Confetti } from "@/components/shared";

export type CompletedOnboardingClientProps = {
  onboardingContext: IOnboardingTrackerContext;
};

export default function CompletedOnboardingClient({
  onboardingContext: _onboardingContext,
}: CompletedOnboardingClientProps) {
  const mounted = useMounted();
  const router = useRouter();
  const { t } = useTranslation("common");

  const [showConfetti, setShowConfetti] = useState(false);

  // Show confetti when component mounts
  useEffect(() => {
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleGoHome = useCallback(() => {
    router.push("/start");
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="relative">
      {/* Confetti Effect */}
      <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
        className="w-full"
      >
        {/* Main Card */}
        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden border border-green-200">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 w-20 h-20 bg-green-500 rounded-full"></div>
            <div className="absolute top-20 right-20 w-16 h-16 bg-blue-500 rounded-full"></div>
            <div className="absolute bottom-20 left-20 w-12 h-12 bg-yellow-500 rounded-full"></div>
            <div className="absolute bottom-10 right-10 w-24 h-24 bg-purple-500 rounded-full"></div>
          </div>

          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="relative z-10 mb-8"
          >
            <div className="mx-auto w-24 h-24 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
          </motion.div>

          {/* Congratulations Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 relative z-10"
          >
            {t("completion.title")}
          </motion.h1>

          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mb-8 relative z-10"
          >
            <p className="text-base text-gray-600 leading-relaxed mb-6">
              {t("completion.message")}
            </p>
          </motion.div>

          {/* Next Steps Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-6 mb-8 relative z-10"
          >
            <div className="flex items-center justify-center mb-4">
              <Star className="w-5 h-5 text-yellow-500 mr-2" />
              <h3 className="text-lg font-semibold text-gray-800">
                {t("completion.nextSteps.title")}
              </h3>
            </div>
            <p className="text-base text-gray-600 leading-relaxed">
              {t("completion.nextSteps.message")}
            </p>
          </motion.div>

          {/* Resume Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.6 }}
            className="mb-8 relative z-10"
          >
            <p className="text-sm text-gray-500 italic">
              {t("completion.resumeInfo")}
            </p>
          </motion.div>

          {/* Home Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.6 }}
            className="relative z-10"
          >
            <button
              onClick={handleGoHome}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-full shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 text-base"
            >
              <Home className="w-5 h-5 mr-2" />
              {t("completion.buttons.goHome")}
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
