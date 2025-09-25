"use client";

import { ECountryCode } from "@/types/shared.types";
import {
  EPassportType,
  EWorkAuthorizationType,
} from "@/types/applicationForm.types";
import OnboardingPhotoGroup from "@/app/onboarding/components/OnboardingPhotoGroup";
import { ES3Folder } from "@/types/aws.types";
import { useFormContext, useWatch } from "react-hook-form";
import { useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";

function RequiredBadge({ children = "Required" }) {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-200">
      {children}
    </span>
  );
}

export default function EligibilityDocsSection({
  countryCode,
}: {
  countryCode: ECountryCode;
}) {
  const { t } = useTranslation("common");
  const isCA = countryCode === ECountryCode.CA;
  const isUS = countryCode === ECountryCode.US;

  const {
    register,
    formState: { errors },
    setValue,
  } = useFormContext();
  const passportType = useWatch({ name: "passportType" });
  const workAuthorizationType = useWatch({ name: "workAuthorizationType" });

  // Clear fields when passport type changes to maintain form state consistency
  useEffect(() => {
    if (isCA && passportType === EPassportType.CANADIAN) {
      // Clear work authorization type since it's not needed for Canadian passports
      setValue("workAuthorizationType", undefined);
      // Also clear US visa and PR/Permit photos since they're not needed for Canadian passports
      setValue("usVisaPhotos", []);
      setValue("prPermitCitizenshipPhotos", []);
    } else if (isCA && passportType === EPassportType.OTHERS) {
      // When switching to "Others", clear the work authorization type to force re-selection
      setValue("workAuthorizationType", undefined);
    }
  }, [isCA, passportType, setValue]);

  // Determine which fields to show based on passport type
  const showFields = useMemo(() => {
    if (!isCA)
      return { showPassport: true, showUSVisa: false, showPRPermit: true };

    // For Canadian companies, don't show any fields until passport type is selected
    if (!passportType || passportType === "") {
      return { showPassport: false, showUSVisa: false, showPRPermit: false };
    }

    if (passportType === EPassportType.CANADIAN) {
      return { showPassport: true, showUSVisa: false, showPRPermit: false };
    } else if (passportType === EPassportType.OTHERS) {
      // For "Others" passport, don't show fields until work authorization type is selected
      if (!workAuthorizationType || workAuthorizationType === "") {
        return { showPassport: false, showUSVisa: false, showPRPermit: false };
      }

      // For "Others" passport, always show US Visa field (required for cross-border, optional for local)
      return { showPassport: true, showUSVisa: true, showPRPermit: true };
    }

    // Fallback (shouldn't reach here)
    return { showPassport: false, showUSVisa: false, showPRPermit: false };
  }, [isCA, passportType, workAuthorizationType]);

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-2xl bg-white shadow-sm">
      {/* section anchor so scrollToError('fastCard') lands here */}
      <span data-field="eligibilityDocs.root" className="sr-only" />
      <h2 className="text-center text-lg font-semibold text-gray-800">
        {t("form.step2.page4.sections.eligibilityDocs.title", "Health / Identification Documents")}
      </h2>

      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <div className="text-sm text-gray-700 text-center">
          <p>
            {t("form.step2.page4.sections.eligibilityDocs.description", "Please provide clear and readable photos of the required health and identity documents listed below. All details must be visible (front and back where applicable). If any document is missing or unclear, your application may be delayed.")}
          </p>
        </div>
      </div>

      {isCA && (
        <div className="space-y-6">
          {/* Health Card - Always required for Canadians */}
          <div data-field="healthCardPhotos">
            <div className="mb-2 text-sm font-medium text-gray-700">
              {t("form.step2.page4.fields.healthCard", "Health Card")} <RequiredBadge />
            </div>
            <OnboardingPhotoGroup
              name="healthCardPhotos"
              label={t("form.step2.page4.fields.healthCardPhotos", "Health Card (Front & Back)")}
              description={t("form.step2.page4.fields.healthCardDescription", "Upload clear photos of both the front and back of your health card (e.g., Ontario Health Card).")}
              folder={ES3Folder.HEALTH_CARD_PHOTOS}
              maxPhotos={2}
            />
          </div>

          {/* Proof of Work Authorization Section */}
          <div>
            <div className="text-center text-lg font-semibold text-gray-800 mb-4">
              {t("form.step2.page4.sections.workAuthorization.title", "Proof of Work Authorization")}
            </div>

            {/* Passport Type Selection */}
            <div className="mb-4" data-field="passportType">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("form.step2.page4.fields.passportTypeQuestion", "What type of passport do you have?")} <RequiredBadge />
              </label>
              <select
                {...register("passportType")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t("form.step2.page4.fields.selectPassportType", "Select passport type")}</option>
                <option value={EPassportType.CANADIAN}>{t("form.step2.page4.fields.passportType.canadian", "Canadian")}</option>
                <option value={EPassportType.OTHERS}>{t("form.step2.page4.fields.passportType.others", "Others")}</option>
              </select>
              {errors.passportType && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.passportType.message as string}
                </p>
              )}
            </div>

            {/* Work Authorization Type - Only show for non-Canadian passports */}
            {passportType === EPassportType.OTHERS && (
              <div className="mb-4" data-field="workAuthorizationType">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("form.step2.page4.fields.workAuthorizationTypeQuestion", "What type of work authorization do you have?")} <RequiredBadge />
                </label>
                <select
                  {...register("workAuthorizationType")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t("form.step2.page4.fields.selectWorkAuthorizationType", "Select work authorization type")}</option>
                  <option value={EWorkAuthorizationType.LOCAL}>
                    {t("form.step2.page4.fields.workAuthorizationType.local", "Local (within Canada)")}
                  </option>
                  <option value={EWorkAuthorizationType.CROSS_BORDER}>
                    {t("form.step2.page4.fields.workAuthorizationType.crossBorder", "Cross-border (Canada-US)")}
                  </option>
                </select>
                {errors.workAuthorizationType && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.workAuthorizationType.message as string}
                  </p>
                )}
              </div>
            )}

            {/* Document Upload Fields */}
            <div className="grid grid-cols-12 gap-6">
              {/* Passport - Show based on passport type selection */}
              {showFields.showPassport && (
                <div
                  className="col-span-12 lg:col-span-6"
                  data-field="passportPhotos"
                >
                  <div className="mb-2 text-sm font-medium text-gray-700">
                    {t("form.step2.page4.fields.passport", "Passport")} <RequiredBadge />
                  </div>
                  <OnboardingPhotoGroup
                    name="passportPhotos"
                    label={t("form.step2.page4.fields.passportPhotos", "Passport (Bio & Back)")}
                    description={t("form.step2.page4.fields.passportDescription", "Upload the passport bio/data page (with your photo) and the back cover page (e.g., Canadian or foreign passport).")}
                    folder={ES3Folder.PASSPORT_PHOTOS}
                    maxPhotos={2}
                  />
                </div>
              )}

              {/* US Visa - Show for Others passport, required only for cross-border */}
              {showFields.showUSVisa && (
                <div
                  className="col-span-12 lg:col-span-6"
                  data-field="usVisaPhotos"
                >
                  <div className="mb-2 text-sm font-medium text-gray-700">
                    {t("form.step2.page4.fields.usVisa", "US Visa")}{" "}
                    {workAuthorizationType ===
                    EWorkAuthorizationType.CROSS_BORDER ? (
                      <RequiredBadge />
                    ) : (
                      <span className="text-gray-500 text-xs">({t("form.step2.page4.fields.optional", "Optional")})</span>
                    )}
                  </div>
                  <OnboardingPhotoGroup
                    name="usVisaPhotos"
                    label={t("form.step2.page4.fields.usVisaPhotos", "US Visa")}
                    description={t("form.step2.page4.fields.usVisaDescription", "Upload clear photos of your valid US visa (e.g., visitor, work, or study visa pages).")}
                    folder={ES3Folder.US_VISA_PHOTOS}
                    maxPhotos={2}
                  />
                </div>
              )}

              {/* PR/Permit/Citizenship - Only show for non-Canadian passports */}
              {showFields.showPRPermit && (
                <div
                  className="col-span-12 lg:col-span-6"
                  data-field="prPermitCitizenshipPhotos"
                >
                  <div className="mb-2 text-sm font-medium text-gray-700">
                    {t("form.step2.page4.fields.prPermitCitizenship", "PR Card/ Work Permit / Citizenship")} <RequiredBadge />
                  </div>
                  <OnboardingPhotoGroup
                    name="prPermitCitizenshipPhotos"
                    label={t("form.step2.page4.fields.prPermitCitizenshipPhotos", "PR / Permit / Citizenship")}
                    description={t("form.step2.page4.fields.prPermitCitizenshipDescription", "Upload clear photos of your Permanent Resident card, Work/Study Permit, or Citizenship document (e.g., PR card front & back, Work Permit letter).")}
                    folder={ES3Folder.PR_CITIZENSHIP_PHOTOS}
                    maxPhotos={2}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isUS && (
        <div className="space-y-6">
          <div data-field="medicalCertificationPhotos">
            <div className="mb-2 text-sm font-medium text-gray-700">
              {t("form.step2.page4.fields.medicalCertification", "Medical Certification")} <RequiredBadge />
            </div>
            <OnboardingPhotoGroup
              name="medicalCertificationPhotos"
              label={t("form.step2.page4.fields.medicalCertificationPhotos", "Medical Certification")}
              description={t("form.step2.page4.fields.medicalCertificationDescription", "Upload clear photos of your valid DOT Medical Certificate (front and back if applicable).")}
              folder={ES3Folder.MEDICAL_CERT_PHOTOS}
              maxPhotos={2}
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">
              {t("form.step2.page4.sections.workAuthorization.title", "Proof of Work Authorization")}{" "}
              <RequiredBadge>{t("form.step2.page4.fields.oneOfTheseRequired", "One of these required")}</RequiredBadge>
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div
                className="col-span-12 lg:col-span-6"
                data-field="passportPhotos"
              >
                <OnboardingPhotoGroup
                  name="passportPhotos"
                  label={t("form.step2.page4.fields.passport", "Passport")}
                  description={t("form.step2.page4.fields.passportDescriptionUS", "Upload the passport bio/data page (with your photo) and the back cover page (e.g., US passport).")}
                  folder={ES3Folder.PASSPORT_PHOTOS}
                  maxPhotos={2}
                />
              </div>

              <div
                className="col-span-12 lg:col-span-6"
                data-field="prPermitCitizenshipPhotos"
              >
                <OnboardingPhotoGroup
                  name="prPermitCitizenshipPhotos"
                  label={t("form.step2.page4.fields.greenCardCitizenship", "Green Card / Citizenship")}
                  description={t("form.step2.page4.fields.greenCardCitizenshipDescription", "Upload clear photos of your Permanent Resident card or US Citizenship document (e.g., PR card front & back, Certificate of Naturalization).")}
                  folder={ES3Folder.PR_CITIZENSHIP_PHOTOS}
                  maxPhotos={2}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
