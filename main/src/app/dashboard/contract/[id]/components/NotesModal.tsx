"use client";

import React from "react";
import { X } from "lucide-react";
import NotesCard from "./NotesCard";

import { useSafetyProcessing } from "@/hooks/dashboard/contract/useSafetyProcessing";

type Props = {
  trackerId: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function NotesModal({ trackerId, isOpen, onClose }: Props) {
  const { data: safetyData, mutate: safetyMutate } =
    useSafetyProcessing(trackerId);

  // Handle saving notes through the unified NotesCard
  const handleSaveNotes = async (notes: string) => {
    // Update the contract notes through safety processing if available
    if (safetyData && safetyMutate) {
      await safetyMutate.mutateAsync({ notes });
      onClose();
    } else {
      // TODO: If no safety data, we might need to update contract notes directly
      // This would require a different API endpoint or we could create a safety processing record
      console.warn("No safety processing data available for notes update");
      throw new Error("No safety processing data available for notes update");
    }
  };

  // Early return after all hooks
  if (!isOpen) return null;

  const currentNotes = safetyData?.onboardingContext?.notes || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose} // Close modal when clicking backdrop
    >
      <div
        className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
      >
        <div
          className="rounded-xl border shadow-2xl"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-outline)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 border-b"
            style={{ borderColor: "var(--color-outline)" }}
          >
            <h2 className="text-lg font-semibold">Contract Notes</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <NotesCard
              notes={currentNotes}
              onSave={handleSaveNotes}
              isModal={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}