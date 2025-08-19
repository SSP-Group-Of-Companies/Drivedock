"use client";

import { CanadianCompanyId, getCompanyById } from "@/constants/companies";
import { IPoliciesConsents } from "@/types/policiesConsents.types";
import { ITrackerContext } from "@/types/onboardingTracker.types";
import { ES3Folder } from "@/types/aws.types";
import { UploadResult, uploadToS3Presigned } from "@/lib/utils/s3Upload";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";

// TYPE-ONLY import (does not touch server bundle)
import type ReactSignatureCanvas from "react-signature-canvas";

import PoliciesPdfGrid from "./components/PoliciesPdfGrid";
import PoliciesSignatureBox from "./components/PoliciesSignatureBox";
import PoliciesUploadButtons from "./components/PoliciesUploadButtons";
import PoliciesConsentCheckbox from "./components/PoliciesConsentCheckbox";
import PoliciesSubmitSection from "./components/PoliciesSubmitSection";
import PoliciesPdfViewerModal from "./components/PoliciesPdfViewerModal";

import {
  CANADIAN_HIRING_PDFS,
  CANADIAN_PDFS,
  US_PDFS,
} from "@/constants/policiesConsentsPdfs";
import { ECountryCode } from "@/types/shared.types";
import useMounted from "@/hooks/useMounted";

export type PoliciesConsentsClientProps = {
  policiesConsents: Partial<IPoliciesConsents>;
  onboardingContext: ITrackerContext;
};

export default function PoliciesConsentsClient({
  policiesConsents,
  onboardingContext,
}: PoliciesConsentsClientProps) {
  const mounted = useMounted();
  const router = useRouter();
  const { t } = useTranslation("common");

  const company = getCompanyById(onboardingContext.companyId);
  const isCanadianApplicant = company?.countryCode === ECountryCode.CA;
  const pdfList = isCanadianApplicant ? CANADIAN_PDFS : US_PDFS;
  const hiringPdf = isCanadianApplicant
    ? CANADIAN_HIRING_PDFS[company.id as CanadianCompanyId]
    : null;

  const id = onboardingContext.id;

  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(
    policiesConsents.signature?.url || null
  );

  const [signatureData, setSignatureData] = useState(
    policiesConsents.signature
  );
  const [sendPoliciesByEmail, setSendPoliciesByEmail] = useState<boolean>(
    policiesConsents.sendPoliciesByEmail || false
  );
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "deleting" | "error"
  >("idle");
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [isDrawnSignature, setIsDrawnSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [initialSignatureKey] = useState(signatureData?.s3Key || null);
  const [initialSendByEmail] = useState(
    policiesConsents.sendPoliciesByEmail || false
  );

  // Ref now uses the TYPE, not the value
  const canvasRef = useRef<ReactSignatureCanvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // helper: only deletes temp objects
  async function deleteIfTemp(s3Key?: string) {
    if (!s3Key || !s3Key.startsWith("temp-files/")) return;
    await fetch("/api/v1/delete-temp-files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: [s3Key] }),
    });
  }

  const handleUpload = async (file: File | null) => {
    if (!file || uploadStatus === "uploading" || uploadStatus === "deleting")
      return;

    setUploadStatus("uploading");
    setUploadMessage("");

    // keep a reference to previous (may be temp or finalized)
    const prevKey = signatureData?.s3Key;

    try {
      // 1) upload the new file
      const result = await uploadToS3Presigned({
        file,
        folder: ES3Folder.SIGNATURES,
        trackerId: id,
      });

      // 2) preview new file immediately
      const reader = new FileReader();
      reader.onload = (e) =>
        setSignaturePreview((e.target?.result as string) ?? null);
      reader.readAsDataURL(file);

      // 3) switch state to the new file
      setSignatureData(result);
      setIsDrawnSignature(false);

      // 4) best-effort cleanup of the previous temp (non-blocking UX)
      try {
        await deleteIfTemp(prevKey);
      } catch (cleanupErr) {
        console.warn("Failed to delete previous temp signature:", cleanupErr);
      }

      if (!uploadMessage) setUploadMessage("Upload successful");
      setUploadStatus("idle");
    } catch (err: any) {
      console.error("Signature upload failed", err);
      setUploadStatus("error");
      setUploadMessage(err?.message || "Upload failed");
    } finally {
      // allow re-selecting the same file to trigger onChange again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClear = async () => {
    setUploadStatus("deleting");
    setUploadMessage("");

    const s3Key = signatureData?.s3Key;
    if (s3Key?.startsWith("temp-files/")) {
      try {
        await fetch("/api/v1/delete-temp-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: [s3Key] }),
        });
      } catch (err) {
        console.error("Failed to delete temp file", err);
        setUploadStatus("error");
        setUploadMessage("Delete failed");
      }
    }

    setSignaturePreview(null);
    setSignatureData(undefined);
    setIsDrawnSignature(false);
    try {
      canvasRef.current?.clear();
    } catch {
      /* no-op */
    }
    setUploadStatus("idle");
  };

  /**
   * Robust trimming that avoids react-signature-canvas's getTrimmedCanvas()
   * 1) Read the visible canvas
   * 2) Scan pixels for non-transparent bounds
   * 3) Copy onto a white-backed canvas (no alpha)
   */
  async function getSignatureBlobFromCanvas(
    sig: ReactSignatureCanvas
  ): Promise<Blob> {
    const source = sig.getCanvas(); // the raw drawing canvas
    const w = source.width;
    const h = source.height;

    const ctx = source.getContext("2d");
    if (!ctx) {
      // Fallback: export the raw canvas without trimming
      return await new Promise<Blob>(
        (resolve) => source.toBlob((b) => resolve(b as Blob), "image/png")!
      );
    }

    // Read pixel data
    let imgData: ImageData;
    try {
      imgData = ctx.getImageData(0, 0, w, h);
    } catch {
      // Some browsers/security contexts can throw; fallback to raw
      return await new Promise<Blob>(
        (resolve) => source.toBlob((b) => resolve(b as Blob), "image/png")!
      );
    }

    const data = imgData.data;

    // Find bounds of non-transparent pixels
    let top = -1,
      left = -1,
      right = -1,
      bottom = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const alpha = data[idx + 3];
        if (alpha !== 0) {
          if (top === -1) top = y;
          if (left === -1 || x < left) left = x;
          if (right === -1 || x > right) right = x;
          bottom = y;
        }
      }
    }

    // If canvas is empty or all transparent, just export a small white image to signal "empty"
    if (top === -1) {
      const empty = document.createElement("canvas");
      empty.width = 300;
      empty.height = 120;
      const ectx = empty.getContext("2d")!;
      ectx.fillStyle = "#ffffff";
      ectx.fillRect(0, 0, empty.width, empty.height);
      return await new Promise<Blob>(
        (resolve) => empty.toBlob((b) => resolve(b as Blob), "image/png")!
      );
    }

    const trimW = right - left + 1;
    const trimH = bottom - top + 1;

    // Create output canvas with white background (no transparency)
    const out = document.createElement("canvas");
    out.width = trimW;
    out.height = trimH;

    const octx = out.getContext("2d")!;
    octx.fillStyle = "#ffffff";
    octx.fillRect(0, 0, trimW, trimH);
    octx.drawImage(source, left, top, trimW, trimH, 0, 0, trimW, trimH);

    return await new Promise<Blob>(
      (resolve) => out.toBlob((b) => resolve(b as Blob), "image/png")!
    );
  }

  const handleSubmit = async () => {
    // No changes? Navigate forward.
    if (
      !isDrawnSignature &&
      signatureData?.s3Key === initialSignatureKey &&
      sendPoliciesByEmail === initialSendByEmail
    ) {
      router.push(`/onboarding/${id}/drive-test`);
      return;
    }

    setUploadStatus("uploading");
    setUploadMessage("");

    let result: UploadResult | null = null;

    // If user drew a signature (or we have no uploaded signature), export from canvas
    if (
      (!signatureData?.s3Key || isDrawnSignature) &&
      canvasRef.current &&
      typeof canvasRef.current.isEmpty === "function" &&
      !canvasRef.current.isEmpty()
    ) {
      try {
        // ✅ Use robust trimming instead of getTrimmedCanvas()
        const blob = await getSignatureBlobFromCanvas(canvasRef.current);
        const file = new File([blob], "signature.png", { type: "image/png" });

        result = await uploadToS3Presigned({
          file,
          folder: ES3Folder.SIGNATURES,
          trackerId: id,
        });
        setSignatureData(result);

        const reader = new FileReader();
        reader.onload = (e) =>
          setSignaturePreview((e.target?.result as string) ?? null);
        reader.readAsDataURL(file);

        setIsDrawnSignature(false);
      } catch (err: any) {
        console.error("Signature upload failed", err);
        setUploadStatus("error");
        setUploadMessage(
          "Failed to process or upload your signature. Please try again."
        );
        return;
      }
    }

    const finalSignature = signatureData || result;

    if (!finalSignature?.s3Key || !finalSignature?.url) {
      setUploadStatus("error");
      setUploadMessage("Please draw or upload a signature before continuing.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/v1/onboarding/${id}/policies-consents`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signature: { s3Key: finalSignature.s3Key, url: finalSignature.url },
            sendPoliciesByEmail,
          }),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.message || "Failed to save signature.");
      }
      router.push(`/onboarding/${id}/drive-test`);
    } catch (error: any) {
      console.error("Submit failed", error);
      setUploadMessage(error.message || "Submission failed.");
      setUploadStatus("error");
    } finally {
      setSubmitting(false);
      setUploadStatus("idle");
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <PoliciesPdfGrid
        pdfs={[hiringPdf!, ...pdfList].filter(Boolean)}
        onOpenModal={setModalUrl}
      />

      <div className="rounded-xl bg-gray-50/60 ring-1 ring-gray-100 p-4">
        <p className="text-sm text-gray-700 text-center">
          {t(
            "form.step3.disclaimer",
            "By signing below, you agree to all the contract here and future contracts. Please read all documents carefully. Your provided information will automatically prefill required fields."
          )}
        </p>
      </div>

      <PoliciesSignatureBox
        canvasRef={canvasRef}
        signaturePreview={signaturePreview}
        onDrawEnd={() => setIsDrawnSignature(true)}
      />

      <p className="text-sm text-gray-600 text-center mt-2">
        Please <strong>draw</strong> your signature above or{" "}
        <strong>upload</strong> a signature image.
      </p>

      <PoliciesUploadButtons
        onUploadClick={() => {
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.click();
          }
        }}
        onClearClick={handleClear}
        disabled={uploadStatus === "uploading" || uploadStatus === "deleting"}
        t={t}
      />

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files?.[0] || null)}
      />

      {(uploadStatus === "uploading" || uploadStatus === "deleting") && (
        <p className="text-yellow-600 text-sm text-center flex items-center justify-center gap-2">
          <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></span>
          {uploadStatus === "uploading" ? "Uploading..." : "Deleting..."}
        </p>
      )}
      {uploadStatus === "error" && (
        <p className="text-red-500 text-sm text-center">{uploadMessage}</p>
      )}
      {uploadStatus === "idle" && uploadMessage && (
        <p className="text-green-600 text-sm text-center">{uploadMessage}</p>
      )}

      <PoliciesPdfViewerModal
        modalUrl={modalUrl}
        onClose={() => setModalUrl(null)}
      />

      <PoliciesConsentCheckbox
        checked={sendPoliciesByEmail}
        onChange={setSendPoliciesByEmail}
      />

      <PoliciesSubmitSection onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
