"use client";

import { getCompanyById, ECompanyId } from "@/constants/companies";
import { getPoliciesPdfsForCompany } from "@/constants/policiesConsentsPdfs";
import { IPoliciesConsents } from "@/types/policiesConsents.types";
import { EStepPath, IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { ES3Folder } from "@/types/aws.types";
import { UploadResult } from "@/lib/utils/s3Upload";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";

import PoliciesPdfGrid from "./components/PoliciesPdfGrid";
import PoliciesConsentCheckbox from "./components/PoliciesConsentCheckbox";
import PoliciesSubmitSection from "./components/PoliciesSubmitSection";
import PoliciesPdfViewerModal from "./components/PoliciesPdfViewerModal";
import useMounted from "@/hooks/useMounted";

// Self-contained signature component
import SignatureBox, { type SignatureBoxHandle } from "@/components/react-canvas/SignatureBox";
import { buildOnboardingNextStepPath } from "@/lib/utils/onboardingUtils";

export type PoliciesConsentsClientProps = {
  policiesConsents: Partial<IPoliciesConsents>;
  onboardingContext: IOnboardingTrackerContext;
};

export default function PoliciesConsentsClient({ policiesConsents, onboardingContext }: PoliciesConsentsClientProps) {
  const mounted = useMounted();
  const router = useRouter();
  const { t } = useTranslation("common");

  const company = getCompanyById(onboardingContext.companyId as ECompanyId);
  const id = onboardingContext.id;

  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [sendPoliciesByEmail, setSendPoliciesByEmail] = useState<boolean>(policiesConsents.sendPoliciesByEmail || false);
  const [submitting, setSubmitting] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [locationToggleEnabled, setLocationToggleEnabled] = useState(false);

  // initial values
  const initialSignature = policiesConsents.signature as UploadResult | undefined;

  // Signature ref
  const sigRef = useRef<SignatureBoxHandle>(null);

  // Don't auto-request location - wait for user to click "Allow" button

  // Handle toggle change
  const handleLocationToggle = (enabled: boolean) => {
    setLocationToggleEnabled(enabled);
    if (enabled) {
      setLocationRequested(true);
      requestLocationPermission().then((location) => {
        if (location) {
          setUserLocation(location);
        }
      });
    }
  };

  // Location permission function - returns a promise
  const requestLocationPermission = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationBlocked(true);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocationBlocked(false);
          resolve(location);
        },
        (error) => {
          // Handle different types of geolocation errors
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationBlocked(true);
              break;
            case error.POSITION_UNAVAILABLE:
            case error.TIMEOUT:
            default:
              // Don't block permanently for temporary issues
              break;
          }
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  const proceedWithSubmission = async () => {
    try {
      const finalSig = await sigRef.current?.ensureUploaded();

      if (!finalSig?.s3Key || !finalSig?.url || !finalSig?.mimeType) {
        // SignatureBox shows its own error; nothing to do here
        setSubmitting(false);
        return;
      }

      // Always get fresh location at submission time for maximum accuracy
      const locationToSend = await requestLocationPermission();
      if (!locationToSend) {
        setSubmitting(false);
        return; // Can't proceed without location
      }

      // Send form data with location
      const requestBody = {
        signature: finalSig,
        sendPoliciesByEmail,
        location: locationToSend,
      };

      const response = await fetch(`/api/v1/onboarding/${id}/policies-consents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to save signature.");
      }

      // Success - navigate to next step
      router.push(buildOnboardingNextStepPath(onboardingContext, EStepPath.POLICIES_CONSENTS));
    } catch (error: any) {
      console.error("Submit failed", error);
      alert(error?.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    // If location is blocked, don't proceed (button should be disabled anyway)
    if (locationBlocked) {
      return;
    }

    // Check if location toggle is enabled
    if (!locationToggleEnabled) {
      // Scroll to top to show the location card
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // Immediately set submitting state for responsive UI
    setSubmitting(true);

    // Proceed with submission (location will be captured in background)
    proceedWithSubmission();
  };

  if (!mounted || !company) return null;

  // 1 helper → the exact ordered list for this company (policy → region → hiring)
  const pdfs = getPoliciesPdfsForCompany("ssp-us" as ECompanyId);

  return (
    <div className="space-y-6">
      {/* Location verification cards at the top */}
      {!locationRequested && !userLocation && !locationBlocked && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">Location Verification Required</h4>
              <p className="text-sm text-blue-700">We need to verify your location to complete your application. Toggle on to allow location access.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={locationToggleEnabled} onChange={(e) => handleLocationToggle(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      )}

      {locationRequested && !userLocation && !locationBlocked && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Confirming Page Access</h4>
              <p className="text-sm text-blue-700">Please allow location access when prompted to verify your location for application completion.</p>
            </div>
          </div>
        </div>
      )}

      {locationBlocked && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <h4 className="font-medium text-red-900 mb-1">Location Verification Required</h4>
              <p className="text-sm text-red-700">
                Location access is required to verify your location for application completion. Please enable location permissions in your browser settings and refresh the page.
              </p>
              <p className="text-xs text-red-600 mt-2">
                <strong>How to enable:</strong> Click the location icon in your browser&apos;s address bar, or go to Settings → Privacy → Location → Allow
              </p>
            </div>
          </div>
        </div>
      )}

      <PoliciesPdfGrid pdfs={pdfs} onOpenModal={setModalUrl} />

      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <p className="text-sm text-gray-700 text-center">
          {t(
            "form.step3.disclaimer",
            "By signing below, you agree to all the contract here and future contracts. Please read all documents carefully. Your provided information will automatically prefill required fields."
          )}
        </p>
      </div>

      <SignatureBox
        ref={sigRef}
        trackerId={id}
        s3Folder={ES3Folder.SIGNATURES}
        initialSignature={initialSignature ?? null}
        labels={{
          hint: "Sign inside the box",
          upload: t("actions.upload", "Upload"),
          clear: t("actions.clear", "Clear"),
          uploading: t("status.uploading", "Uploading..."),
          deleting: t("status.deleting", "Deleting..."),
          uploadSuccess: t("status.uploadSuccess", "Upload successful"),
          uploadFailedGeneric: t("errors.signatureUploadFailed", "Failed to process or upload your signature. Please try again."),
          mustSignOrUpload: t("errors.signatureRequired", "Please draw or upload a signature before continuing."),
        }}
      />

      <p className="text-sm text-gray-600 text-center -mt-2">
        Please <strong>draw</strong> your signature above or <strong>upload</strong> a signature image.
      </p>

      <PoliciesPdfViewerModal modalUrl={modalUrl} onClose={() => setModalUrl(null)} />

      <PoliciesConsentCheckbox checked={sendPoliciesByEmail} onChange={setSendPoliciesByEmail} />

      <PoliciesSubmitSection onSubmit={handleSubmit} submitting={submitting} disabled={locationBlocked} />
    </div>
  );
}
