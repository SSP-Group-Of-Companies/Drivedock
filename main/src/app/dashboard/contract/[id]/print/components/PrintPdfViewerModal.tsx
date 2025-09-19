"use client";

import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";
import dynamic from "next/dynamic";
import type { LoadStrategy } from "@/components/pdf-viewer/PdfViewer";

const PdfViewer = dynamic(() => import("@/components/pdf-viewer/PdfViewer"), {
  ssr: false, // ensure client-only (pdfjs needs DOM)
});

type Props = {
  modalUrl: string | null;
  onClose: () => void;
  /** Optional: pass through to viewer; default "auto" */
  strategy?: LoadStrategy;
};

export default function PrintPdfViewerModal({ modalUrl, onClose, strategy = "auto" }: Props) {
  if (!modalUrl) return null;

  const handleDownload = () => {
    window.open(modalUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      <Dialog open={true} onClose={onClose} className="relative z-50">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-4xl h-[calc(100vh-50px)] rounded-lg shadow-xl overflow-hidden flex flex-col" style={{ background: "var(--color-surface)" }}>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col h-full min-h-0">
              <div className="flex justify-between items-center p-4 shrink-0 border-b" style={{ background: "var(--color-surface)", borderColor: "var(--color-outline)" }}>
                <h3 className="text-lg font-semibold" style={{ color: "var(--color-on-surface)" }}>
                  Document Preview
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  <button onClick={onClose} className="p-2 rounded-full transition-colors hover:bg-red-100" style={{ color: "var(--color-error)" }}>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Scroll area; viewer handles its own centered error/loading */}
              <div className="flex-1 h-full min-h-0 overflow-y-auto" style={{ background: "var(--color-surface)" }} onContextMenu={(e) => e.preventDefault()}>
                <PdfViewer pdfUrl={modalUrl} strategy={strategy} />
              </div>
            </motion.div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </AnimatePresence>
  );
}
