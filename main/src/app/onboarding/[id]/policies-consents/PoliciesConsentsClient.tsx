"use client";

import { CanadianCompanyId, getCompanyById } from "@/constants/companies";
import { IPoliciesConsents } from "@/types/policiesConsents.types";
import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { ES3Folder } from "@/types/aws.types";
import { UploadResult } from "@/lib/utils/s3Upload";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";

import PoliciesPdfGrid from "./components/PoliciesPdfGrid";
import PoliciesConsentCheckbox from "./components/PoliciesConsentCheckbox";
import PoliciesSubmitSection from "./components/PoliciesSubmitSection";
import PoliciesPdfViewerModal from "./components/PoliciesPdfViewerModal";
import { CANADIAN_HIRING_PDFS, CANADIAN_PDFS, US_PDFS } from "@/constants/policiesConsentsPdfs";
import { ECountryCode } from "@/types/shared.types";
import useMounted from "@/hooks/useMounted";

// NEW: encapsulated signature component
import SignatureBox, { type SignatureBoxHandle } from "@/components/react-canvas/SignatureBox";

export type PoliciesConsentsClientProps = {
  policiesConsents: Partial<IPoliciesConsents>;
  onboardingContext: IOnboardingTrackerContext;
};

export default function PoliciesConsentsClient({ policiesConsents, onboardingContext }: PoliciesConsentsClientProps) {
  const mounted = useMounted();
  const router = useRouter();
  const { t } = useTranslation("common");

  const company = getCompanyById(onboardingContext.companyId);
  const isCanadianApplicant = company?.countryCode === ECountryCode.CA;
  const pdfList = isCanadianApplicant ? CANADIAN_PDFS : US_PDFS;
  const hiringPdf = isCanadianApplicant ? CANADIAN_HIRING_PDFS[company.id as CanadianCompanyId] : null;

  const id = onboardingContext.id;

  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [sendPoliciesByEmail, setSendPoliciesByEmail] = useState<boolean>(policiesConsents.sendPoliciesByEmail || false);
  const [submitting, setSubmitting] = useState(false);

  // Keep initial values for "no changes? just navigate forward"
  const initialSignature = policiesConsents.signature as UploadResult | undefined;
  const initialSendByEmail = policiesConsents.sendPoliciesByEmail || false;

  // Ref for imperative API
  const sigRef = useRef<SignatureBoxHandle>(null);

  const handleSubmit = async () => {
    // If neither signature nor email choice changed, jump forward.
    const sigDirty = sigRef.current?.isDirty() ?? false;
    if (!sigDirty && sendPoliciesByEmail === initialSendByEmail) {
      router.push(`/onboarding/${id}/drive-test`);
      return;
    }

    setSubmitting(true);
    try {
      // Ensure we have an uploaded signature if the user drew one.
      const finalSig = await sigRef.current?.ensureUploaded();

      if (!finalSig?.s3Key || !finalSig?.url) {
        // The component already shows an error message if needed.
        setSubmitting(false);
        return;
      }

      const response = await fetch(`/api/v1/onboarding/${id}/policies-consents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: { s3Key: finalSig.s3Key, url: finalSig.url },
          sendPoliciesByEmail,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to save signature.");
      }

      router.push(`/onboarding/${id}/drive-test`);
    } catch (error: any) {
      console.error("Submit failed", error);
      // The SignatureBox already surfaces its own errors for signature;
      // we only need to surface request errors here:
      alert(error?.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <PoliciesPdfGrid pdfs={[hiringPdf!, ...pdfList].filter(Boolean)} onOpenModal={setModalUrl} />

      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <p className="text-sm text-gray-700 text-center">
          {t(
            "form.step3.disclaimer",
            "By signing below, you agree to all the contract here and future contracts. Please read all documents carefully. Your provided information will automatically prefill required fields."
          )}
        </p>
      </div>

      {/* NEW: Self-contained signature box (draw + upload + clear + temp cleanup) */}
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

      <PoliciesSubmitSection onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
