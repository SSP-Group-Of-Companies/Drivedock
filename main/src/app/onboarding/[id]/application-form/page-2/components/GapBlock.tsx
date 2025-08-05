"use client";

import { useFormContext, FieldErrors } from "react-hook-form";
import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";

interface Props {
  index: number;
  days: number;
}

export default function GapBlock({ index, days }: Props) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const field = `employments[${index}].gapExplanationBefore`;
  const employmentErrors =
    errors?.employments as FieldErrors<ApplicationFormPage2Schema>["employments"];
  const error = employmentErrors?.[index]?.gapExplanationBefore;

  return (
    <div className="border border-red-300 bg-red-50 p-4 rounded-md shadow-sm my-6">
      <p className="text-sm font-semibold text-red-800 mb-2">
        Gap of {days} days detected between employments. Please explain:
      </p>
      <textarea
        {...register(field)}
        data-field={field}
        rows={2}
        className="block w-full rounded-md border border-red-400 px-3 py-2 shadow-sm focus:outline-none focus:ring-red-400"
        placeholder="Please explain the gap in your employment history..."
      />
      {error && (
        <p className="text-red-600 text-sm mt-1">{error.message?.toString()}</p>
      )}
    </div>
  );
}
