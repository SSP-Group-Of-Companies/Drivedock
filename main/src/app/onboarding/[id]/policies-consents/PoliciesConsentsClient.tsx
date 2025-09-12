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
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationBlocked, setLocationBlocked] = useState(false);

  // initial values
  const initialSignature = policiesConsents.signature as UploadResult | undefined;
  const initialSendByEmail = policiesConsents.sendPoliciesByEmail || false;

  // Signature ref
  const sigRef = useRef<SignatureBoxHandle>(null);

  // Location permission function
  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setUserLocation(location);
        setLocationBlocked(false); // Reset blocked state if location is successfully obtained
        // Continue with form submission, passing the location directly
        proceedWithSubmission(location);
      },
      (error) => {
        // Handle different types of geolocation errors
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationBlocked(true);
            break;
          case error.POSITION_UNAVAILABLE:
            // Location unavailable - could be temporary, don't block permanently
            break;
          case error.TIMEOUT:
            // Timeout - could be temporary, don't block permanently
            break;
          default:
            // Unknown error - don't block permanently
            break;
        }
        
        // Don't show alert or console.error - just set the blocked state and show visual feedback
        // Don't proceed - user must grant permission
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout for better accuracy
        maximumAge: 0 // Force fresh GPS reading, no cache
      }
    );
  };

  const proceedWithSubmission = async (locationData?: { latitude: number; longitude: number }) => {
    setSubmitting(true);
    try {
      const finalSig = await sigRef.current?.ensureUploaded();

      if (!finalSig?.s3Key || !finalSig?.url) {
        setSubmitting(false);
        return;
      }

      // Use the passed location data or fall back to userLocation state
      const locationToSend = locationData || userLocation;

      const requestBody = {
        signature: { s3Key: finalSig.s3Key, url: finalSig.url },
        sendPoliciesByEmail,
        location: locationToSend, // Include location data
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

    // If neither signature nor email choice changed, jump forward
    const sigDirty = sigRef.current?.isDirty() ?? false;
    if (!sigDirty && sendPoliciesByEmail === initialSendByEmail) {
      // Still need location even if nothing changed
      if (!userLocation) {
        requestLocationPermission();
        return;
      }
      // Proceed with existing location
      proceedWithSubmission();
      return;
    }

    // Check if we have location, if not request it
    if (!userLocation) {
      requestLocationPermission();
      return;
    }

    // Proceed with submission
    proceedWithSubmission();
  };

  if (!mounted || !company) return null;

  // 1 helper → the exact ordered list for this company (policy → region → hiring)
  const pdfs = getPoliciesPdfsForCompany("ssp-us" as ECompanyId);

  return (
    <div className="space-y-6">
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

      {locationBlocked && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h4 className="font-medium text-red-900 mb-1">Location Access Required</h4>
              <p className="text-sm text-red-700">
                Location access has been denied. Please enable location permissions in your browser settings and refresh the page to continue with your application.
              </p>
              <p className="text-xs text-red-600 mt-2">
                <strong>How to enable:</strong> Click the location icon in your browser&apos;s address bar, or go to Settings → Privacy → Location → Allow
              </p>
            </div>
          </div>
        </div>
      )}

      <PoliciesSubmitSection onSubmit={handleSubmit} submitting={submitting} disabled={locationBlocked} />
    </div>
  );
}
