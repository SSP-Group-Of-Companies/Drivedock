"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";

type Props = {
  trackerId: string;
  needsFlatbedTraining: boolean;
  canEdit: boolean;
  companyId: string;
  applicationType?: string;
  isEditMode: boolean;
  staged: Record<string, any>;
  onStage: (changes: any) => void;
  hasUnsavedChanges: boolean;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  isSubmitting: boolean;
  isApplicationCompleted: boolean;
};

export default function FlatbedTrainingToggle({
  trackerId,
  needsFlatbedTraining,
  canEdit,
  companyId,
  applicationType,
  isEditMode,
  staged,
  onStage,
  hasUnsavedChanges,
  onSave,
  onDiscard,
  isSubmitting,
  isApplicationCompleted,
}: Props) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Use staged value if available, otherwise use the original value
  const currentValue = staged.needsFlatbedTraining !== undefined ? staged.needsFlatbedTraining : needsFlatbedTraining;

  // Clear error when changes are no longer dirty
  useEffect(() => {
    if (!hasUnsavedChanges) setErrorMsg(null);
  }, [hasUnsavedChanges]);

  const handleToggle = () => {
    if (!canEdit || !isEditMode || isApplicationCompleted) return;
    setErrorMsg(null); // Clear any previous error
    onStage({ needsFlatbedTraining: !currentValue });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    try {
      setErrorMsg(null);
      await onSave();
      // Page will reload after successful save
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message ?? (typeof error === "string" ? error : null) ?? "Something went wrong while submitting. Please try again.";
      setErrorMsg(msg);
    }
  };

  const handleDiscard = () => {
    setErrorMsg(null);
    onDiscard();
  };

  // Parent component already checks if flatbed training is applicable
  // No need to check again here

  return (
    <section className="rounded-xl border p-4 flex flex-col gap-3" style={{ background: "var(--color-card)", borderColor: "var(--color-outline)" }}>
      {/* Completion Notice */}
      {isApplicationCompleted && (
        <div 
          className="rounded-lg border p-3 text-sm font-medium"
          style={{
            background: "var(--color-success-container, rgba(34, 197, 94, 0.08))",
            borderColor: "var(--color-success-border, rgba(34, 197, 94, 0.35))",
            color: "var(--color-success, #16a34a)"
          }}
        >
          ✅ Application completed - Flatbed training setting is locked
        </div>
      )}
      
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">Flatbed Training</h3>
          <p className="text-sm opacity-80">
            Decide whether this driver should complete <span className="font-medium">Flatbed Training</span> after the on-road assessment.
          </p>
        </div>

        {/* Toggle (accessible button) */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={!canEdit || !isEditMode || isApplicationCompleted}
          aria-pressed={currentValue}
          aria-label={isApplicationCompleted ? "Flatbed training setting is locked (application completed)" : "Toggle flatbed training requirement"}
          className={clsx(
            "relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
            (!canEdit || !isEditMode || isApplicationCompleted) && "cursor-not-allowed opacity-60",
            currentValue ? "bg-emerald-500" : "bg-gray-300"
          )}
        >
          <span
            aria-hidden="true"
            className={clsx(
              "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200",
              currentValue ? "translate-x-5" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      {/* Status message */}
      <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-outline-variant)" }}>
        <div className="text-sm">
          {currentValue ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-emerald-700">
                <strong>Flatbed Training is enabled.</strong> Step 7 (Flatbed Training) will be included in the onboarding flow.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-600">
                <strong>Flatbed Training is disabled.</strong> Step 7 (Flatbed Training) will not be included in the onboarding flow.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error message - only show when there's an error */}
      {errorMsg && hasUnsavedChanges && (
        <div 
          className="rounded-lg border p-3 text-sm font-medium"
          style={{
            background: "var(--color-error-container, rgba(220, 38, 38, 0.08))",
            borderColor: "var(--color-error-border, rgba(220, 38, 38, 0.35))",
            color: "var(--color-error, #b91c1c)"
          }}
          role="alert"
        >
          {errorMsg}
        </div>
      )}

      {/* Action buttons - only show when there are unsaved changes and app is not completed */}
      {hasUnsavedChanges && !isApplicationCompleted && (
        <div className="flex gap-2 justify-end pt-3 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
          <button
            type="button"
            onClick={handleDiscard}
            disabled={isSubmitting}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
            style={{ borderColor: "var(--color-outline)" }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-50"
            style={{ background: "var(--color-primary)" }}
          >
            {isSubmitting ? "Submitting…" : "Submit changes"}
          </button>
        </div>
      )}
    </section>
  );
}
