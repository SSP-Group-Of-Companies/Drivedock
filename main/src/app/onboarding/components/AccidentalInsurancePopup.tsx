"use client";

/**
 * ===============================================================
 * AccidentalInsurancePopup Component
 * ---------------------------------------------------------------
 * Modal popup shown in Application Form Page 4 when the user answers
 * the accidental benefit insurance coverage question.
 *
 * Displays information about SSP Truck Line's mandatory company
 * accident benefit insurance registration.
 *
 * Props:
 * - onClose: callback to close the popup.
 *
 * Uses Headless UI Dialog and Framer Motion for accessible animation.
 * Text is fully internationalized via i18next under
 * `form.step2.page4.accidentalInsurancePopup` namespace.
 * ===============================================================
 */

import { Dialog } from "@headlessui/react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import useMounted from "@/hooks/useMounted";

type AccidentalInsurancePopupProps = {
  onClose: () => void;
};

export default function AccidentalInsurancePopup({ onClose }: AccidentalInsurancePopupProps) {
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
          <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <Dialog.Title className="text-lg font-bold text-gray-900">
              {t("form.step2.page4.fields.accidentalInsurancePopup.title")}
            </Dialog.Title>
            <Dialog.Description className="text-gray-700 text-sm leading-relaxed">
              {t("form.step2.page4.fields.accidentalInsurancePopup.message")}
            </Dialog.Description>

            <div className="text-right">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {t("form.step2.page4.fields.accidentalInsurancePopup.ok")}
              </button>
            </div>
          </Dialog.Panel>
        </motion.div>
      </div>
    </Dialog>
  );
}
