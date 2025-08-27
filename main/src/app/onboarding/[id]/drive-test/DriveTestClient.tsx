"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Award, Users, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

import useMounted from "@/hooks/useMounted";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import type { IDriveTest } from "@/types/driveTest.types";

export type DriveTestClientProps = {
  driveTest: Partial<IDriveTest>;
  onboardingContext: IOnboardingTrackerContext;
};

// Simple confetti component using framer-motion
function Confetti() {
  const confettiPieces = Array.from({ length: 50 }, (_, i) => i);
  const colors = [
    "#ff6b6b",
    "#4ecdc4",
    "#45b7d1",
    "#96ceb4",
    "#feca57",
    "#ff9ff3",
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confettiPieces.map((i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: colors[i % colors.length],
            left: `${Math.random() * 100}%`,
            top: "-10px",
          }}
          initial={{ y: -10, x: 0, rotate: 0 }}
          animate={{
            y: window.innerHeight + 10,
            x: Math.random() * 200 - 100,
            rotate: 360,
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            ease: "easeOut",
            delay: Math.random() * 0.5,
          }}
        />
      ))}
    </div>
  );
}

export default function DriveTestClient({
  driveTest,
  onboardingContext,
}: DriveTestClientProps) {
  const mounted = useMounted();
  const router = useRouter();

  const trackerId = onboardingContext.id;
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
    if (completed) {
      // Navigate to the next step (carriers-edge-training)
      router.push(`/onboarding/${trackerId}/carriers-edge-training`);
    }
  }, [completed, router, trackerId]);

  const contentBlock = useMemo(() => {
    if (completed) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
          >
            <Award className="w-10 h-10 text-green-600" />
          </motion.div>

          {/* Congratulations Message */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">
              Congratulations! 🎉
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              You have successfully completed your Drive Test! Your driving
              skills have been evaluated and approved.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 max-w-2xl mx-auto">
              <p className="text-sm text-green-800">
                <strong>Next Step:</strong> You will now proceed to
                Carrier&apos;s Edge Training (Step 5) to complete your
                onboarding process.
              </p>
            </div>
          </div>

          {/* Continue Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            onClick={handleContinue}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold rounded-full shadow-lg hover:from-green-700 hover:to-green-600 transition-all duration-200 transform hover:scale-105"
          >
            Continue to Next Step
          </motion.button>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-6"
      >
        {/* Drive Test Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center p-2"
        >
          <Image
            src="/assets/ssp-truck.png"
            alt="SSP Truck"
            width={80}
            height={80}
            className="object-contain"
          />
        </motion.div>

        {/* Instructions */}
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 max-w-3xl mx-auto text-left space-y-4">
            <p className="text-gray-700 leading-relaxed">
              You have reached the Drive Test stage of the application process.
            </p>

            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-gray-700">
                <strong>
                  Please speak with Balkaran or Dixit to begin your test.
                </strong>
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700">
                  <strong>If you pass:</strong> You will proceed to Step 5
                  (Carrier&apos;s Edge Training).
                </p>
              </div>

              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-gray-700">
                  <strong>If you do not pass:</strong> Your application will be
                  terminated.
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Based on your performance, you may also
                be assigned Yard Training (Step 7) to further develop your
                driving skills. If you never had experience to begin with, then
                you will have Yard Training by default.
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
            Complete Drive Test to Continue
          </button>
        </div>
      </motion.div>
    );
  }, [completed, handleContinue]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Confetti Effect */}
      <AnimatePresence>{showConfetti && <Confetti />}</AnimatePresence>

      {contentBlock}
    </div>
  );
}
