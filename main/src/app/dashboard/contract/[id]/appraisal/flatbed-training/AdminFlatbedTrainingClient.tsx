// src/app/dashboard/contract/appraisal/[id]/flatbed-training/AdminFlatbedTrainingClient.tsx
"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import type { IFlatbedTraining } from "@/types/flatbedTraining.types";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { useEditMode } from "../../components/EditModeContext";

type Props = {
  trackerId: string;
  onboardingContext: IOnboardingTrackerContext;
  flatbedTraining: IFlatbedTraining | null;
};

export default function AdminFlatbedTrainingClient({ trackerId: trackerIdFromProps, onboardingContext, flatbedTraining }: Props) {
  const { id: trackerId } = useParams<{ id: string }>();
  const idToUse = trackerId ?? trackerIdFromProps;
  const { isEditMode } = useEditMode();

  const applicable = Boolean(onboardingContext?.needsFlatbedTraining);
  const alreadyCompleted = Boolean(flatbedTraining?.completed);

  // UI state
  const [completed, setCompleted] = useState<boolean>(alreadyCompleted);
  const [switchOn, setSwitchOn] = useState<boolean>(alreadyCompleted); // lock ON when completed
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null); // ephemeral success message

  const headerBadge = useMemo(() => {
    if (!completed) return null;
    return (
      <span
        className="rounded-full px-3 py-1 text-xs font-medium"
        style={{
          background: "var(--color-success-container)",
          color: "var(--color-success-on-container)",
        }}
      >
        Flatbed Training Completed
      </span>
    );
  }, [completed]);

  function toggleSwitch() {
    if (completed || busy || !isEditMode) return;
    setErr(null);
    setInfo(null);
    setSwitchOn((v) => !v);
  }

  async function handleComplete() {
    setErr(null);
    setInfo(null);

    setBusy(true);
    try {
      const res = await fetch(`/api/v1/admin/onboarding/${idToUse}/appraisal/flatbed-training`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ flatbedTraining: { completed: true } }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.message || json?.error || "Failed to mark flatbed training as completed.";
        setErr(msg);
        return;
      }

      // Success → lock completed, keep switch ON, hide button, show ephemeral success
      setCompleted(true);
      setSwitchOn(true);
      setInfo("Flatbed training completed.");
    } catch (e: any) {
      setErr(e?.message || "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Overview header with badge on the right */}
      <header
        className="rounded-xl border p-4 flex items-center justify-between"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-outline)",
        }}
      >
        <div>
          <h1 className="text-lg font-semibold">Flatbed Training</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Mark the applicant’s Flatbed Training as completed when applicable.
          </p>
        </div>
        {headerBadge}
      </header>

      {/* Core card */}
      <section
        className="rounded-xl border p-4"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-outline)",
        }}
      >
        {/* Not applicable state */}
        {!applicable ? (
          <div
            className="rounded-lg border p-3 text-sm"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-outline-variant)",
              color: "var(--color-on-surface)",
            }}
          >
            Flatbed training is <strong>not applicable</strong> for this applicant.
          </div>
        ) : (
          <>
            {/* Explanation */}
            <div className="mb-3 text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              Toggle the switch to enable completion. Submitting will finalize Flatbed Training and advance progress. This action is one-way.
            </div>

            {/* Toggle row */}
            <div className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: "var(--color-outline-variant)" }}>
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Completed</div>
                <div className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                  {completed 
                    ? "Already completed — further changes are disabled." 
                    : !isEditMode 
                    ? "Enable edit mode to toggle completion status."
                    : "Turn on to confirm readiness, then click Complete."
                  }
                </div>
              </div>

              {/* Switch (accessible); locked when already completed or edit mode is off */}
              <button
                type="button"
                role="switch"
                aria-checked={switchOn}
                aria-disabled={completed || busy || !isEditMode}
                onClick={toggleSwitch}
                disabled={completed || busy || !isEditMode}
                className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors"
                style={{
                  background: switchOn ? "var(--color-primary)" : "var(--color-outline-variant)",
                  opacity: completed || !isEditMode ? 0.7 : 1,
                }}
                title={
                  completed 
                    ? "Flatbed training already completed" 
                    : !isEditMode 
                    ? "Edit mode must be enabled to toggle"
                    : switchOn 
                    ? "Turn off" 
                    : "Turn on"
                }
              >
                <span
                  className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                  style={{
                    boxShadow: "var(--elevation-1)",
                    transform: switchOn ? "translateX(22px)" : "translateX(2px)",
                  }}
                />
              </button>
            </div>

            {/* Action button appears only when applicable, not completed, switch ON, and edit mode is ON */}
            {!completed && switchOn && isEditMode && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={busy}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: "var(--color-primary)" }}
                >
                  {busy ? "processing..." : "Complete Flatbed Training"}
                </button>
              </div>
            )}

            {/* Inline messages (ephemeral success; only this session) */}
            {info && (
              <div
                className="mt-3 rounded-lg border px-3 py-2 text-sm font-medium"
                style={{
                  background: "var(--color-success-container)",
                  color: "var(--color-success-on-container)",
                  borderColor: "var(--color-outline-variant)",
                }}
                role="status"
              >
                {info}
              </div>
            )}
            {err && (
              <div
                className="mt-3 rounded-lg border px-2 py-1 text-xs"
                style={{
                  borderColor: "var(--color-error)",
                  color: "var(--color-error)",
                }}
                role="alert"
              >
                {err}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
