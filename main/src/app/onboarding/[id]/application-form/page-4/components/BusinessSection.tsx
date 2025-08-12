"use client";

import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { ApplicationFormPage4Input } from "@/lib/zodSchemas/applicationFormPage4.Schema";
import OnboardingPhotoGroup from "@/app/onboarding/components/OnboardingPhotoGroup";
import { ES3Folder } from "@/types/aws.types";

export default function BusinessSection() {
  const { t } = useTranslation("common");
  const {
    register,
    formState: { errors },
  } = useFormContext<ApplicationFormPage4Input>();

  const rootMessage = (errors as any)?.root?.message as string | undefined;

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-2xl bg-white shadow-sm">
      {/* root anchor for all-or-nothing error */}
      <span data-field="businessSection.root" className="sr-only" />

      <h2 className="text-center text-lg font-semibold text-gray-800">{t("form.step2.page4.sections.business.title", "Incorporate Details")}</h2>

      {/* Disclaimer (same design as CriminalRecords guidance) */}
      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <div className=" text-sm text-gray-700 text-center">
          <p>
            {t(
              "form.step2.page4.sections.business.disclaimer.text",
              "If you provide any incorporation detail, you must complete every field and upload all related documents in this section. This includes Employee Number, HST Number, Business Number, and the required photos (Incorporation, HST, Banking)."
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.employeeNumber", "Employee Number")}</label>
          <input {...register("employeeNumber")} data-field="employeeNumber" className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md" />
          {errors.employeeNumber && <p className="text-red-500 text-xs mt-1">{errors.employeeNumber.message?.toString()}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.hstNumber", "HST Number")}</label>
          <input {...register("hstNumber")} data-field="hstNumber" className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md" />
          {errors.hstNumber && <p className="text-red-500 text-xs mt-1">{errors.hstNumber.message?.toString()}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{t("form.step2.page4.fields.businessNumber", "Business Number")}</label>
          <input {...register("businessNumber")} data-field="businessNumber" className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md" />
          {errors.businessNumber && <p className="text-red-500 text-xs mt-1">{errors.businessNumber.message?.toString()}</p>}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Wrap each photo group with a data-field so scroll finds the trigger */}
        <div className="col-span-12 lg:col-span-6" data-field="incorporatePhotos">
          <OnboardingPhotoGroup name="incorporatePhotos" label={t("form.step2.page4.fields.incorporatePhotos", "Incorporate Photos")} folder={ES3Folder.INCORPORATION_PHOTOS} maxPhotos={10} />
        </div>

        <div className="col-span-12 lg:col-span-6" data-field="hstPhotos">
          <OnboardingPhotoGroup name="hstPhotos" label={t("form.step2.page4.fields.hstPhotos", "HST Business Number Photos")} folder={ES3Folder.HST_PHOTOS} maxPhotos={2} />
        </div>

        <div className="col-span-12" data-field="bankingInfoPhotos">
          <OnboardingPhotoGroup name="bankingInfoPhotos" label={t("form.step2.page4.fields.bankingInfoPhotos", "Banking Info Photos")} folder={ES3Folder.BANKING_INFO_PHOTOS} maxPhotos={2} />
        </div>
      </div>

      {rootMessage && <p className="text-red-500 text-sm text-center">{rootMessage}</p>}
    </section>
  );
}
