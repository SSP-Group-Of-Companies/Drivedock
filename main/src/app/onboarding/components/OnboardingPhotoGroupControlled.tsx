"use client";

import * as React from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Camera, Upload, X } from "lucide-react";
import { useParams } from "next/navigation";

import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import type { IPhoto } from "@/types/shared.types";

type Props = {
  /** Display label (e.g. "Drug Test Documents") */
  label: string;
  /** Target S3 subfolder (e.g. ES3Folder.DRUG_TEST) */
  folder: ES3Folder;
  /** Max number of photos a user can upload */
  maxPhotos: number;
  /** Current photos (controlled) */
  photos: IPhoto[];
  /** Update photos (controlled) */
  setPhotos: (next: IPhoto[]) => void;
  /** Optional wrapper className */
  className?: string;
  /** Disable upload/remove interactions entirely (e.g. when pending verification) */
  disabled?: boolean;
};

export default function OnboardingPhotoGroupControlled({ label, folder, maxPhotos, photos, setPhotos, className, disabled }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={className}>
      <PreviewCard label={label} photos={photos} onOpen={() => setOpen(true)} maxPhotos={maxPhotos} disabled={!!disabled} />

      <Lightbox title={label} count={photos.length} open={open} onClose={() => setOpen(false)}>
        <ManagerControlled label={label} folder={folder} maxPhotos={maxPhotos} photos={photos} setPhotos={setPhotos} disabled={!!disabled} />
      </Lightbox>
    </div>
  );
}

/* ---------------- internal pieces ---------------- */

function PreviewCard({ label, photos, onOpen, maxPhotos, disabled }: { label: string; photos: IPhoto[]; onOpen: () => void; maxPhotos: number; disabled?: boolean }) {
  const first = photos[0];
  const extra = Math.max(0, photos.length - 1);
  const hasFirst = !!first;

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        className={`w-full rounded-2xl border bg-white shadow-sm transition overflow-hidden text-left ${disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-md"} ${
          hasFirst ? "border-gray-200" : "border-gray-200"
        }`}
        aria-label={`Open ${label} gallery`}
      >
        <div className="px-4 pt-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-800">{label}</span>
          <span className="text-xs text-gray-600">
            {photos.length}/{maxPhotos}
          </span>
        </div>

        <div className={["relative m-4 h-44 rounded-xl overflow-hidden", hasFirst ? "ring-1 ring-gray-200 bg-white" : "border-2 border-dashed border-gray-300 bg-gray-50"].join(" ")}>
          {hasFirst ? (
            <>
              <Image src={first.url} alt={`${label} preview`} fill className="object-cover" sizes="(min-width: 1024px) 420px, 90vw" />
              {extra > 0 && <div className="absolute right-2 top-2 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-full">+{extra}</div>}
            </>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
              <Camera className="w-5 h-5 mb-1" />
              <span className="text-xs">No photos yet</span>
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

function Lightbox({ title, count, open, onClose, children }: { title: string; count: number; open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onClose={onClose} className="relative z-[70]">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/30" />
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
                    <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {count} {count === 1 ? "photo" : "photos"}
                    </span>
                  </div>
                  <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200">
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
  photos: IPhoto[];
  setPhotos: (next: IPhoto[]) => void;
  disabled: boolean;
}) {
  const { id } = useParams<{ id: string }>();

  const [status, setStatus] = React.useState<"idle" | "uploading" | "deleting" | "error">("idle");
  const [message, setMessage] = React.useState("");

  const remaining = Math.max(0, maxPhotos - photos.length);
  const atLimit = remaining === 0;

  const onUpload = async (files: FileList | null) => {
    if (disabled || !files || files.length === 0 || atLimit) return;
    const take = Array.from(files).slice(0, remaining);

    setStatus("uploading");
    setMessage("");
    try {
      const uploaded: IPhoto[] = [];
      for (const file of take) {
        const res = await uploadToS3Presigned({
          file,
          folder,
          trackerId: id,
        });
        uploaded.push(res);
      }
      setPhotos([...photos, ...uploaded]);
      setStatus("idle");
      setMessage("Upload successful");
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message || "Upload failed");
    }
  };

  const onRemove = async (idx: number) => {
    if (disabled) return;

    const s3Key = photos[idx]?.s3Key;
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
        setMessage("Photo removed");
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
      {/* Compact dashed upload button (always compact) */}
      <div className="flex items-center gap-3">
        <label
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed text-sm transition
            ${
              disabled || atLimit ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : "cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-gray-400 text-gray-700 border-gray-300"
            }`}
          title={disabled ? "Uploads disabled" : atLimit ? "Max reached" : "Add Photos"}
        >
          <Upload className="w-4 h-4" />
          {disabled ? "Uploads disabled" : atLimit ? "Max reached" : "Add Photos"}
          <input type="file" accept="image/*" multiple className="hidden" disabled={disabled || atLimit} onChange={(e) => onUpload(e.target.files)} />
        </label>
        <span className="text-xs text-gray-500">
          {photos.length}/{maxPhotos} uploaded
        </span>
      </div>

      {/* Status messages */}
      {status === "uploading" && <p className="text-yellow-600 text-xs">Uploading...</p>}
      {status === "deleting" && <p className="text-yellow-600 text-xs">Deleting...</p>}
      {status === "error" && <p className="text-red-500 text-xs">{message}</p>}
      {status === "idle" && message && <p className="text-green-600 text-xs">{message}</p>}

      {/* Gallery or dashed empty area */}
      {photos.length > 0 ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
          {photos.map((p, i) => (
            <div key={`${p.s3Key}-${i}`} className="relative aspect-[3/4] rounded-lg border border-gray-200 overflow-hidden bg-white">
              <Image src={p.url} alt={`${label} ${i + 1}`} fill className="object-cover" sizes="150px" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  disabled={status === "uploading" || status === "deleting"}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] hover:bg-red-600"
                  aria-label="Remove photo"
                  title="Remove photo"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="h-40 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
          <Camera className="w-5 h-5 mb-1" />
          <span className="text-xs">No photos yet</span>
        </div>
      )}
    </div>
  );
}
