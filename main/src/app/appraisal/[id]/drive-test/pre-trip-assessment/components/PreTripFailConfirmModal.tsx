"use client";

import { Dialog, DialogTitle, Description } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function PreTripFailConfirmModal({ open, onCancel, onConfirm }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <Dialog open onClose={onCancel} className="relative z-50">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/40" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-md rounded-lg shadow-xl overflow-hidden bg-white">
              <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="p-6">
                  <DialogTitle className="text-lg font-bold text-gray-900 mb-2">Confirm Failure & Termination</DialogTitle>
                  <Description className="text-sm text-gray-700">
                    You selected <strong>Fail</strong> for the <strong>Pre-Trip Assessment</strong>. Proceeding will
                    <strong> terminate the applicant’s onboarding</strong>. This action cannot be undone. Are you sure you want to continue?
                  </Description>

                  <div className="mt-6 flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold rounded-md border border-gray-300 hover:bg-gray-100">
                      Cancel
                    </button>
                    <button type="button" onClick={onConfirm} className="px-4 py-2 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-500">
                      Yes, terminate & submit
                    </button>
                  </div>
                </div>
              </motion.div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
