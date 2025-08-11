"use client";

import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import AnimatedModal from "./AnimatedModal";

interface FormHelpPopUpsProps {
  content: string;
  className?: string;
}

export default function FormHelpPopUps({ content, className = "" }: FormHelpPopUpsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      {/* Question Mark Icon */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ${className}`}
        aria-label="Help information"
      >
        <HelpCircle size={16} />
      </button>

      <AnimatedModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        panelClassName="relative w-[min(92vw,640px)] max-h-[80vh] overflow-auto rounded-2xl bg-white p-5 shadow-2xl border border-gray-200"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close help popup"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-sm leading-6 text-gray-800 whitespace-pre-line">
          {content}
        </div>
      </AnimatedModal>
    </div>
  );
}
