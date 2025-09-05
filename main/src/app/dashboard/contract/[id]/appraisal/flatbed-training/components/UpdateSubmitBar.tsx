"use client";

import { useState } from "react";

type Props = Readonly<{
  dirty: boolean;
  busy?: boolean;
  onSubmit: () => Promise<void> | void;
  onDiscard?: () => void;
}>;

/**
 * Small sticky footer bar that activates when there are staged changes.
 * Automatically reloads the page after successful submission to show live updates.
 */
export default function UpdateSubmitBar({
  dirty,
  busy,
  onSubmit,
  onDiscard,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      await onSubmit();
      
      // Reload the page after successful submission to show live updates
      window.location.reload();
    } catch (error) {
      console.error("Submission failed:", error);
      // Don't reload on error, let the parent component handle the error
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="sticky bottom-0 z-30 mt-2 -mx-2 sm:mx-0" aria-live="polite">
      <div
        className="mx-2 rounded-xl border p-3 sm:flex sm:items-center sm:justify-between"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-outline)",
          boxShadow: "var(--elevation-2)",
          opacity: dirty ? 1 : 0.6,
        }}
      >
        <div
          className="text-sm"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          {dirty ? "You have unsaved changes." : "No changes to submit."}
        </div>

        <div className="mt-2 flex gap-2 sm:mt-0">
          {onDiscard ? (
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: "var(--color-outline)" }}
              onClick={onDiscard}
              disabled={!dirty || !!busy || isSubmitting}
            >
              Discard
            </button>
          ) : null}

          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-50"
            style={{
              background: "var(--color-primary)",
            }}
            onClick={handleSubmit}
            disabled={!dirty || !!busy || isSubmitting}
          >
            {busy || isSubmitting ? "Submitting…" : "Submit changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
