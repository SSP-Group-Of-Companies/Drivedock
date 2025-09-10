"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import useMounted from "@/hooks/useMounted";
import QuestionGroup from "@/app/onboarding/components/QuestionGroup";
import AccidentalInsurancePopup from "@/app/onboarding/components/AccidentalInsurancePopup";
import type { ApplicationFormPage4Input } from "@/lib/zodSchemas/applicationFormPage4.Schema";

type BoolFieldName = "deniedLicenseOrPermit" | "suspendedOrRevoked" | "testedPositiveOrRefused" | "completedDOTRequirements" | "hasAccidentalInsurance";

// Reusable Yes/No using your segmented <QuestionGroup />
function YesNoQuestion({ name, labelKey, onChange }: { name: BoolFieldName; labelKey: string; onChange?: (value: boolean | undefined) => void }) {
  const { t } = useTranslation("common");
  const formContext = useFormContext<ApplicationFormPage4Input>();
  
  // Always destructure (hooks must be called unconditionally)
  const {
    control,
    formState: { errors },
  } = formContext || { control: null, formState: { errors: {} } };
  
  // Defensive check after all hooks are called
  if (!formContext) {
    console.error("YesNoQuestion: useFormContext returned null - component not wrapped in FormProvider");
    return <div>Form context error</div>;
  }

  return (
    <div className="space-y-1" data-field={name}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          // undefined → no selection
          const current = field.value === undefined ? "" : field.value === true ? "form.yes" : "form.no";

          return (
            <QuestionGroup
              question={t(labelKey)}
              // Allow undefined so nothing is selected initially
              value={current}
              onChange={(v?: string) => {
                // Map to tri-state: undefined | "form.yes" | "form.no"
                let value: boolean | undefined;
                if (v === undefined || v === "") {
                  value = undefined;
                } else {
                  value = v === "form.yes";
                }
                field.onChange(value);
                onChange?.(value);
              }}
            />
          );
        }}
      />
      {(errors as any)?.[name]?.message && <p className="text-red-500 text-xs">{(errors as any)[name].message as string}</p>}
    </div>
  );
}

export default function AdditionalInfoSection() {
  const mounted = useMounted();
  const { t } = useTranslation("common");
  const formContext = useFormContext<ApplicationFormPage4Input>();
  
  // Always destructure (hooks must be called unconditionally)
  const {
    control,
    register,
    formState: { errors },
  } = formContext || { control: null, register: () => {}, formState: { errors: {} } };

  const suspended = useWatch({ control: control || undefined, name: "suspendedOrRevoked" });
  
  // State for showing the accidental insurance popup
  const [showAccidentalInsurancePopup, setShowAccidentalInsurancePopup] = useState(false);

  // Handler for accidental insurance question changes
  const handleAccidentalInsuranceChange = (value: boolean | undefined) => {
    if (value !== undefined) {
      setShowAccidentalInsurancePopup(true);
    }
  };

  // Defensive checks after all hooks are called
  if (!mounted) return null;
  
  if (!formContext) {
    console.error("AdditionalInfoSection: useFormContext returned null - component not wrapped in FormProvider");
    return <div>Form context error</div>;
  }

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-lg bg-white shadow-sm">
      <h2 className="text-center text-lg font-semibold text-gray-800">{t("form.step2.page4.sections.additionalInfo.title", "Additional Info")}</h2>

      <div className="space-y-4">
        <YesNoQuestion name="deniedLicenseOrPermit" labelKey="form.step2.page4.fields.denied" />

        <YesNoQuestion name="suspendedOrRevoked" labelKey="form.step2.page4.fields.suspended" />

        {suspended === true && (
          <div className="space-y-1" data-field="suspensionNotes">
            <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.suspensionNotes", "Notes")}</label>
            <textarea
              {...register("suspensionNotes")}
              rows={2}
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
              placeholder={t("form.placeholders.optionalDetails", "Provide details...")}
            />
            {errors.suspensionNotes && <p className="text-red-500 text-xs mt-1">{errors.suspensionNotes.message?.toString()}</p>}
          </div>
        )}

        <YesNoQuestion name="testedPositiveOrRefused" labelKey="form.step2.page4.fields.testedPositive" />

        <YesNoQuestion name="completedDOTRequirements" labelKey="form.step2.page4.fields.completedDOT" />

        <YesNoQuestion name="hasAccidentalInsurance" labelKey="form.step2.page4.fields.hasInsurance" onChange={handleAccidentalInsuranceChange} />
      </div>
      
      {/* Accidental Insurance Popup */}
      {showAccidentalInsurancePopup && (
        <AccidentalInsurancePopup
          onClose={() => setShowAccidentalInsurancePopup(false)}
        />
      )}
    </section>
  );
}
