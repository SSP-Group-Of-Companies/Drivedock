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

      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <div className="text-sm text-gray-700 text-center">
          <p>
            Please provide clear and readable photos of the required health and identity documents listed below. All details must be visible (front and back where applicable). If any document is
            missing or unclear, your application may be delayed.
          </p>
        </div>
      </div>

      {isCA && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-6" data-field="healthCardPhotos">
            <div className="mb-2 text-sm font-medium text-gray-700">
              Health Card <RequiredBadge />
            </div>
            <OnboardingPhotoGroup
              name="healthCardPhotos"
              label="Health Card (Front & Back)"
              description="Upload clear photos of both the front and back of your health card (e.g., Ontario Health Card)."
              folder={ES3Folder.HEALTH_CARD_PHOTOS}
              maxPhotos={2}
            />
          </div>

          <div className="col-span-12 lg:col-span-6" data-field="passportPhotos">
            <div className="mb-2 text-sm font-medium text-gray-700">
              Passport <RequiredBadge />
            </div>
            <OnboardingPhotoGroup
              name="passportPhotos"
              label="Passport (Bio & Back)"
              description="Upload the passport bio/data page (with your photo) and the back cover page (e.g., Canadian or foreign passport)."
              folder={ES3Folder.PASSPORT_PHOTOS}
              maxPhotos={2}
            />
          </div>

          <div className="col-span-12 lg:col-span-6" data-field="usVisaPhotos">
            <div className="mb-2 text-sm font-medium text-gray-700">
              US Visa <RequiredBadge />
            </div>
            <OnboardingPhotoGroup
              name="usVisaPhotos"
              label="US Visa"
              description="Upload clear photos of your valid US visa (e.g., visitor, work, or study visa pages)."
              folder={ES3Folder.US_VISA_PHOTOS}
              maxPhotos={2}
            />
          </div>

          <div className="col-span-12 lg:col-span-6" data-field="prPermitCitizenshipPhotos">
            <div className="mb-2 text-sm font-medium text-gray-700">
              PR / Permit / Citizenship <RequiredBadge />
            </div>
            <OnboardingPhotoGroup
              name="prPermitCitizenshipPhotos"
              label="PR / Permit / Citizenship"
              description="Upload clear photos of your Permanent Resident card, Work/Study Permit, or Citizenship document (e.g., PR card front & back, Work Permit letter)."
              folder={ES3Folder.PR_CITIZENSHIP_PHOTOS}
              maxPhotos={2}
            />
          </div>
        </div>
      )}

      {isUS && (
        <div className="space-y-6">
          <div data-field="medicalCertificationPhotos">
            <div className="mb-2 text-sm font-medium text-gray-700">
              Medical Certification <RequiredBadge />
            </div>
            <OnboardingPhotoGroup
              name="medicalCertificationPhotos"
              label="Medical Certification"
              description="Upload clear photos of your valid DOT Medical Certificate (front and back if applicable)."
              folder={ES3Folder.MEDICAL_CERT_PHOTOS}
              maxPhotos={2}
            />
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">
              Proof of Work Authorization <RequiredBadge>One of these required</RequiredBadge>
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-6" data-field="passportPhotos">
                <OnboardingPhotoGroup
                  name="passportPhotos"
                  label="Passport"
                  description="Upload the passport bio/data page (with your photo) and the back cover page (e.g., US passport)."
                  folder={ES3Folder.PASSPORT_PHOTOS}
                  maxPhotos={2}
                />
              </div>

              <div className="col-span-12 lg:col-span-6" data-field="prPermitCitizenshipPhotos">
                <OnboardingPhotoGroup
                  name="prPermitCitizenshipPhotos"
                  label="PR / Citizenship"
                  description="Upload clear photos of your Permanent Resident card or US Citizenship document (e.g., PR card front & back, Certificate of Naturalization)."
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
