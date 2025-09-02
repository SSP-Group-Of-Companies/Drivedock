"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Users, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTranslation } from "react-i18next";

import useMounted from "@/hooks/useMounted";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import type { IDriveTest } from "@/types/driveTest.types";
import { Confetti } from "@/components/shared";

export type DriveTestClientProps = {
  driveTest: Partial<IDriveTest>;
  onboardingContext: IOnboardingTrackerContext;
};

export default function DriveTestClient({ driveTest, onboardingContext }: DriveTestClientProps) {
  const mounted = useMounted();
  const router = useRouter();
  const { t } = useTranslation("common");

  const { id: trackerId, nextStep } = onboardingContext;
  const completed = driveTest.completed ?? false;
  const [showConfetti, setShowConfetti] = useState(false);

  // Show confetti when component mounts and drive test is completed
  useEffect(() => {
    if (completed) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [completed]);

  const handleContinue = useCallback(() => {
    if (nextStep) {
      router.push(`/onboarding/${trackerId}/${nextStep}`);
    }
  }, [router, trackerId, nextStep]);

  const contentBlock = useMemo(() => {
    if (completed) {
      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center space-y-6">
          {/* Congratulations Message */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 max-w-2xl mx-auto">
            <h2 className="text-lg font-bold text-gray-800 pb-2">{t("form.step4.success.title")}</h2>
            <p className="text-sm text-green-800 max-w-2xl mx-auto">{t("form.step4.success.message")}</p>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="px-8 py-3 bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white font-semibold rounded-full shadow-lg hover:opacity-90 transition-all duration-200 transform hover:scale-105"
          >
            {t("form.step4.success.continueButton")}
          </button>
        </motion.div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center space-y-6">
        {/* Drive Test Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center p-2"
        >
          <Image src="/assets/ssp-truck.png" alt="SSP Truck" width={80} height={80} className="object-contain" />
        </motion.div>

        {/* Instructions */}
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 max-w-3xl mx-auto text-left space-y-4">
            <p className="text-gray-700 leading-relaxed text-sm text-center font-semibold">{t("form.step4.instructions.header")}</p>

            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-gray-700 text-sm">{t("form.step4.instructions.contactSafety")}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700 text-sm">{t("form.step4.instructions.passMessage")}</p>
              </div>

              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700 text-sm">{t("form.step4.instructions.failMessage")}</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">{t("form.step4.instructions.note")}</p>
            </div>
          </div>
        </div>

        {/* Disabled Continue Button */}
        <div className="pt-4">
          <button disabled className="px-8 py-3 bg-gray-400 text-white font-semibold rounded-full cursor-not-allowed opacity-60">
            {t("form.step4.buttons.completeTest")}
          </button>
        </div>
      </motion.div>
    );
  }, [completed, handleContinue, t]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Confetti Effect */}
      <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>

      {contentBlock}
    </div>
  );
}
