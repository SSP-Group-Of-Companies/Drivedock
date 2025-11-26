"use client";

import * as React from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Upload, X } from "lucide-react";
import { useParams } from "next/navigation";

import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import type { IFileAsset } from "@/types/shared.types";
import UploadPicker from "@/components/media/UploadPicker";

type Props = {
  /** Display label (e.g. "Drug Test Documents") */
  label: string;
  /** Target S3 subfolder (e.g. ES3Folder.DRUG_TEST_DOCS) */
  folder: ES3Folder;
  /** Max number of documents a user can upload */
  maxPhotos: number;
  /** Current documents (controlled) */
  photos: IFileAsset[];
  /** Update documents (controlled) */
  setPhotos: (next: IFileAsset[]) => void;
  /** Optional wrapper className */
  className?: string;
  /** Disable upload/remove interactions entirely (e.g. when pending verification) */
  disabled?: boolean;
};

export default function OnboardingPhotoGroupControlled({
  label,
  folder,
  maxPhotos,
  photos,
  setPhotos,
  className,
  disabled,
}: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={className}>
      <PreviewCard
        label={label}
        photos={photos}
        onOpen={() => setOpen(true)}
        maxPhotos={maxPhotos}
        disabled={!!disabled}
      />

      <Lightbox
        title={label}
        count={photos.length}
        open={open}
        onClose={() => setOpen(false)}
      >
        <ManagerControlled
          label={label}
          folder={folder}
          maxPhotos={maxPhotos}
          photos={photos}
          setPhotos={setPhotos}
          disabled={!!disabled}
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
  disabled,
}: {
  label: string;
  photos: IFileAsset[];
  onOpen: () => void;
  maxPhotos: number;
  disabled?: boolean;
}) {
  const first = photos[0];
  const extra = Math.max(0, photos.length - 1);
  const hasFirst = !!first;

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        className={`w-full rounded-2xl border bg-white shadow-sm transition overflow-hidden text-left ${
          disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-md"
        } border-gray-200`}
        aria-label={`Open ${label} documents`}
      >
        <div className="px-4 pt-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">{label}</span>
          <span className="text-xs text-gray-600">
            {photos.length}/{maxPhotos}
          </span>
        </div>

        {/* Preview area: dashed when empty, simple doc summary when present */}
        <div className="relative m-4 h-24 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 flex items-center px-4">
          {hasFirst ? (
            <div className="flex items-center gap-3 text-gray-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-800 text-white">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                  {first.originalName || "Document"}
                </p>
                <p className="text-[11px] text-gray-500">
                  {extra > 0
                    ? `+${extra} more document${extra === 1 ? "" : "s"}`
                    : "PDF attached. Click to manage."}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
              <FileText className="w-5 h-5 mb-1" />
              <span className="text-xs">No documents uploaded yet</span>
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

function ManagerControlled({
  label,
  folder,
  maxPhotos,
  photos,
  setPhotos,
  disabled,
}: {
  label: string;
  folder: ES3Folder;
  maxPhotos: number;
  photos: IFileAsset[];
  setPhotos: (next: IFileAsset[]) => void;
  disabled: boolean;
}) {
  const { id } = useParams<{ id: string }>();

  const [status, setStatus] = React.useState<
    "idle" | "uploading" | "deleting" | "error"
  >("idle");
  const [message, setMessage] = React.useState("");

  const remaining = Math.max(0, maxPhotos - photos.length);
  const atLimit = remaining === 0;

  const handleUpload = async (file: File | null) => {
    if (disabled || !file || atLimit) return;

    setStatus("uploading");
    setMessage("");

    try {
      const res = await uploadToS3Presigned({
        file,
        folder,
        trackerId: id,
      });

      setPhotos([...photos, res]);
      setStatus("idle");
      setMessage("Upload successful");
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message || "Upload failed");
    }
  };

  const onRemove = async (idx: number) => {
    if (disabled) return;

    const target = photos[idx];
    if (!target) return;

    const s3Key = target.s3Key;

    setStatus("deleting");
    setMessage("");

    // Only attempt to delete temp objects
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
    setPhotos(next);
    setStatus("idle");
  };

  return (
    <div className="space-y-4">
      {/* Upload button using UploadPicker in PDF mode */}
      <div className="flex items-center gap-3">
        <UploadPicker
          onPick={handleUpload}
          // pdf mode → application/pdf + guidance modal
          mode="pdf"
          showPdfGuidance
          disabled={disabled || atLimit}
          ariaLabel={
            disabled
              ? "Uploads disabled"
              : atLimit
              ? "Max documents reached"
              : "Add document"
          }
          showDefaultTile={false}
        >
          <div
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed text-sm transition
              ${
                disabled || atLimit
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-gray-400 text-gray-700 border-gray-300"
              }`}
            title={
              disabled
                ? "Uploads disabled"
                : atLimit
                ? "Max reached"
                : "Add document"
            }
          >
            <Upload className="w-4 h-4" />
            {disabled
              ? "Uploads disabled"
              : atLimit
              ? "Max reached"
              : "Add document"}
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
      {status === "deleting" && (
        <p className="text-yellow-600 text-xs">Deleting...</p>
      )}
      {status === "error" && <p className="text-red-500 text-xs">{message}</p>}
      {status === "idle" && message && (
        <p className="text-green-600 text-xs">{message}</p>
      )}

      {/* Document list or empty state */}
      {photos.length > 0 ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
          {photos.map((p, i) => (
            <div
              key={`${p.s3Key}-${i}`}
              className="relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-gray-800 text-white">
                  <FileText className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {p.originalName || `${label} ${i + 1}`}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    PDF attached. You can upload a new file to replace it.
                  </p>

                  {p.url && (
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs font-medium text-blue-600 hover:underline"
                    >
                      View document
                    </a>
                  )}
                </div>

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    disabled={status === "uploading" || status === "deleting"}
                    className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                    aria-label="Remove document"
                    title="Remove document"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
          <FileText className="w-5 h-5 mb-1" />
          <span className="text-xs">No documents uploaded yet</span>
        </div>
      )}
    </div>
  );
}
