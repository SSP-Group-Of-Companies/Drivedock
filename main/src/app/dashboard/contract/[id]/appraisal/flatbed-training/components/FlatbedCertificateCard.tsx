"use client";

import { useId, useState } from "react";
import type { IFileAsset } from "@/types/shared.types";
import { EFileMimeType } from "@/types/shared.types";
import { uploadToS3Presigned, deleteTempFile } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";

type Props = {
  trackerId: string;
  file?: IFileAsset; // current (staged or server)
  canEdit: boolean;
  completed: boolean; // NEW: control delete/clear capability
  onSelect: (file: IFileAsset) => void;
  onClear: () => void;
};

// EXACTLY what the API accepts
const ALLOWED_MIME = new Set<string>([EFileMimeType.JPEG, EFileMimeType.JPG, EFileMimeType.PNG, EFileMimeType.PDF, EFileMimeType.DOC, EFileMimeType.DOCX]);

// Extensions + MIME (no generic image/*)
const INPUT_ACCEPT = ".jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export default function FlatbedCertificateCard({ trackerId, file, canEdit, completed, onSelect, onClear }: Props) {
  const headingId = useId();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0); // reset the input

  async function handlePick(files: FileList | null) {
    if (!files || files.length === 0 || !canEdit) return;
    const f = files[0];

    setBusy(true);
    setErr(null);
    try {
      const uploaded = await uploadToS3Presigned({
        file: f,
        folder: ES3Folder.FLATBED_TRAINING_CERTIFICATES,
        trackerId,
        allowedMimeTypes: Array.from(ALLOWED_MIME),
        maxSizeMB: 15,
      });

      // clean up previous temp, if any
      if (file) {
        try {
          await deleteTempFile(file);
        } catch {
          /* non-fatal */
        }
      }

      onSelect({
        s3Key: uploaded.s3Key,
        url: uploaded.url,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        originalName: uploaded.originalName,
      });
      setFileKey((k) => k + 1);
    } catch (e: any) {
      setErr(e?.message || "Failed to upload certificate.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    if (!canEdit || !file) return;
    // Block deletion while completed
    if (completed) {
      setErr("Certificate cannot be deleted after completion. You can replace it by uploading a new file.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await deleteTempFile(file); // no-op if not temp
      onClear();
      setFileKey((k) => k + 1);
    } catch (e: any) {
      setErr(e?.message || "Failed to clear certificate.");
    } finally {
      setBusy(false);
    }
  }

  const disabled = !canEdit || busy;

  return (
    <div className="rounded-xl border p-3 sm:p-4" aria-labelledby={headingId} style={{ borderColor: "var(--color-outline-variant)" }}>
      <div className="mb-2 flex items-center justify-between">
        <h3 id={headingId} className="text-sm font-medium">
          Upload
        </h3>
        {file && (
          <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--color-primary-container)", color: "var(--color-primary-on-container)" }}>
            Selected
          </span>
        )}
      </div>

      <label
        className={`relative flex items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        style={{
          borderColor: "var(--color-outline-variant)",
          background: "var(--color-surface)",
          color: "var(--color-on-surface-variant)",
        }}
        title={disabled ? "Locked" : "Click to select a file"}
      >
        <input
          key={fileKey}
          type="file"
          className="absolute inset-0 h-full w-full opacity-0"
          accept={INPUT_ACCEPT}
          onChange={(e) => handlePick(e.currentTarget.files)}
          disabled={disabled}
          aria-label="Upload flatbed certificate"
        />
        <div className="pointer-events-none select-none">
          <div className="font-medium">Click to select a file</div>
          <div className="mt-1 text-xs opacity-80">Supported: JPG, JPEG, PNG, PDF, DOC, DOCX • Max 15MB</div>
        </div>
      </label>

      {/* Current file details + actions */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-sm">
          <span className="opacity-70 mr-1">Current:</span>
          <span>{file?.originalName || (file ? "Certificate selected" : "—")}</span>
        </div>
        <div className="flex items-center gap-2">
          {file?.url && (
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border px-3 py-1 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ borderColor: "var(--color-outline)" }}
            >
              Download
            </a>
          )}
          {file && (
            <button
              type="button"
              className="rounded-lg border px-3 py-1 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
              style={{ borderColor: "var(--color-outline)" }}
              onClick={handleClear}
              disabled={disabled || completed} // cannot clear when completed
              title={completed ? "Cannot delete after completion" : "Clear staged certificate"}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {err && (
        <div className="mt-3 rounded-lg border px-2 py-1 text-xs" style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }} role="alert">
          {err}
        </div>
      )}

      {busy && <div className="pointer-events-none absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--color-primary)" }} />}
    </div>
  );
}
