"use client";

import clsx from "clsx";
import { useFormContext } from "react-hook-form";
import { EDriveTestOverall, EExpectedStandard } from "@/types/driveTest.types";
import type { OnRoadWrapperInput } from "@/lib/zodSchemas/drive-test/onRoadAssessment.schema";
import FlatbedTrainingCard from "./FlatbedTrainingCard";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

type Props = {
  isLocked: boolean;
  showFlatbedToggle: boolean;
  onboardingContext: IOnboardingTrackerContext; // so we can craft the default info message
};

export default function OnRoadMetaFields({ isLocked, showFlatbedToggle, onboardingContext }: Props) {
  const {
    register,
    formState: { errors },
    watch,
  } = useFormContext<OnRoadWrapperInput>();

  const inputBase =
    "w-full rounded-lg bg-white px-3 py-2 ring-1 ring-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500";
  const selectBase = "w-full rounded-lg bg-white px-3 py-2 ring-1 ring-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:bg-gray-50 disabled:text-gray-500";
  const textareaBase =
    "w-full rounded-lg bg-white px-3 py-2 ring-1 ring-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500";

  const withError = (base: string, has?: boolean) => clsx(base, has && "ring-2 ring-red-400 focus:ring-red-400/70");

  const supNameErr = errors?.onRoad?.supervisorName?.message as string | undefined;
  const expectedStandardErr = errors?.onRoad?.expectedStandard?.message as string | undefined;
  const overallAssessmentErr = errors?.onRoad?.overallAssessment?.message as string | undefined;
  const commentsErr = errors?.onRoad?.comments?.message as string | undefined;
  const powerUnitTypeErr = errors?.powerUnitType?.message as string | undefined;
  const trailerTypeErr = errors?.trailerType?.message as string | undefined;

  // Detect whether the current checked value came from onboarding defaults:
  // If the field is true AND the onboardingContext also indicated needsFlatbedTraining,
  // we’ll show the “pre-selected by default” info line.
  const currentNeeds = Boolean(watch("onRoad.needsFlatbedTraining"));
  const defaultCameFromOnboarding = Boolean(onboardingContext?.needsFlatbedTraining) && currentNeeds;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor Name</label>
          <input type="text" {...register("onRoad.supervisorName")} disabled={isLocked} aria-invalid={!!supNameErr} className={withError(inputBase, !!supNameErr)} />
          {!!supNameErr && <p className="mt-1 text-sm text-red-600">{supNameErr}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Standard</label>
          <select {...register("onRoad.expectedStandard")} disabled={isLocked} aria-invalid={!!expectedStandardErr} className={withError(selectBase + " uppercase", !!expectedStandardErr)}>
            <option value="">Select Expected Standard</option>
            {Object.values(EExpectedStandard).map((v) => (
              <option key={v} value={v} className="uppercase">
                {v.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          {!!expectedStandardErr && <p className="mt-1 text-sm text-red-600">{expectedStandardErr}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Overall Assessment</label>
          <select {...register("onRoad.overallAssessment")} disabled={isLocked} aria-invalid={!!overallAssessmentErr} className={withError(selectBase + " uppercase", !!overallAssessmentErr)}>
            <option value="">Select Overall Assessment</option>
            {Object.values(EDriveTestOverall).map((v) => (
              <option key={v} value={v} className="uppercase">
                {v.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          {!!overallAssessmentErr && <p className="mt-1 text-sm text-red-600">{overallAssessmentErr}</p>}
        </div>
      </div>

      {/* Prominent Flatbed card */}
      {showFlatbedToggle && <FlatbedTrainingCard isLocked={isLocked} defaultCameFromOnboarding={defaultCameFromOnboarding} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Power Unit Type</label>
          <input type="text" {...register("powerUnitType")} disabled={isLocked} aria-invalid={!!powerUnitTypeErr} className={withError(inputBase, !!powerUnitTypeErr)} />
          {!!powerUnitTypeErr && <p className="mt-1 text-sm text-red-600">{powerUnitTypeErr}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Trailer Type</label>
          <input type="text" {...register("trailerType")} disabled={isLocked} aria-invalid={!!trailerTypeErr} className={withError(inputBase, !!trailerTypeErr)} />
          {!!trailerTypeErr && <p className="mt-1 text-sm text-red-600">{trailerTypeErr}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Miles / KMs Driven</label>
        <input
          type="number"
          {...register("onRoad.milesKmsDriven", { valueAsNumber: true })}
          disabled={isLocked}
          aria-invalid={!!errors?.onRoad?.milesKmsDriven?.message}
          className={withError(inputBase, !!errors?.onRoad?.milesKmsDriven?.message)}
        />
        {!!errors?.onRoad?.milesKmsDriven?.message && <p className="mt-1 text-sm text-red-600">{errors.onRoad.milesKmsDriven.message as string}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
        <textarea {...register("onRoad.comments")} disabled={isLocked} aria-invalid={!!commentsErr} className={withError(textareaBase, !!commentsErr)} rows={4} />
        {!!commentsErr && <p className="mt-1 text-sm text-red-600">{commentsErr}</p>}
      </div>
    </>
  );
}
