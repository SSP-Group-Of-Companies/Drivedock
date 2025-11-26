"use client";

import * as React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Dialog, DialogPanel } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Info, Upload, X } from "lucide-react";
import { useParams } from "next/navigation";

import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import type { IFileAsset } from "@/types/shared.types";
import type { ApplicationFormPage4Input } from "@/lib/zodSchemas/applicationFormPage4.Schema";
import UploadPicker from "@/components/media/UploadPicker";

type PhotoFieldName =
  | "incorporatePhotos"
  | "hstPhotos"
  | "bankingInfoPhotos"
  | "healthCardPhotos"
  | "medicalCertificationPhotos"
  | "passportPhotos"
  | "usVisaPhotos"
  | "prPermitCitizenshipPhotos";

type Props = {
  name: PhotoFieldName;
  label: string;
  folder: ES3Folder;
  maxPhotos: number;
  className?: string;
  description?: string;
  /**
   * aspect is now ignored for PDFs, but kept in the signature for backwards compatibility.
   */
  aspect?: number | null;
};

export default function OnboardingPhotoGroup({
  name,
  label,
  folder,
  maxPhotos,
  className,
  description,
}: Props) {
  const {
    control,
    formState: { errors },
  } = useFormContext<ApplicationFormPage4Input>();

  const photos = (useWatch({ control, name }) || []) as IFileAsset[];
  const fieldErr = (errors as any)?.[name];
  const errorMessage =
    typeof fieldErr?.message === "string"
      ? (fieldErr.message as string)
      : undefined;

  const [open, setOpen] = React.useState(false);

  return (
    <div className={className} data-field={name}>
      <PreviewCard
        label={label}
        photos={photos}
        onOpen={() => setOpen(true)}
        maxPhotos={maxPhotos}
        hasError={!!errorMessage}
        errorMessage={errorMessage}
      />
      <Lightbox
        title={label}
        count={photos.length}
        open={open}
        onClose={() => setOpen(false)}
      >
        <Manager
          name={name}
          folder={folder}
          maxPhotos={maxPhotos}
          description={description}
        />
      </Lightbox>
    </div>
  );
}

/* ---------------- internal pieces ---------------- */

function PreviewCard({
  label,
  photos,
  onOpen,
  maxPhotos,
  hasError,
  errorMessage,
}: {
  label: string;
  photos: IFileAsset[];
  onOpen: () => void;
  maxPhotos: number;
  hasError?: boolean;
  errorMessage?: string;
}) {
  const first = photos[0];
  const extra = Math.max(0, photos.length - 1);
  const errId = React.useId();
  const hasFirst = !!first;

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onOpen}
        className={`w-full rounded-2xl border bg-white shadow-sm hover:shadow-md transition overflow-hidden text-left ${
          hasError ? "border-red-300 ring-2 ring-red-200" : "border-gray-200"
        }`}
        aria-label={`Open ${label} documents`}
        aria-describedby={hasError ? errId : undefined}
      >
        <div className="px-4 pt-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">{label}</span>
          <span
            className={`text-xs ${hasError ? "text-red-600" : "text-gray-600"}`}
          >
            {photos.length}/{maxPhotos}
          </span>
        </div>

        {/* tiny red hint under the header when there is an error */}
        {hasError && (
          <p id={errId} className="px-4 pt-1 text-xs text-red-600">
            {errorMessage}
          </p>
        )}

        {/* Thumbnail area: dashed when empty, simple doc card when present */}
        <div
          className={[
            "relative m-4 h-44 rounded-xl overflow-hidden",
            hasFirst
              ? "ring-1 ring-gray-200 bg-gray-50"
              : "border-2 border-dashed border-gray-300 bg-gray-50",
          ].join(" ")}
        >
          {hasFirst ? (
            <div className="h-full w-full flex flex-col items-center justify-center px-4 text-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-5 h-5" />
                <span className="text-xs font-medium line-clamp-1">
                  {first.originalName || "Document.pdf"}
                </span>
              </div>
              {extra > 0 && (
                <span className="text-[11px] text-gray-500">
                  +{extra} more document{extra > 1 ? "s" : ""}
                </span>
              )}
            </div>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
              <FileText className="w-5 h-5 mb-1" />
              <span className="text-xs">No documents yet</span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

function Lightbox({
  title,
  count,
  open,
  onClose,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onClose={onClose} className="relative z-[70]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30"
          />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ y: 16, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-[95vw] max-w-5xl"
            >
              <DialogPanel className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-gray-900">
                      {title}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {count} {count === 1 ? "document" : "documents"}
                    </span>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-sm px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
                <div className="p-5 max-h-[78vh] overflow-auto">{children}</div>
              </DialogPanel>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

function Manager({
  name,
  folder,
  maxPhotos,
  description,
}: {
  name: PhotoFieldName;
  folder: ES3Folder;
  maxPhotos: number;
  description?: string;
}) {
  const { id } = useParams<{ id: string }>();
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<ApplicationFormPage4Input>();

  const photos = (useWatch({ control, name }) || []) as IFileAsset[];
  const err = (errors as any)?.[name];

  const [status, setStatus] = React.useState<
    "idle" | "uploading" | "deleting" | "error"
  >("idle");
  const [message, setMessage] = React.useState("");

  const remaining = Math.max(0, maxPhotos - photos.length);
  const atLimit = remaining === 0;

  const onUpload = async (file: File | null) => {
    if (!file || atLimit) return;

    if (file.type !== "application/pdf") {
      setStatus("error");
      setMessage("Only PDF files are allowed. Please upload a clear PDF scan.");
      return;
    }

    setStatus("uploading");
    setMessage("");
    try {
      const current = (getValues(name) || []) as IFileAsset[];

      const res = await uploadToS3Presigned({
        file,
        folder,
        trackerId: id,
      });

      setValue(name, [...current, res], {
        shouldValidate: true,
        shouldDirty: true,
      });
      setStatus("idle");
      setMessage("Document uploaded successfully.");
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message || "Upload failed");
    }
  };

  const onRemove = async (idx: number) => {
    const s3Key = photos[idx]?.s3Key;
    setStatus("deleting");
    setMessage("");
    if (s3Key?.startsWith("temp-files/")) {
      try {
        await fetch("/api/v1/delete-temp-files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: [s3Key] }),
        });
        setMessage("Document removed");
      } catch {
        setStatus("error");
        setMessage("Delete failed");
      }
    }
    const next = [...photos];
    next.splice(idx, 1);
    setValue(name, next, { shouldValidate: true, shouldDirty: true });
    setStatus("idle");
  };

  return (
    <div className="space-y-4">
      {/* Info bar */}
      {description && (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <p className="leading-5">{description}</p>
          </div>
        </div>
      )}

      {/* Upload button */}
      <div className="flex items-center gap-3">
        <UploadPicker
          onPick={onUpload}
          accept="application/pdf"
          disabled={atLimit}
          ariaLabel={atLimit ? "Max documents reached" : "Add document"}
          showDefaultTile={false}
          mode="pdf"
          showPdfGuidance
        >
          <div
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed text-sm transition
              ${
                atLimit
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "bg-gray-50 hover:bg-gray-100 hover:border-gray-400 text-gray-700 border-gray-300"
              }`}
            title={atLimit ? "Max reached" : "Add document"}
          >
            <Upload className="w-4 h-4" />
            {atLimit ? "Max reached" : "Add document"}
          </div>
        </UploadPicker>
        <span className="text-xs text-gray-500">
          {photos.length}/{maxPhotos} uploaded
        </span>
      </div>

      {/* Status messages */}
      {status === "uploading" && (
        <p className="text-yellow-600 text-xs">Uploading...</p>
      )}
      {status === "error" && <p className="text-red-500 text-xs">{message}</p>}
      {status === "idle" && message && (
        <p className="text-green-600 text-xs">{message}</p>
      )}

      {/* Gallery or empty state */}
      {photos.length > 0 ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
          {photos.map((p, i) => (
            <div
              key={`${p.s3Key}-${i}`}
              className="relative rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 flex flex-col gap-2"
            >
              <div className="flex items-start gap-2 pr-6">
                <FileText className="w-4 h-4 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">
                    {p.originalName || `Document ${i + 1}.pdf`}
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF attached. You can upload a new file to replace it.
                  </p>
                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex text-xs font-medium text-blue-600 hover:underline"
                    >
                      View document
                    </a>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                disabled={status === "uploading" || status === "deleting"}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] hover:bg-red-600"
                aria-label="Remove document"
                title="Remove document"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-40 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
          <FileText className="w-5 h-5 mb-1" />
          <span className="text-xs">No documents yet</span>
        </div>
      )}

      {/* Field-level error inside modal */}
      {err && typeof err.message === "string" && (
        <p className="text-red-500 text-xs">{err.message}</p>
      )}
    </div>
  );
}
