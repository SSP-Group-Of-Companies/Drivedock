"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { ApplicationFormPage4Input } from "@/lib/zodSchemas/applicationFormPage4.Schema";
import OnboardingPhotoGroup from "@/app/onboarding/components/OnboardingPhotoGroup";
import { ES3Folder } from "@/types/aws.types";

export default function BankingInfoSection() {
  const { t } = useTranslation("common");
  const {
    control,
    clearErrors,
    formState: { errors },
  } = useFormContext<ApplicationFormPage4Input>();

  // Watch photos for optional/required messaging, but validation is in Zod
  const bankingInfoPhotos = useWatch({ control, name: "bankingInfoPhotos" });

  useEffect(() => {
    if (Array.isArray(bankingInfoPhotos) && bankingInfoPhotos.length === 0) {
      clearErrors(["bankingInfoPhotos"]);
    }
  }, [bankingInfoPhotos, clearErrors]);

  const isRequired = false;

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-2xl bg-white shadow-sm">
      <span data-field="bankingInfoSection.root" className="sr-only" />

      <h2 className="text-center text-lg font-semibold text-gray-800">{t("form.step2.page4.sections.banking.title")}</h2>

      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <div className="text-sm text-gray-700 text-center">
          <p>{isRequired ? t("form.step2.page4.sections.banking.requiredDisclaimer") : t("form.step2.page4.sections.banking.optionalDisclaimer")}</p>
        </div>
      </div>

      <div className="col-span-12" data-field="bankingInfoPhotos">
        <OnboardingPhotoGroup
          name="bankingInfoPhotos"
          label={t("form.step2.page4.fields.bankingInfoPhotos")}
          description={t("form.step2.page4.fields.bankingInfoPhotosDescription")}
          folder={ES3Folder.BANKING_INFO_PHOTOS}
          maxPhotos={2}
        />
        {errors.bankingInfoPhotos && <p className="text-red-500 text-xs mt-1">{errors.bankingInfoPhotos.message?.toString()}</p>}
      </div>
    </section>
  );
}
