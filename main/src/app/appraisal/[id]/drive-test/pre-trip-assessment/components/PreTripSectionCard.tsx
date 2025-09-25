// src/app/appraisal/[id]/drive-test/pre-trip-assessment/components/PreTripSectionCard.tsx
import { PreTripWrapperInput } from "@/lib/zodSchemas/drive-test/preTripAssessment.schema";
import { useFormContext } from "react-hook-form";
import clsx from "clsx";

/* ---------- Section Renderer ---------- */
type SectionProps = {
  sectionKey: "underHood" | "outside" | "uncoupling" | "coupling" | "airSystem" | "inCab" | "backingUp";
  title: string;
  disabled?: boolean;
};

export default function PreTripSectionCard({ sectionKey, title, disabled }: SectionProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<PreTripWrapperInput>();

  const items = watch(`preTrip.sections.${sectionKey}.items`);

  // Extract any error object at the section path. Even if your schema
  // currently doesn't add section-specific rules, this future-proofs it.
  const sectionError = (errors?.preTrip?.sections as any)?.[sectionKey] as
    | {
        message?: string;
        key?: { message?: string };
        title?: { message?: string };
        items?: { message?: string } | Array<any>;
      }
    | undefined;

  // Pick the most relevant message to show:
  const sectionErrorMessage =
    sectionError?.message ||
    (sectionError?.items as any)?.message ||
    // If items is an array of field errors, find first message:
    (Array.isArray(sectionError?.items) ? sectionError?.items?.find?.((e: any) => !!e?.message)?.message : undefined) ||
    undefined;

  return (
    <section className={clsx("rounded-2xl bg-white p-5 ring-1 ring-gray-200 shadow-sm", sectionError && "ring-2 ring-red-400")} data-section={sectionKey}>
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items?.map((it: any, idx: number) => {
          const base = `preTrip.sections.${sectionKey}.items.${idx}` as const;

          // Try to fetch any item-level error (if schema adds constraints later)
          const itemError = (sectionError?.items && Array.isArray(sectionError.items) && (sectionError.items[idx] as any)?.message) || undefined;

          return (
            <label
              key={`${it.key}-${idx}`}
              className={clsx("group flex items-start gap-3 rounded-xl ring-1 ring-gray-200 bg-white p-3 shadow-sm transition hover:bg-gray-50", itemError && "ring-2 ring-red-400")}
            >
              <input type="checkbox" {...register(`${base}.checked`)} disabled={disabled} className="mt-1 h-4 w-4 shrink-0 rounded accent-blue-600" />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{it.label}</div>
                <input type="hidden" {...register(`${base}.key`)} />
                <input type="hidden" {...register(`${base}.label`)} />
                {itemError && <p className="mt-1 text-sm text-red-600">{itemError}</p>}
              </div>
            </label>
          );
        })}
      </div>

      {/* Hidden fields */}
      <input type="hidden" {...register(`preTrip.sections.${sectionKey}.key`)} />
      <input type="hidden" {...register(`preTrip.sections.${sectionKey}.title`)} />

      {/* Section-level message (if any) */}
      {sectionErrorMessage && <p className="mt-3 text-sm text-red-600">{sectionErrorMessage}</p>}
    </section>
  );
}
