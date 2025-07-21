"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLanguageCycle } from "@/hooks/useLanguageCycle";
import { useRouter } from "next/navigation";
import { useState } from "react";

import ResumeModal from "./ResumeModal";

export default function CTAButtons() {
  const router = useRouter();
  const animatedText = useLanguageCycle(2500);
  const [isModalOpen, setIsModalOpen] = useState(false); // modal state

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Start Application */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push("/start")}
          className="relative rounded-full bg-blue-700 px-6 py-3 text-white font-medium text-sm shadow hover:bg-blue-800 transition"
        >
          <span className="block relative">
            <span className="invisible">Commencer la demande</span>

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

        {/* Resume Application */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsModalOpen(true)} // open modal instead of routing
          className="relative rounded-full bg-white border border-blue-700 text-blue-700 px-6 py-3 font-medium text-sm shadow hover:bg-blue-50 transition"
        >
          <span className="block relative">
            <span className="invisible">Reprendre la demande</span>

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

      {/* Modal Component */}
      <ResumeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
