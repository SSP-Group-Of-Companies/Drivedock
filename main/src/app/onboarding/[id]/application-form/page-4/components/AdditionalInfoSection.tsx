"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import useMounted from "@/hooks/useMounted";
import { ApplicationFormPage4Schema } from "@/lib/zodSchemas/applicationFormPage4.Schema";

function YesNo<K extends "deniedLicenseOrPermit" | "suspendedOrRevoked" | "testedPositiveOrRefused" | "completedDOTRequirements" | "hasAccidentalInsurance">({
  name,
  label,
}: {
  name: K;
  label: string;
}) {
  const { register } = useFormContext<ApplicationFormPage4Schema>();

  // Coerce string -> boolean for radio group
  const opts = register(name, {
    setValueAs: (v) => v === "true", // RHF v7 way to coerce
  });

  return (
    <div className="flex items-center justify-between border rounded-md px-3 py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex gap-3">
        <label className="inline-flex items-center gap-1 text-sm">
          <input type="radio" value="true" {...opts} />
          Yes
        </label>
        <label className="inline-flex items-center gap-1 text-sm">
          <input type="radio" value="false" {...opts} />
          No
        </label>
      </div>
    </div>
  );
}

export default function AdditionalInfoSection() {
  const { t } = useTranslation("common");
  const mounted = useMounted();
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ApplicationFormPage4Schema>();

  const suspended = useWatch({ control, name: "suspendedOrRevoked" });

  if (!mounted) return null;

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white shadow-sm">
      <h2 className="text-center text-lg font-semibold text-gray-800">{t("form.step2.page4.sections.additionalInfo.title", "Additional Info")}</h2>

      <div className="space-y-3">
        <YesNo name="deniedLicenseOrPermit" label={t("form.step2.page4.fields.denied", "Have you ever been denied a license, permit or privilege to operate a motor vehicle?")} />
        <YesNo name="suspendedOrRevoked" label={t("form.step2.page4.fields.suspended", "Has any license, permit or privilege ever been suspended or revoked?")} />
        {suspended === true && (
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.suspensionNotes", "Notes")}</label>
            <textarea
              {...register("suspensionNotes")}
              rows={3}
              className="w-full mt-1 rounded-md border-gray-300 focus:ring-sky-500"
              data-field="suspensionNotes"
              placeholder={t("form.placeholders.optionalDetails", "Provide details...")}
            />
            {errors.suspensionNotes && <p className="text-red-500 text-xs mt-1">{errors.suspensionNotes.message?.toString()}</p>}
          </div>
        )}
        <YesNo name="testedPositiveOrRefused" label={t("form.step2.page4.fields.testedPositive", "Have you ever tested positive, or refused to test, on any pre-employment drug or alcohol test?")} />
        <YesNo name="completedDOTRequirements" label={t("form.step2.page4.fields.completedDOT", "If yes, can you provide proof that you successfully completed DOT return-to-duty requirements?")} />
        <YesNo name="hasAccidentalInsurance" label={t("form.step2.page4.fields.hasInsurance", "Do you have your own Accidental Benefit Insurance Coverage?")} />
      </div>

      {/* Top-level boolean errors (if any) */}
      <div className="space-y-1">
        {(["deniedLicenseOrPermit", "suspendedOrRevoked", "testedPositiveOrRefused", "completedDOTRequirements", "hasAccidentalInsurance"] as const).map((k) =>
          (errors as any)?.[k] ? (
            <p key={k} className="text-red-500 text-xs">
              {(errors as any)[k]?.message}
            </p>
          ) : null
        )}
      </div>
    </section>
  );
}
