"use client";

/**
 * ===============================================================
 * FlatbedPopup Component
 * ---------------------------------------------------------------
 * Modal popup shown in Prequalification step when the user answers
 * the flatbed experience question.
 *
 * Displays contextual information based on whether the user answered
 * "yes" or "no" to flatbed experience.
 *
 * Props:
 * - type: "yes" | "no" — controls message content.
 * - onClose: callback to close the popup.
 *
 * Uses Headless UI Dialog and Framer Motion for accessible animation.
 * Text is fully internationalized via i18next under
 * `form.step1.questions.flatbedPopup` namespace.
 * ===============================================================
 */

import { Dialog } from "@headlessui/react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import useMounted from "@/hooks/useMounted";

type FlatbedPopupProps = {
  type: "yes" | "no";
  onClose: () => void;
};

export default function FlatbedPopup({ type, onClose }: FlatbedPopupProps) {
  const { t } = useTranslation("common");
  const mounted = useMounted();

  if (!mounted) return null;

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Centered Panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <Dialog.Title className="text-lg font-bold text-gray-900">
              {t("form.step1.questions.flatbedPopup.title")}
            </Dialog.Title>
            <Dialog.Description className="text-gray-700 text-sm">
              {t(`form.step1.questions.flatbedPopup.${type}`)}
            </Dialog.Description>

            <div className="text-right">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {t("form.step1.questions.flatbedPopup.ok")}
              </button>
            </div>
          </Dialog.Panel>
        </motion.div>
      </div>
    </Dialog>
  );
}
