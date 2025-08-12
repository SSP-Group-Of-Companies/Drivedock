"use client";

import { ECountryCode } from "@/types/shared.types";
import OnboardingPhotoGroup from "@/app/onboarding/components/OnboardingPhotoGroup";
import { ES3Folder } from "@/types/aws.types";

function RequiredBadge({ children = "Required" }) {
  return <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-200">{children}</span>;
}

export default function EligibilityDocsSection({ countryCode }: { countryCode: ECountryCode }) {
  const isCA = countryCode === ECountryCode.CA;
  const isUS = countryCode === ECountryCode.US;

  return (
    <section className="space-y-6 border border-gray-200 p-6 rounded-2xl bg-white shadow-sm">
      {/* section anchor so scrollToError('fastCard') lands here */}
      <span data-field="eligibilityDocs.root" className="sr-only" />
      <h2 className="text-center text-lg font-semibold text-gray-800">Health / Identity Documents</h2>

      {isCA && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-6" data-field="healthCardPhotos">
            <div className="mb-2 text-sm font-medium text-gray-700">
              Health Card <RequiredBadge />
            </div>
            <OnboardingPhotoGroup name="healthCardPhotos" label="Health Card" folder={ES3Folder.HEALTH_CARD_PHOTOS} maxPhotos={2} />
          </div>

          <div className="col-span-12 lg:col-span-6" data-field="passportPhotos">
            <div className="mb-2 text-sm font-medium text-gray-700">
              Passport <RequiredBadge />
            </div>
            <OnboardingPhotoGroup name="passportPhotos" label="Passport" folder={ES3Folder.PASSPORT_PHOTOS} maxPhotos={2} />
          </div>

          <div className="col-span-12 lg:col-span-6" data-field="usVisaPhotos">
            <div className="mb-2 text-sm font-medium text-gray-700">
              US Visa <RequiredBadge />
            </div>
            <OnboardingPhotoGroup name="usVisaPhotos" label="US Visa" folder={ES3Folder.US_VISA_PHOTOS} maxPhotos={2} />
          </div>

          <div className="col-span-12 lg:col-span-6" data-field="prPermitCitizenshipPhotos">
            <div className="mb-2 text-sm font-medium text-gray-700">
              PR / Citizenship <RequiredBadge />
            </div>
            <OnboardingPhotoGroup name="prPermitCitizenshipPhotos" label="PR / Citizenship" folder={ES3Folder.PR_CITIZENSHIP_PHOTOS} maxPhotos={2} />
          </div>
        </div>
      )}

      {isUS && (
        <div className="space-y-6">
          <div data-field="medicalCertificationPhotos">
            <div className="mb-2 text-sm font-medium text-gray-700">
              Medical Certification <RequiredBadge />
            </div>
            <OnboardingPhotoGroup name="medicalCertificationPhotos" label="Medical Certification" folder={ES3Folder.MEDICAL_CERT_PHOTOS} maxPhotos={2} />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">
              Proof of Work Authorization <RequiredBadge>One of these required</RequiredBadge>
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-6" data-field="passportPhotos">
                <OnboardingPhotoGroup name="passportPhotos" label="Passport" folder={ES3Folder.PASSPORT_PHOTOS} maxPhotos={2} />
              </div>

              <div className="col-span-12 lg:col-span-6" data-field="prPermitCitizenshipPhotos">
                <OnboardingPhotoGroup name="prPermitCitizenshipPhotos" label="PR / Citizenship" folder={ES3Folder.PR_CITIZENSHIP_PHOTOS} maxPhotos={2} />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
