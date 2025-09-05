"use client";

import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import dynamic from "next/dynamic";

const PdfViewerModal = dynamic(() => import("@/components/PdfViewerModal"), {
  ssr: false,
});

type Props = {
  modalUrl: string | null;
  onClose: () => void;
};

export default function PoliciesPdfViewerModal({ modalUrl, onClose }: Props) {
  if (!modalUrl) return null;

  return (
    <AnimatePresence>
      <Dialog open={true} onClose={onClose} className="relative z-50">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={{ duration: 0.2 }} 
          className="fixed inset-0 bg-black/40" 
          aria-hidden="true" 
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-4xl h-[calc(100vh-50px)] rounded-lg shadow-xl overflow-hidden flex flex-col" style={{
            background: "var(--color-surface)",
          }}>
            <motion.div 
              initial={{ y: 30, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: 30, opacity: 0 }} 
              transition={{ duration: 0.2 }} 
              className="flex flex-col h-full"
            >
              <div className="flex justify-between items-center p-4 shrink-0 border-b" style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
              }}>
                <h3 className="text-lg font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  Policy Document
                </h3>
                <button 
                  onClick={onClose} 
                  className="p-2 rounded-full transition-colors hover:bg-red-100" 
                  style={{ color: "var(--color-error)" }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div 
                className="overflow-y-auto flex-1 h-full" 
                style={{ background: "var(--color-surface)" }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <PdfViewerModal pdfUrl={modalUrl} />
              </div>
            </motion.div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </AnimatePresence>
  );
}
