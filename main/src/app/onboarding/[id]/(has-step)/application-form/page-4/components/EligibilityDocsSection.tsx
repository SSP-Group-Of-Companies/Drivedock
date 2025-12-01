"use client";

import { ECountryCode } from "@/types/shared.types";
import {
  EPassportType,
  EWorkAuthorizationType,
  EImmigrationStatusUS,
  EPrPermitDocumentType,
} from "@/types/applicationForm.types";
import OnboardingPhotoGroup from "@/app/onboarding/components/OnboardingPhotoGroup";
import { ES3Folder } from "@/types/aws.types";
import { useFormContext, useWatch } from "react-hook-form";
import { useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DOC_ASPECTS } from "@/lib/docAspects";

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

  // US bundle selector
  const usWorkAuthBundle = useWatch({ name: "usWorkAuthBundle" });

  // For easier error access (avoid deep generic types)
  const fieldErrors = errors as any;

  // Track previous passport type to avoid clearing on mount
  const prevPassportTypeRef = useRef<EPassportType | "" | undefined>(undefined);

  // Clear fields when passport type changes to maintain form state consistency (Canada only)
  useEffect(() => {
    if (!isCA) return;

    const prev = prevPassportTypeRef.current;
    const curr = passportType;

    // Skip clearing on the initial mount (preserve prefilled values)
    if (prev === undefined) {
      prevPassportTypeRef.current = curr;
      return;
    }

    // Only react when the value truly changes
    if (curr !== prev) {
      if (curr === EPassportType.CANADIAN) {
        setValue("workAuthorizationType", undefined, {
          shouldDirty: true,
          shouldValidate: true,
        });
        setValue("usVisaPhotos", [], { shouldDirty: true });
        setValue("prPermitCitizenshipPhotos", [], { shouldDirty: true });
      } else if (curr === EPassportType.OTHERS) {
        // Clear only when switching *to* Others (not on mount)
        setValue("workAuthorizationType", undefined, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    }

    prevPassportTypeRef.current = curr;
  }, [isCA, passportType, setValue]);

  // CA: determine which fields to show based on passport type
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

  // US: when bundle changes, clear opposite side’s fields so we don't send both
  useEffect(() => {
    if (!isUS) return;

    if (usWorkAuthBundle === "passport") {
      // Clear PR / Permit side
      setValue("prPermitCitizenshipPhotos", [], { shouldDirty: true });
      setValue(
        "prPermitCitizenshipDetails",
        {
          documentType: undefined,
          documentNumber: "",
          issuingAuthority: "",
          countryOfIssue: "",
          expiryDate: "",
        },
        { shouldDirty: true }
      );
    } else if (usWorkAuthBundle === "pr_permit") {
      // Clear passport side
      setValue("passportPhotos", [], { shouldDirty: true });
      setValue(
        "passportDetails",
        {
          documentNumber: "",
          issuingAuthority: "",
          countryOfIssue: "",
          expiryDate: "",
        },
        { shouldDirty: true }
      );
    }
  }, [isUS, usWorkAuthBundle, setValue]);

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-2xl bg-white shadow-sm">
      {/* section anchor so scrollToError('fastCard') lands here */}
      <span data-field="eligibilityDocs.root" className="sr-only" />
      <h2 className="text-center text-lg font-semibold text-gray-800">
        {t(
          "form.step2.page4.sections.eligibilityDocs.title",
          "Health / Identification Documents"
        )}
      </h2>

      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <div className="text-sm text-gray-700 text-center">
          <p>
            {t(
              "form.step2.page4.sections.eligibilityDocs.description",
              "Please provide clear and readable photos of the required health and identity documents listed below. All details must be visible (front and back where applicable). If any document is missing or unclear, your application may be delayed."
            )}
          </p>
        </div>
      </div>

      {/* CANADA FLOW */}
      {isCA && (
        <div className="space-y-6">
          {/* Health Card - Always required for Canadians
              -> allow 2 PDFs (front & back) */}
          <div data-field="healthCardPhotos">
            <div className="mb-2 text-sm font-medium text-gray-700">
              {t("form.step2.page4.fields.healthCard", "Health Card")}{" "}
              <RequiredBadge />
            </div>
            <OnboardingPhotoGroup
              name="healthCardPhotos"
              label={t(
                "form.step2.page4.fields.healthCardPhotos",
                "Health Card (Front & Back)"
              )}
              description={t(
                "form.step2.page4.fields.healthCardDescription",
                "Upload clear PDF scans showing both the front and back of your health card (e.g., Ontario Health Card)."
              )}
              folder={ES3Folder.HEALTH_CARD_PHOTOS}
              maxPhotos={2}
              aspect={DOC_ASPECTS.ID}
            />
          </div>

          {/* Proof of Work Authorization Section */}
          <div>
            <div className="text-center text-lg font-semibold text-gray-800 mb-4">
              {t(
                "form.step2.page4.sections.workAuthorization.title",
                "Proof of Work Authorization"
              )}
            </div>

            {/* Passport Type Selection */}
            <div className="mb-4" data-field="passportType">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t(
                  "form.step2.page4.fields.passportTypeQuestion",
                  "What type of passport do you have?"
                )}{" "}
                <RequiredBadge />
              </label>
              <select
                {...register("passportType")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">
                  {t(
                    "form.step2.page4.fields.selectPassportType",
                    "Select passport type"
                  )}
                </option>
                <option value={EPassportType.CANADIAN}>
                  {t(
                    "form.step2.page4.fields.passportType.canadian",
                    "Canadian"
                  )}
                </option>
                <option value={EPassportType.OTHERS}>
                  {t("form.step2.page4.fields.passportType.others", "Others")}
                </option>
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
                  {t(
                    "form.step2.page4.fields.workAuthorizationTypeQuestion",
                    "What type of work authorization do you have?"
                  )}{" "}
                  <RequiredBadge />
                </label>
                <select
                  {...register("workAuthorizationType")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">
                    {t(
                      "form.step2.page4.fields.selectWorkAuthorizationType",
                      "Select work authorization type"
                    )}
                  </option>
                  <option value={EWorkAuthorizationType.LOCAL}>
                    {t(
                      "form.step2.page4.fields.workAuthorizationType.local",
                      "Local (within Canada)"
                    )}
                  </option>
                  <option value={EWorkAuthorizationType.CROSS_BORDER}>
                    {t(
                      "form.step2.page4.fields.workAuthorizationType.crossBorder",
                      "Cross-border (Canada-US)"
                    )}
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
              {/* Passport */}
              {showFields.showPassport && (
                <div
                  className="col-span-12 lg:col-span-6"
                  data-field="passportPhotos"
                >
                  <div className="mb-2 text-sm font-medium text-gray-700">
                    {t("form.step2.page4.fields.passport", "Passport")}{" "}
                    <RequiredBadge />
                  </div>
                  <OnboardingPhotoGroup
                    name="passportPhotos"
                    label={t(
                      "form.step2.page4.fields.passportPhotos",
                      "Passport (Bio & Back)"
                    )}
                    description={t(
                      "form.step2.page4.fields.passportDescription",
                      "Upload PDF scans of the passport bio/data page (with your photo) and the back cover page."
                    )}
                    folder={ES3Folder.PASSPORT_PHOTOS}
                    maxPhotos={2}
                    aspect={DOC_ASPECTS.PASSPORT}
                  />
                </div>
              )}

              {/* US Visa */}
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
                      <span className="text-gray-500 text-xs">
                        ({t("form.step2.page4.fields.optional", "Optional")})
                      </span>
                    )}
                  </div>
                  <OnboardingPhotoGroup
                    name="usVisaPhotos"
                    label={t("form.step2.page4.fields.usVisaPhotos", "US Visa")}
                    description={t(
                      "form.step2.page4.fields.usVisaDescription",
                      "Upload PDF scans of your valid US visa pages."
                    )}
                    folder={ES3Folder.US_VISA_PHOTOS}
                    maxPhotos={2}
                    aspect={DOC_ASPECTS.PASSPORT}
                  />
                </div>
              )}

              {/* PR / Permit / Citizenship */}
              {showFields.showPRPermit && (
                <div
                  className="col-span-12 lg:col-span-6"
                  data-field="prPermitCitizenshipPhotos"
                >
                  <div className="mb-2 text-sm font-medium text-gray-700">
                    {t(
                      "form.step2.page4.fields.prPermitCitizenship",
                      "PR Card/ Work Permit / Citizenship"
                    )}{" "}
                    <RequiredBadge />
                  </div>
                  <OnboardingPhotoGroup
                    name="prPermitCitizenshipPhotos"
                    label={t(
                      "form.step2.page4.fields.prPermitCitizenshipPhotos",
                      "PR / Permit / Citizenship"
                    )}
                    description={t(
                      "form.step2.page4.fields.prPermitCitizenshipDescription",
                      "Upload PDF scans of your PR card (front & back), Work/Study Permit, or Citizenship document."
                    )}
                    folder={ES3Folder.PR_CITIZENSHIP_PHOTOS}
                    maxPhotos={2}
                    aspect={DOC_ASPECTS.ID}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* US FLOW */}
      {isUS && (
        <div className="space-y-6">
          {/* Medical Certificate */}
          <div data-field="medicalCertificationPhotos">
            <div className="mb-2 text-sm font-medium text-gray-700">
              {t(
                "form.step2.page4.fields.medicalCertification",
                "Medical Certification"
              )}{" "}
              <RequiredBadge />
            </div>
            <OnboardingPhotoGroup
              name="medicalCertificationPhotos"
              label={t(
                "form.step2.page4.fields.medicalCertificationPhotos",
                "Medical Certification"
              )}
              description={t(
                "form.step2.page4.fields.medicalCertificationDescription",
                "Upload clear PDF scans of your valid DOT Medical Certificate (front and back if applicable)."
              )}
              folder={ES3Folder.MEDICAL_CERT_PHOTOS}
              maxPhotos={2}
              aspect={DOC_ASPECTS.FREE}
            />

            {/* Medical certificate details */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t(
                    "form.step2.page4.fields.medicalCert.documentNumber",
                    "Document Number"
                  )}{" "}
                  <RequiredBadge />
                </label>
                <input
                  type="text"
                  {...register("medicalCertificateDetails.documentNumber")}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {fieldErrors?.medicalCertificateDetails?.documentNumber && (
                  <p className="mt-1 text-sm text-red-600">
                    {
                      fieldErrors.medicalCertificateDetails.documentNumber
                        .message
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t(
                    "form.step2.page4.fields.medicalCert.issuingAuthority",
                    "Issuing Authority"
                  )}{" "}
                  <RequiredBadge />
                </label>
                <input
                  type="text"
                  {...register("medicalCertificateDetails.issuingAuthority")}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {fieldErrors?.medicalCertificateDetails?.issuingAuthority && (
                  <p className="mt-1 text-sm text-red-600">
                    {
                      fieldErrors.medicalCertificateDetails.issuingAuthority
                        .message
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t(
                    "form.step2.page4.fields.medicalCert.expiryDate",
                    "Expiry Date (optional)"
                  )}
                </label>
                <input
                  type="date"
                  {...register("medicalCertificateDetails.expiryDate")}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {fieldErrors?.medicalCertificateDetails?.expiryDate && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldErrors.medicalCertificateDetails.expiryDate.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Immigration + work auth bundles */}
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t(
                  "form.step2.page4.fields.immigrationStatusUS",
                  "Immigration status in the United States"
                )}{" "}
                <RequiredBadge />
              </label>
              <select
                {...register("immigrationStatusInUS")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">
                  {t(
                    "form.step2.page4.fields.selectImmigrationStatusUS",
                    "Select immigration status"
                  )}
                </option>
                <option value={EImmigrationStatusUS.CITIZEN}>
                  {t(
                    "form.step2.page4.fields.immigrationStatus.citizen",
                    "US Citizen"
                  )}
                </option>
                <option value={EImmigrationStatusUS.NON_CITIZEN_NATIONAL}>
                  {t(
                    "form.step2.page4.fields.immigrationStatus.nonCitizenNational",
                    "US Non-Citizen National"
                  )}
                </option>
                <option value={EImmigrationStatusUS.PERMANENT_RESIDENT}>
                  {t(
                    "form.step2.page4.fields.immigrationStatus.permanentResident",
                    "US Permanent Resident"
                  )}
                </option>
                <option value={EImmigrationStatusUS.NON_CITIZEN}>
                  {t(
                    "form.step2.page4.fields.immigrationStatus.nonCitizen",
                    "Non-Citizen"
                  )}
                </option>
              </select>
              {errors.immigrationStatusInUS && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.immigrationStatusInUS.message as string}
                </p>
              )}
            </div>

            <div className="mb-2 text-sm font-medium text-gray-700">
              {t(
                "form.step2.page4.sections.workAuthorization.title",
                "Proof of Work Authorization"
              )}{" "}
              <RequiredBadge>
                {t(
                  "form.step2.page4.fields.oneOfTheseRequired",
                  "One of these required"
                )}
              </RequiredBadge>
            </div>

            {/* Bundle selector  */}
            <div className="mb-4" data-field="usWorkAuthBundle">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t(
                  "form.step2.page4.fields.usWorkAuthBundle.question",
                  "Which document will you provide as proof of work authorization?"
                )}{" "}
                <RequiredBadge />
              </label>

              <select
                {...register("usWorkAuthBundle")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">
                  {t(
                    "form.step2.page4.fields.usWorkAuthBundle.selectOption",
                    "Select one option"
                  )}
                </option>
                <option value="passport">
                  {t(
                    "form.step2.page4.workAuthBundles.passport.title",
                    "Use Passport"
                  )}
                </option>
                <option value="pr_permit">
                  {t(
                    "form.step2.page4.workAuthBundles.prPermit.title",
                    "Use PR / Permit / Citizenship"
                  )}
                </option>
              </select>

              {errors.usWorkAuthBundle && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.usWorkAuthBundle.message as string}
                </p>
              )}

              <p className="mt-1 text-xs text-gray-500">
                {t(
                  "form.step2.page4.fields.usWorkAuthBundle.helper",
                  "You must choose one option. Only the documents for the selected option will be required."
                )}
              </p>
            </div>

            <div className="grid grid-cols-12 gap-6 mt-4">
              {/* Passport bundle */}
              {usWorkAuthBundle === "passport" && (
                <>
                  <div
                    className="col-span-12 lg:col-span-6"
                    data-field="passportPhotos"
                  >
                    <div className="mb-2 text-sm font-medium text-gray-700">
                      {t("form.step2.page4.fields.passport", "Passport")}{" "}
                      <RequiredBadge />
                    </div>
                    <OnboardingPhotoGroup
                      name="passportPhotos"
                      label={t(
                        "form.step2.page4.fields.passportPhotos",
                        "Passport (Bio & Back)"
                      )}
                      description={t(
                        "form.step2.page4.fields.passportDescriptionUS",
                        "Upload PDF scans of the passport bio/data page and back cover page."
                      )}
                      folder={ES3Folder.PASSPORT_PHOTOS}
                      maxPhotos={2}
                      aspect={DOC_ASPECTS.PASSPORT}
                    />
                  </div>

                  <div className="col-span-12 lg:col-span-6 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t(
                          "form.step2.page4.fields.passportDetails.documentNumber",
                          "Passport Document Number"
                        )}{" "}
                        <RequiredBadge />
                      </label>
                      <input
                        type="text"
                        {...register("passportDetails.documentNumber")}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {fieldErrors?.passportDetails?.documentNumber && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.passportDetails.documentNumber.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t(
                          "form.step2.page4.fields.passportDetails.issuingAuthority",
                          "Issuing Authority"
                        )}{" "}
                        <RequiredBadge />
                      </label>
                      <input
                        type="text"
                        {...register("passportDetails.issuingAuthority")}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {fieldErrors?.passportDetails?.issuingAuthority && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.passportDetails.issuingAuthority.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t(
                          "form.step2.page4.fields.passportDetails.countryOfIssue",
                          "Country of Issue"
                        )}{" "}
                        <RequiredBadge />
                      </label>
                      <input
                        type="text"
                        {...register("passportDetails.countryOfIssue")}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {fieldErrors?.passportDetails?.countryOfIssue && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.passportDetails.countryOfIssue.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t(
                          "form.step2.page4.fields.passportDetails.expiryDate",
                          "Expiry Date (optional)"
                        )}
                      </label>
                      <input
                        type="date"
                        {...register("passportDetails.expiryDate")}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {fieldErrors?.passportDetails?.expiryDate && (
                        <p className="mt-1 text-sm text-red-600">
                          {fieldErrors.passportDetails.expiryDate.message}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* PR / Permit / Citizenship bundle */}
              {usWorkAuthBundle === "pr_permit" && (
                <>
                  <div
                    className="col-span-12 lg:col-span-6"
                    data-field="prPermitCitizenshipPhotos"
                  >
                    <div className="mb-2 text-sm font-medium text-gray-700">
                      {t(
                        "form.step2.page4.fields.greenCardCitizenship",
                        "Green Card / Citizenship / Permit"
                      )}{" "}
                      <RequiredBadge />
                    </div>
                    <OnboardingPhotoGroup
                      name="prPermitCitizenshipPhotos"
                      label={t(
                        "form.step2.page4.fields.greenCardCitizenship",
                        "Green Card / Citizenship / Permit"
                      )}
                      description={t(
                        "form.step2.page4.fields.greenCardCitizenshipDescription",
                        "Upload PDF scans of your PR card (front & back), Work/Study Permit, or Citizenship document."
                      )}
                      folder={ES3Folder.PR_CITIZENSHIP_PHOTOS}
                      maxPhotos={2}
                      aspect={DOC_ASPECTS.ID}
                    />
                  </div>

                  <div className="col-span-12 lg:col-span-6 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t(
                          "form.step2.page4.fields.prPermitDetails.documentType",
                          "Document Type"
                        )}{" "}
                        <RequiredBadge />
                      </label>
                      <select
                        {...register("prPermitCitizenshipDetails.documentType")}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">
                          {t(
                            "form.step2.page4.fields.prPermitDetails.selectDocumentType",
                            "Select document type"
                          )}
                        </option>
                        <option value={EPrPermitDocumentType.PR_CARD}>
                          {t(
                            "form.step2.page4.fields.prPermitDetails.prCard",
                            "PR Card"
                          )}
                        </option>
                        <option
                          value={EPrPermitDocumentType.CITIZENSHIP_CERTIFICATE}
                        >
                          {t(
                            "form.step2.page4.fields.prPermitDetails.citizenshipCertificate",
                            "Citizenship Certificate"
                          )}
                        </option>
                        <option value={EPrPermitDocumentType.WORK_PERMIT}>
                          {t(
                            "form.step2.page4.fields.prPermitDetails.workPermit",
                            "Work Permit"
                          )}
                        </option>
                      </select>
                      {fieldErrors?.prPermitCitizenshipDetails
                        ?.documentType && (
                        <p className="mt-1 text-sm text-red-600">
                          {
                            fieldErrors.prPermitCitizenshipDetails.documentType
                              .message
                          }
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t(
                          "form.step2.page4.fields.prPermitDetails.documentNumber",
                          "Document Number"
                        )}{" "}
                        <RequiredBadge />
                      </label>
                      <input
                        type="text"
                        {...register(
                          "prPermitCitizenshipDetails.documentNumber"
                        )}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {fieldErrors?.prPermitCitizenshipDetails
                        ?.documentNumber && (
                        <p className="mt-1 text-sm text-red-600">
                          {
                            fieldErrors.prPermitCitizenshipDetails
                              .documentNumber.message
                          }
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t(
                          "form.step2.page4.fields.prPermitDetails.issuingAuthority",
                          "Issuing Authority"
                        )}{" "}
                        <RequiredBadge />
                      </label>
                      <input
                        type="text"
                        {...register(
                          "prPermitCitizenshipDetails.issuingAuthority"
                        )}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {fieldErrors?.prPermitCitizenshipDetails
                        ?.issuingAuthority && (
                        <p className="mt-1 text-sm text-red-600">
                          {
                            fieldErrors.prPermitCitizenshipDetails
                              .issuingAuthority.message
                          }
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t(
                          "form.step2.page4.fields.prPermitDetails.countryOfIssue",
                          "Country of Issue"
                        )}{" "}
                        <RequiredBadge />
                      </label>
                      <input
                        type="text"
                        {...register(
                          "prPermitCitizenshipDetails.countryOfIssue"
                        )}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {fieldErrors?.prPermitCitizenshipDetails
                        ?.countryOfIssue && (
                        <p className="mt-1 text-sm text-red-600">
                          {
                            fieldErrors.prPermitCitizenshipDetails
                              .countryOfIssue.message
                          }
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t(
                          "form.step2.page4.fields.prPermitDetails.expiryDate",
                          "Expiry Date (optional)"
                        )}
                      </label>
                      <input
                        type="date"
                        {...register("prPermitCitizenshipDetails.expiryDate")}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {fieldErrors?.prPermitCitizenshipDetails?.expiryDate && (
                        <p className="mt-1 text-sm text-red-600">
                          {
                            fieldErrors.prPermitCitizenshipDetails.expiryDate
                              .message
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
