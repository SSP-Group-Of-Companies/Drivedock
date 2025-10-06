"use client";

import { useEffect, useState } from "react";

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
export default function UpdateSubmitBar({ dirty, busy, onSubmit, onDiscard }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clear error when changes are no longer dirty
  useEffect(() => {
    if (!dirty) setErrorMsg(null);
  }, [dirty]);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null); // clear any previous error before a new attempt
      await onSubmit();

      // Reload the page after successful submission to show live updates
      window.location.reload();
    } catch (error: unknown) {
      const msg = (error as { message?: string })?.message ?? (typeof error === "string" ? error : null) ?? "Something went wrong while submitting. Please try again.";
      setErrorMsg(msg);
      // Don't reload on error, let the parent component handle the error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    setErrorMsg(null);
    onDiscard?.();
  };

  const isDisabled = !dirty || !!busy || isSubmitting;

  return (
    <div className="sticky bottom-0 z-30 mt-2 -mx-2 sm:mx-0" aria-live="polite">
      <div
        className="mx-2 rounded-xl border p-3 sm:flex sm:items-center sm:justify-between"
        style={{
          background: errorMsg ? "var(--color-error-container, rgba(220, 38, 38, 0.08))" : "var(--color-surface)",
          borderColor: errorMsg ? "var(--color-error-border, rgba(220, 38, 38, 0.35))" : "var(--color-outline)",
          boxShadow: "var(--elevation-2)",
          opacity: dirty ? 1 : 0.6,
        }}
      >
        <div
          className="text-sm"
          style={{
            color: errorMsg ? "var(--color-error, #b91c1c)" : "var(--color-on-surface-variant)",
            fontWeight: errorMsg ? 600 : 400,
          }}
          role={errorMsg ? "alert" : undefined}
        >
          {errorMsg ? errorMsg : dirty ? "You have unsaved changes." : "No changes to submit."}
        </div>

        <div className="mt-2 flex gap-2 sm:mt-0">
          {onDiscard ? (
            <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: "var(--color-outline)" }} onClick={handleDiscard} disabled={isDisabled}>
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
            disabled={isDisabled}
          >
            {busy || isSubmitting ? "Submitting…" : "Submit changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
