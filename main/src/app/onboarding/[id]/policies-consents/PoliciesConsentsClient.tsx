"use client";

import { CanadianCompanyId, getCompanyById } from "@/constants/companies";
import { IPoliciesConsents } from "@/types/policiesConsents.types";
import { ITrackerContext } from "@/types/onboardingTracker.type";
import { ES3Folder } from "@/types/aws.types";
import { UploadResult, uploadToS3Presigned } from "@/lib/utils/s3Upload";

import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";

import Image from "next/image";
import { useRef, useState } from "react";
import { ExternalLink, Signature, Trash, X } from "lucide-react";
import { ECountryCode } from "@/types/shared.types";
import {
    CANADIAN_HIRING_PDFS,
    CANADIAN_PDFS,
    US_PDFS,
} from "@/constants/policiesConsentsPdfs";
import SignatureCanvas from "react-signature-canvas";
import dynamic from "next/dynamic";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";

export type PoliciesConsentsClientProps = {
    policiesConsents: Partial<IPoliciesConsents>;
    onboardingContext: ITrackerContext;
};

export default function PoliciesConsentsClient({
    policiesConsents,
    onboardingContext,
}: PoliciesConsentsClientProps) {
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
    const [signatureData, setSignatureData] = useState(policiesConsents.signature);
    const [sendPoliciesByEmail, setSendPoliciesByEmail] = useState<boolean>(policiesConsents.sendPoliciesByEmail || false);

    const [uploadStatus, setUploadStatus] = useState<
        "idle" | "uploading" | "deleting" | "error"
    >("idle");
    const [uploadMessage, setUploadMessage] = useState<string>("");

    const canvasRef = useRef<SignatureCanvas>(null);

    const [isDrawnSignature, setIsDrawnSignature] = useState(false);

    const PdfViewerModal = dynamic(() => import("@/components/PdfViewerModal"), {
        ssr: false, // ✅ Client-side only
    });

    const [submitting, setSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (file: File | null) => {
        if (!file) return;
        setUploadStatus("uploading");
        setUploadMessage("");

        try {
            const result = await uploadToS3Presigned({
                file,
                folder: ES3Folder.SIGNATURES,
                trackerId: id,
            });

            setSignatureData(result);

            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setSignaturePreview(result);
            };
            reader.readAsDataURL(file);

            setUploadStatus("idle");
            setUploadMessage("Upload successful");
        } catch (err: any) {
            console.error("Signature upload failed", err);
            setUploadStatus("error");
            setUploadMessage(err.message || "Upload failed");
        }
    };

    const handleClear = async () => {
        setUploadStatus("deleting");
        setUploadMessage("");

        // Delete from AWS if uploaded
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

        // Reset state
        setSignaturePreview(null);
        setSignatureData(undefined);
        setIsDrawnSignature(false);
        console.log(canvasRef.current);
        canvasRef.current?.clear();
        setUploadStatus("idle");
    };



    const handleSubmit = async () => {
        setUploadStatus("uploading");
        setUploadMessage("");

        // ✅ Upload if a drawn signature is present but not uploaded yet
        let result: UploadResult | null = null;
        if (!signatureData?.s3Key && isDrawnSignature && canvasRef.current && !canvasRef.current.isEmpty()) {
            try {
                const dataUrl = canvasRef.current.getTrimmedCanvas().toDataURL("image/png");
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], "drawn-signature.png", { type: "image/png" });

                result = await uploadToS3Presigned({
                    file,
                    folder: ES3Folder.SIGNATURES,
                    trackerId: id,
                });

                setSignatureData(result);

                const reader = new FileReader();
                reader.onload = (e) => {
                    const result = e.target?.result as string;
                    setSignaturePreview(result);
                };
                reader.readAsDataURL(file);

                // Reset drawn flag
                setIsDrawnSignature(false);
            } catch (err: any) {
                console.error("Signature upload failed", err);
                setUploadStatus("error");
                setUploadMessage("Failed to upload your signature. Please try again.");
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
            const response = await fetch(`/api/v1/onboarding/${id}/policies-consents`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    signature: {
                        s3Key: finalSignature.s3Key,
                        url: finalSignature.url,
                    },
                    sendPoliciesByEmail,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data?.message || "Failed to save signature.");
            }

            router.replace(`/onboarding/${id}/drive-test`);
        } catch (error: any) {
            console.error("Submit failed", error);
            setUploadMessage(error.message || "Submission failed.");
            setUploadStatus("error");
        } finally {
            setSubmitting(false);
            setUploadStatus("idle");
        }
    };



    return (
        <div className="space-y-6">
            {/* PDF Grid */}
            <div className="flex flex-wrap gap-4 justify-center">
                {[hiringPdf, ...pdfList].filter(Boolean).map((pdf) => pdf && (
                    <button
                        key={pdf.label}
                        onClick={() => setModalUrl(pdf.path)}
                        title={`View ${pdf.label}`}
                        className="relative w-full rounded-xl bg-white hover:shadow-md ring-1 ring-gray-200 px-4 py-3 cursor-pointer transition-all flex items-center text-center overflow-hidden"
                    >
                        <div className="absolute top-[1px] left-[-24px] transform -rotate-45 bg-red-500 text-white text-[12px] px-6 py-[3px] font-bold shadow-sm rounded-sm pointer-events-none select-none overflow-hidden">
                            PDF
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shine" />
                        </div>
                        <span className="text-sm text-gray-700 font-medium leading-tight flex-1">
                            {pdf.label}
                        </span>
                        <ExternalLink />
                    </button>
                ))}
            </div>


            {/* Info Text */}
            <p className="text-sm text-gray-600 text-center max-w-xl mx-auto">
                {t("form.step3.disclaimer", "By signing below, you agree to all the contract here and future contracts. Please read all documents carefully. Your provided information will automatically prefill required fieldss.")}
            </p>

            {/* Signature Drawing or Preview */}
            <div className="border-2 border-black w-full max-w-xl h-48 mx-auto rounded-md bg-white relative flex items-center justify-center">
                <SignatureCanvas
                    ref={canvasRef}
                    penColor="black"
                    onEnd={() => setIsDrawnSignature(true)}
                    canvasProps={{
                        width: 600,
                        height: 180,
                        className: "bg-white w-full h-full rounded",
                    }}
                />

                {signaturePreview && (
                    <Image
                        src={signaturePreview}
                        alt="Signature Preview"
                        fill
                        className="object-contain p-2 absolute inset-0 z-10 bg-white"
                    />
                )}
            </div>

            <p className="text-sm text-gray-600 text-center mt-2">
                Please <strong>draw</strong> your signature above or <strong>upload</strong> a signature image.
            </p>

            {/* Buttons */}
            <div className="flex justify-center gap-4">
                <button
                    onClick={() => {
                        if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                            fileInputRef.current.click();
                        }
                    }}
                    disabled={uploadStatus === "uploading" || uploadStatus === "deleting"}
                    className="px-4 py-2 rounded-md hover:bg-gray-100 transition text-sm flex items-center gap-1 cursor-pointer"
                >
                    <Signature className="inline-block w-4 h-4 mr-1" />
                    {t("form.actions.upload", "Upload")}
                </button>

                <button
                    onClick={handleClear}
                    className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition text-sm flex items-center gap-1 cursor-pointer"
                    disabled={uploadStatus === "uploading" || uploadStatus === "deleting"}
                >
                    <Trash className="inline-block w-4 h-4 mr-1" />
                    {t("form.actions.clear", "Clear")}
                </button>
            </div>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files?.[0] || null)}
            />

            {/* Upload Feedback */}
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

            {/* Modal */}
            <AnimatePresence>
                {modalUrl && (
                    <Dialog
                        open={true}
                        onClose={() => setModalUrl(null)}
                        className="relative z-50"
                    >
                        {/* Overlay */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/40"
                            aria-hidden="true"
                        />

                        {/* Centered Modal Wrapper */}

                        <div className="fixed inset-0 flex items-center justify-center p-4">
                            <Dialog.Panel className="w-full max-w-3xl h-[calc(100vh-50px)] rounded-lg shadow-xl overflow-hidden flex flex-col">
                                <motion.div
                                    initial={{ y: 30, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 30, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col h-full"
                                >
                                    {/* Header */}
                                    <div className="md:bg-white flex justify-end items-center p-2 shrink-0">
                                        <button
                                            onClick={() => setModalUrl(null)}
                                            className="bg-red-500 text-white rounded-full w-10 h-10 md:w-6 md:h-6 flex items-center justify-center text-xs hover:bg-red-600 cursor-pointer"
                                        >
                                            <X className="md:scale-[.8]" />
                                        </button>
                                    </div>

                                    {/* Scrollable PDF Content */}
                                    <div
                                        className="overflow-y-auto flex-1 h-full bg-white"
                                        onContextMenu={(e) => e.preventDefault()}
                                    >
                                        <PdfViewerModal pdfUrl={modalUrl} />
                                    </div>
                                </motion.div>
                            </Dialog.Panel>

                        </div>
                    </Dialog>
                )}
            </AnimatePresence>
            <div className="flex items-start justify-center mt-4">
                <input
                    type="checkbox"
                    checked={sendPoliciesByEmail}
                    onChange={(e) => setSendPoliciesByEmail(e.target.checked)}
                    className="h-5 w-5 text-blue-600 border-gray-300 rounded cursor-pointer"
                />
                <label
                    onClick={() => setSendPoliciesByEmail((prev) => !prev)}
                    className="ml-2 text-sm text-gray-700 cursor-pointer select-none"
                >
                    {t(
                        "form.policies.sendToEmail",
                        "Send me a copy of these policy documents to my email after completing the application."
                    )}
                </label>
            </div>
            <div className="flex justify-center">


                <button
                    type="button"
                    onClick={handleSubmit}
                    className={`px-8 py-2 mt-6 rounded-full font-semibold transition-colors shadow-md flex items-center gap-2 cursor-pointer
        ${submitting
                            ? "bg-gray-400 text-white cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 text-white hover:opacity-90"
                        }
    `}
                >
                    {submitting ? t("form.submitting") : t("form.continue")}
                </button>

            </div>

        </div>
    );
}
