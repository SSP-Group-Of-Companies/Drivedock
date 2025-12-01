// main/src/app/onboarding/[id]/(has-step)/application-form/page-4/components/BusinessSection.tsx
"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { ApplicationFormPage4Input } from "@/lib/zodSchemas/applicationFormPage4.Schema";
import OnboardingPhotoGroup from "@/app/onboarding/components/OnboardingPhotoGroup";
import { ES3Folder } from "@/types/aws.types";
import { ECountryCode } from "@/types/shared.types";

type Props = {
  countryCode: ECountryCode;
};

export default function BusinessSection({ countryCode }: Props) {
  const { t } = useTranslation("common");
  const {
    register,
    control,
    clearErrors,
    formState: { errors },
  } = useFormContext<ApplicationFormPage4Input>();

  const isUS = countryCode === ECountryCode.US;

  // Watch all fields that participate in the all-or-nothing logic
  const hstNumber = useWatch({ control, name: "hstNumber" });
  const businessName = useWatch({ control, name: "businessName" });

  const incorporatePhotos = useWatch({ control, name: "incorporatePhotos" });
  const hstPhotos = useWatch({ control, name: "hstPhotos" });

  // If ALL relevant business fields are cleared/empty, clear field-level errors
  useEffect(() => {
    const isEmptyStr = (v?: string | null) => !v || v.trim().length === 0;
    const isEmptyArr = (v?: unknown[] | null) => !v || v.length === 0;

    const allEmpty = isUS
      ? isEmptyStr(businessName) && isEmptyArr(incorporatePhotos)
      : isEmptyStr(hstNumber) &&
        isEmptyStr(businessName) &&
        isEmptyArr(incorporatePhotos) &&
        isEmptyArr(hstPhotos);

    if (allEmpty) {
      clearErrors(
        isUS
          ? ["businessName", "incorporatePhotos"]
          : ["hstNumber", "businessName", "incorporatePhotos", "hstPhotos"]
      );
    }
  }, [
    isUS,
    hstNumber,
    businessName,
    incorporatePhotos,
    hstPhotos,
    clearErrors,
  ]);

  const rootMessage = (errors as any)?.root?.message as string | undefined;

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-2xl bg-white shadow-sm">
      {/* root anchor for all-or-nothing error */}
      <span data-field="businessSection.root" className="sr-only" />

      <h2 className="text-center text-lg font-semibold text-gray-800">
        {t("form.step2.page4.sections.business.title")}
      </h2>

      {/* Disclaimer (same design as CriminalRecords guidance) */}
      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <div className="text-sm text-gray-700 text-center">
          <p>{t("form.step2.page4.sections.business.disclaimer.text")}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Row 1: Business Name and (optionally) HST Number */}
        <div
          className={
            isUS
              ? "grid grid-cols-1 gap-6"
              : "grid grid-cols-1 md:grid-cols-2 gap-6"
          }
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("form.step2.page4.fields.businessName")}
            </label>
            <input
              {...register("businessName")}
              data-field="businessName"
              className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
              aria-invalid={!!errors.businessName || !!rootMessage}
            />
            {errors.businessName && (
              <p className="text-red-500 text-xs mt-1">
                {errors.businessName.message?.toString()}
              </p>
            )}
          </div>

          {/* HST number is **Canada only**; hide completely for US */}
          {!isUS && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("form.step2.page4.fields.hstNumber")}
              </label>
              <input
                {...register("hstNumber")}
                data-field="hstNumber"
                className="py-2 px-3 mt-1 block w-full rounded-md shadow-sm focus:ring-sky-500 focus:outline-none focus:shadow-md"
                aria-invalid={!!errors.hstNumber || !!rootMessage}
              />
              {errors.hstNumber && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.hstNumber.message?.toString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Incorporation docs */}
        <div
          className={isUS ? "col-span-12" : "col-span-12 lg:col-span-6"}
          data-field="incorporatePhotos"
        >
          <OnboardingPhotoGroup
            name="incorporatePhotos"
            label={t("form.step2.page4.fields.incorporatePhotos")}
            description={t(
              "form.step2.page4.fields.incorporatePhotosDescription"
            )}
            folder={ES3Folder.INCORPORATION_PHOTOS}
            maxPhotos={10}
            aspect={null} // FREE aspect for incorporation documents
          />
        </div>

        {/* HST photos – Canada only */}
        {!isUS && (
          <div className="col-span-12 lg:col-span-6" data-field="hstPhotos">
            <OnboardingPhotoGroup
              name="hstPhotos"
              label={t("form.step2.page4.fields.hstPhotos")}
              description={t("form.step2.page4.fields.hstPhotosDescription")}
              folder={ES3Folder.HST_PHOTOS}
              maxPhotos={2}
              aspect={null} // FREE aspect for HST documents
            />
          </div>
        )}

        {/* Banking Info is in its own section */}
      </div>

      {rootMessage && (
        <p className="text-red-500 text-sm text-center">{rootMessage}</p>
      )}
    </section>
  );
}
