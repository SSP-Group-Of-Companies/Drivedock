"use client";

import React from "react";
import { IFlatbedTraining } from "@/types/flatbedTraining.types";
import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

interface FlatbedTrainingContentProps {
  flatbedTraining: IFlatbedTraining | null;
  onboardingContext: IOnboardingTrackerContext;
  staged: Record<string, any>;
  onStage: (changes: any) => void;
  isEditMode: boolean;
}

export default function FlatbedTrainingContent({
  flatbedTraining,
  onboardingContext,
  staged,
  onStage,
  isEditMode,
}: FlatbedTrainingContentProps) {
  const applicable = Boolean(onboardingContext?.needsFlatbedTraining);
  const alreadyCompleted = Boolean(flatbedTraining?.completed);

  // Use staged value if available, otherwise use existing value
  const completed =
    staged.completed !== undefined ? staged.completed : alreadyCompleted;

  const handleToggleCompleted = () => {
    if (alreadyCompleted || !isEditMode) return;
    // Stage the change - this will trigger the save/discard bar to appear
    onStage({ completed: !completed });
  };

  return (
    <div className="space-y-4">
      {/* Flatbed Training Section Header */}
      <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: "var(--color-outline)" }}>
        <div 
          className="w-1 h-8 rounded-full"
          style={{ background: "var(--color-info)" }}
        />
        <h2 className="text-xl font-bold" style={{ color: "var(--color-on-surface)" }}>
          Flatbed Training
        </h2>
      </div>

      {/* Main card with toggle */}
      <section
        className="rounded-xl border p-4"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-outline)",
        }}
      >
        {/* Description and completion status */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p
              className="text-sm"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Mark the Driver Flatbed Training as completed when applicable.
            </p>
          </div>
          {completed && (
            <span
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: "var(--color-success-container)",
                color: "var(--color-success-on-container)",
              }}
            >
              Flatbed Training Completed
            </span>
          )}
        </div>
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
            Flatbed training is <strong>not applicable</strong> for this
            applicant.
          </div>
        ) : (
          <>
            {/* Toggle row */}
            <div
              className="flex items-center justify-between rounded-xl border p-3"
              style={{ borderColor: "var(--color-outline-variant)" }}
            >
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Completed</div>
                <div
                  className="text-xs"
                  style={{ color: "var(--color-on-surface-variant)" }}
                >
                  {alreadyCompleted
                    ? "Already completed — further changes are disabled."
                    : !isEditMode
                    ? "Enable edit mode to toggle completion status."
                    : "Turn on to confirm readiness, then save changes."}
                </div>
              </div>

              {/* Switch (accessible); locked when already completed or edit mode is off */}
              <button
                type="button"
                role="switch"
                aria-checked={completed}
                aria-disabled={alreadyCompleted || !isEditMode}
                onClick={handleToggleCompleted}
                disabled={alreadyCompleted || !isEditMode}
                className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors"
                style={{
                  background: completed
                    ? "var(--color-primary)"
                    : "var(--color-outline-variant)",
                  opacity: alreadyCompleted || !isEditMode ? 0.7 : 1,
                }}
                title={
                  alreadyCompleted
                    ? "Flatbed training already completed"
                    : !isEditMode
                    ? "Edit mode must be enabled to toggle"
                    : completed
                    ? "Turn off"
                    : "Turn on"
                }
              >
                <span
                  className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
                  style={{
                    boxShadow: "var(--elevation-1)",
                    transform: completed
                      ? "translateX(22px)"
                      : "translateX(2px)",
                  }}
                />
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
