"use client";

import { CanadianCompanyId, getCompanyById } from "@/constants/companies";
import { IPoliciesConsents } from "@/types/policiesConsents.types";
import { ITrackerContext } from "@/types/onboardingTracker.type";
import { ES3Folder } from "@/types/aws.types";
import { uploadToS3Presigned } from "@/lib/utils/s3Upload";

import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";

import Image from "next/image";
import { useRef, useState } from "react";
import { Signature, Trash, X } from "lucide-react";
import { ECountryCode } from "@/types/shared.types";
import {
    CANADIAN_HIRING_PDFS,
    CANADIAN_PDFS,
    US_PDFS,
} from "@/constants/policiesConsentsPdfs";
import SignatureCanvas from "react-signature-canvas";

export type PoliciesConsentsClientProps = {
    policiesConsents: Partial<IPoliciesConsents>;
    onboardingContext: ITrackerContext;
};

export default function PoliciesConsentsClient({
    policiesConsents,
    onboardingContext,
}: PoliciesConsentsClientProps) {
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
    const [uploadStatus, setUploadStatus] = useState<
        "idle" | "uploading" | "deleting" | "error"
    >("idle");
    const [uploadMessage, setUploadMessage] = useState<string>("");

    const [showDrawModal, setShowDrawModal] = useState(false);
    const canvasRef = useRef<SignatureCanvas>(null);

    // Handler to convert drawn signature to image and upload
    const handleSaveDrawnSignature = async () => {
        const canvas = canvasRef.current;
        if (!canvas || canvas.isEmpty()) {
            alert("Please draw a signature first.");
            return;
        }

        const dataUrl = canvas.getTrimmedCanvas().toDataURL("image/png");
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "drawn-signature.png", { type: "image/png" });

        setShowDrawModal(false);
        handleUpload(file);
    };


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
        setUploadStatus("idle");
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!company) {
        return (
            <div className="p-6 text-center text-red-600 font-semibold">
                Invalid company ID. Please contact support.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* PDF Grid */}
            <div className="flex flex-wrap gap-4 justify-center">
                {[hiringPdf, ...pdfList].filter(Boolean).map((pdf) => pdf && (
                    <div
                        key={pdf.label}
                        onClick={() => setModalUrl(pdf.path)}
                        className="relative w-full sm:w-[180px] h-[72px] sm:h-[100px] rounded-xl bg-white hover:shadow-md ring-1 ring-gray-200 px-4 py-3 cursor-pointer transition-all flex items-center justify-center text-center overflow-hidden"
                    >
                        <div className="absolute top-[0px] left-[-24px] transform -rotate-45 bg-red-500 text-white text-[12px] px-6 py-[3px] font-bold shadow-sm rounded-sm pointer-events-none select-none overflow-hidden">
                            PDF
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shine" />
                        </div>
                        <span className="text-sm text-gray-700 font-medium leading-tight">
                            {pdf.label}
                        </span>
                    </div>
                ))}
            </div>


            {/* Info Text */}
            <p className="text-sm text-gray-600 text-center max-w-xl mx-auto">
                By signing below, you agree to all the contract here and future contracts.
                Please read all documents carefully. Your provided information will
                automatically prefill required fields.
            </p>

            {/* Signature Preview */}
            <div className="border-2 border-black w-full max-w-xl h-48 mx-auto rounded-md bg-white relative">
                {signaturePreview && (
                    <Image
                        src={signaturePreview}
                        alt="Signature Preview"
                        fill
                        className="object-contain p-2"
                    />
                )}
            </div>

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
                    Upload
                </button>

                <button
                    onClick={() => setShowDrawModal(true)}
                    className="px-4 py-2 rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50 transition text-sm"
                    disabled={uploadStatus === "uploading" || uploadStatus === "deleting"}
                >
                    ✍️ Draw
                </button>

                <button
                    onClick={handleClear}
                    className="px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 transition text-sm flex items-center gap-1 cursor-pointer"
                    disabled={!signatureData || uploadStatus === "uploading" || uploadStatus === "deleting"}
                >
                    <Trash className="inline-block w-4 h-4 mr-1" />
                    Clear
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
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/40"
                            aria-hidden="true"
                        />
                        <div className="fixed inset-0 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 30, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white w-full max-w-3xl h-[80vh] rounded-lg shadow-xl overflow-hidden"
                            >
                                <div className="relative w-full h-full">
                                    <div className="absolute top-0 left-0 right-0 z-10 bg-white flex justify-end items-center p-2">
                                        <button
                                            onClick={() => setModalUrl(null)}
                                            className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 cursor-pointer"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <iframe
                                        src={modalUrl}
                                        title="PDF Preview"
                                        className="w-full h-full border-none "
                                    />
                                </div>

                            </motion.div>
                        </div>
                    </Dialog>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showDrawModal && (
                    <Dialog open={true} onClose={() => setShowDrawModal(false)} className="relative z-50">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/40"
                            aria-hidden="true"
                        />

                        <div className="fixed inset-0 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 30, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden p-2 "
                            >
                                <button
                                    onClick={() => setShowDrawModal(false)}
                                    className="ml-auto bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 cursor-pointer"
                                >
                                    <X size={12} />
                                </button>
                                <div className="space-y-4">
                                    <h2 className="text-center font-bold">Draw Your Signature</h2>
                                    <div className="border border-gray-300 rounded">
                                        <SignatureCanvas
                                            ref={canvasRef}
                                            penColor="black"
                                            canvasProps={{
                                                width: 400,
                                                height: 150,
                                                className: "bg-white rounded",
                                            }}
                                        />
                                    </div>
                                    <div className="flex justify-between gap-4">
                                        <button
                                            onClick={() => canvasRef.current?.clear()}
                                            className="w-full py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            onClick={handleSaveDrawnSignature}
                                            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </Dialog>
                )}
            </AnimatePresence>

        </div>
    );
}
