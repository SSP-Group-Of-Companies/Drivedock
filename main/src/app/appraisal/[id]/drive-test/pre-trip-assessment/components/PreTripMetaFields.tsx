"use client";

import clsx from "clsx";
import { useFormContext } from "react-hook-form";
import { EDriveTestOverall, EExpectedStandard } from "@/types/driveTest.types";
import type { PreTripWrapperInput } from "@/lib/zodSchemas/drive-test/preTripAssessment.schema";

export default function PreTripMetaFields({ isLocked }: { isLocked: boolean }) {
  const methods = useFormContext<PreTripWrapperInput>();
  const {
    register,
    formState: { errors },
  } = methods;

  const inputBase =
    "w-full rounded-lg bg-white px-3 py-2 ring-1 ring-gray-200 shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-400 " +
    "disabled:bg-gray-50 disabled:text-gray-500";
  const selectBase = "w-full rounded-lg bg-white px-3 py-2 ring-1 ring-gray-200 shadow-sm " + "focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:bg-gray-50 disabled:text-gray-500";
  const textareaBase =
    "w-full rounded-lg bg-white px-3 py-2 ring-1 ring-gray-200 shadow-sm " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-gray-400 " +
    "disabled:bg-gray-50 disabled:text-gray-500";

  const withErrorRing = (base: string, hasError?: boolean) => clsx(base, hasError && "ring-2 ring-red-400 focus:ring-red-400/70");

  const powerUnitTypeErr = errors?.powerUnitType?.message as string | undefined;
  const trailerTypeErr = errors?.trailerType?.message as string | undefined;
  const supNameErr = errors?.preTrip?.supervisorName?.message as string | undefined;
  const expectedStandardErr = errors?.preTrip?.expectedStandard?.message as string | undefined;
  const overallAssessmentErr = errors?.preTrip?.overallAssessment?.message as string | undefined;
  const commentsErr = errors?.preTrip?.comments?.message as string | undefined;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor Name</label>
          <input type="text" {...register("preTrip.supervisorName")} disabled={isLocked} aria-invalid={!!supNameErr} className={withErrorRing(inputBase, !!supNameErr)} />
          {!!supNameErr && <p className="mt-1 text-sm text-red-600">{supNameErr}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Standard</label>
          <select {...register("preTrip.expectedStandard")} disabled={isLocked} aria-invalid={!!expectedStandardErr} className={withErrorRing(selectBase + " uppercase", !!expectedStandardErr)}>
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
          <select {...register("preTrip.overallAssessment")} disabled={isLocked} aria-invalid={!!overallAssessmentErr} className={withErrorRing(selectBase + " uppercase", !!overallAssessmentErr)}>
            <option value="">Select Overall Assessment</option>
            {Object.values(EDriveTestOverall).map((v) => (
              <option key={v} value={v} className="uppercase">
                {v.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          {!!overallAssessmentErr && <p className="mt-1 text-sm text-red-600">{overallAssessmentErr}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Power Unit Type</label>
            <input type="text" {...register("powerUnitType")} disabled={isLocked} aria-invalid={!!powerUnitTypeErr} className={withErrorRing(inputBase, !!powerUnitTypeErr)} />
            {!!powerUnitTypeErr && <p className="mt-1 text-sm text-red-600">{powerUnitTypeErr}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trailer Type</label>
            <input type="text" {...register("trailerType")} disabled={isLocked} aria-invalid={!!trailerTypeErr} className={withErrorRing(inputBase, !!trailerTypeErr)} />
            {!!trailerTypeErr && <p className="mt-1 text-sm text-red-600">{trailerTypeErr}</p>}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
        <textarea {...register("preTrip.comments")} disabled={isLocked} aria-invalid={!!commentsErr} className={withErrorRing(textareaBase, !!commentsErr)} rows={4} />
        {!!commentsErr && <p className="mt-1 text-sm text-red-600">{commentsErr}</p>}
      </div>
    </>
  );
}
