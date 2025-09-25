"use client";

import clsx from "clsx";
import { useFormContext } from "react-hook-form";
import type { OnRoadWrapperInput } from "@/lib/zodSchemas/drive-test/onRoadAssessment.schema";

type Props = {
  isLocked: boolean;
  defaultCameFromOnboarding?: boolean; // true if you seeded from onboardingContext
};

export default function FlatbedTrainingCard({ isLocked, defaultCameFromOnboarding = false }: Props) {
  const { watch, setValue } = useFormContext<OnRoadWrapperInput>();
  const checked = Boolean(watch("onRoad.needsFlatbedTraining"));

  const toggle = () => {
    if (isLocked) return;
    setValue("onRoad.needsFlatbedTraining", !checked, { shouldDirty: true, shouldValidate: false });
  };

  return (
    <section className="rounded-2xl bg-white p-5 ring-1 ring-gray-200 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-gray-900">Flatbed Training</h3>
          <p className="text-sm text-gray-600">
            Decide whether this driver should complete <span className="font-medium">Flatbed Training</span> after the on-road assessment.
          </p>
        </div>

        {/* Toggle (accessible button) */}
        <button
          type="button"
          onClick={toggle}
          disabled={isLocked}
          aria-pressed={checked}
          aria-label="Toggle flatbed training requirement"
          className={clsx(
            "relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
            isLocked && "cursor-not-allowed opacity-60",
            checked ? "bg-emerald-500" : "bg-gray-300"
          )}
        >
          <span
            aria-hidden="true"
            className={clsx("pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200", checked ? "translate-x-5" : "translate-x-0.5")}
          />
        </button>
      </div>

      {/* Consequence / context messages */}
      <div className="mt-4 space-y-3">
        {defaultCameFromOnboarding && checked && (
          <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            This applicant is applying for <b>flatbed</b> and <b>does not have prior flatbed experience</b>, so training is pre-selected by default. You may uncheck if you determine training isn’t
            necessary.
          </div>
        )}

        {!checked && (
          <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Flatbed training is <b>not</b> required. Ensure the driver is otherwise qualified and your company policy permits skipping training.
          </div>
        )}

        {checked && !defaultCameFromOnboarding && (
          <div className="rounded-lg border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Flatbed training will be <b>added</b> to this driver’s onboarding plan.
          </div>
        )}
      </div>
    </section>
  );
}
