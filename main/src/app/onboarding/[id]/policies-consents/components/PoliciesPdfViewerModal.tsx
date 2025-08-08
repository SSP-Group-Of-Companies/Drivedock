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
                    <Dialog.Panel className="w-full max-w-3xl h-[calc(100vh-50px)] rounded-lg shadow-xl overflow-hidden flex flex-col">
                        <motion.div
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 30, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col h-full"
                        >
                            <div className="md:bg-white flex justify-end items-center p-2 shrink-0">
                                <button
                                    onClick={onClose}
                                    className="bg-red-500 text-white rounded-full w-10 h-10 md:w-6 md:h-6 flex items-center justify-center text-xs hover:bg-red-600 cursor-pointer"
                                >
                                    <X className="md:scale-[.8]" />
                                </button>
                            </div>
                            <div
                                className="overflow-y-auto flex-1 h-full bg-white"
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
