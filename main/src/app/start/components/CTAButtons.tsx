/**
 * Call-To-Action (CTA) Buttons Component — DriveDock
 *
 * Description:
 * Displays two primary action buttons for the landing page hero section:
 * - "Start Application" — Routes to the onboarding start information page.
 * - "Resume Application" — Opens a modal to allow drivers to resume an existing application.
 *
 * Key Components & Hooks:
 * - `useLanguageCycle`: Custom hook to cycle button text in multiple languages.
 * - `useMounted`: Prevents hydration mismatches by delaying rendering until client mount.
 * - `ResumeModal`: Modal component for resuming an application by entering SIN.
 * - `framer-motion` + `AnimatePresence`: Used for button hover/tap animations and smooth text transitions.
 *
 * Functionality:
 * - The "Start Application" button navigates directly to `/start/start-info-page`.
 * - The "Resume Application" button opens a modal (no routing).
 * - Animated text cycles every 2.5 seconds between translations using `useLanguageCycle`.
 * - Fallback static buttons are rendered before mounting to avoid hydration mismatch.
 *
 * Routing:
 * - Start Application → `/start/start-info-page`
 * - Resume Application → No route; modal opens in place.
 *
 * Author: Faruq Adebayo Atanda
 * Created: 2025-08-08
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLanguageCycle } from "@/hooks/useLanguageCycle";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useMounted from "@/hooks/useMounted";

import ResumeModal from "./ResumeModal";

export default function CTAButtons() {
  const router = useRouter();
  const animatedText = useLanguageCycle(2500); // Cycles text every 2.5s
  const [isModalOpen, setIsModalOpen] = useState(false); // Resume modal state
  const mounted = useMounted();

  // Render fallback static buttons before mounting to prevent hydration mismatch
  if (!mounted) {
    return (
      <>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="rounded-full bg-blue-700 px-6 py-3 text-white font-medium text-sm shadow">
            Start Application
          </div>
          <div className="rounded-full bg-white border border-blue-700 text-blue-700 px-6 py-3 font-medium text-sm shadow">
            Resume Application
          </div>
        </div>
        <ResumeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Start Application Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/start/start-info-page")}
          className="relative rounded-full bg-blue-700 px-6 py-3 text-white font-medium text-sm shadow hover:bg-blue-800 transition"
        >
          <span className="block relative">
            {/* Invisible placeholder to maintain button size across translations */}
            <span className="invisible">Commencer la demande</span>

            {/* Animated multilingual text */}
            <AnimatePresence mode="wait">
              <motion.span
                key={animatedText.start}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {animatedText.start}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.button>

        {/* Resume Application Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsModalOpen(true)} // Open resume modal
          className="relative rounded-full bg-white border border-blue-700 text-blue-700 px-6 py-3 font-medium text-sm shadow hover:bg-blue-50 transition"
        >
          <span className="block relative">
            <span className="invisible">Reprendre la demande</span>

            {/* Animated multilingual text */}
            <AnimatePresence mode="wait">
              <motion.span
                key={animatedText.resume}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {animatedText.resume}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.button>
      </div>

      {/* Resume Application Modal */}
      <ResumeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
