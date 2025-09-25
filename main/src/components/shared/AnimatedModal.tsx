"use client";

import { Dialog } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { PropsWithChildren } from "react";

type AnimatedModalProps = PropsWithChildren<{
  isOpen: boolean;
  onClose: () => void;
  panelClassName?: string;
  overlayClassName?: string;
  containerClassName?: string;
}>;

/**
 * AnimatedModal — shared modal wrapper that replicates the AlertCircle modal animation
 * used in `onboarding/layout.tsx` (fade overlay + slide-up panel).
 */
export default function AnimatedModal({
  isOpen,
  onClose,
  children,
  panelClassName = "max-w-md w-full bg-white rounded-xl p-6 shadow-xl",
  overlayClassName = "fixed inset-0 bg-black/30",
  containerClassName = "fixed inset-0 flex items-center justify-center p-4",
}: AnimatedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={overlayClassName}
            aria-hidden="true"
            onClick={onClose}
          />

          <div className={containerClassName}>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Dialog.Panel className={panelClassName}>{children}</Dialog.Panel>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}


