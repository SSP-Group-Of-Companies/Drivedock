"use client";

import { useMemo, useState, useId, useEffect } from "react";
import type { IFileAsset } from "@/types/shared.types";
import { EFileMimeType } from "@/types/shared.types";
import { uploadToS3Presigned, deleteTempFile } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import { useAuth } from "@/app/providers/authProvider";
import FileGalleryDialog, { GalleryItem } from "@/app/dashboard/components/dialogs/FileGalleryDialog";

type CarriersEdgeView = {
  emailSent?: boolean;
  emailSentBy?: string;
  emailSentAt?: string; // ISO
  certificates?: IFileAsset[];
  completed?: boolean;
};

type Props = {
  trackerId: string;
  driverEmail?: string;
  carriersEdge: CarriersEdgeView; // controlled by parent (server + staged)
  canEdit: boolean; // step gate
  onChange: (partial: Partial<CarriersEdgeView>) => void; // stage-only
  highlight?: boolean;
};

// Allowed MIME types aligned with API (images + pdf + doc + docx)
const ALLOWED_MIME = new Set<string>([EFileMimeType.JPEG, EFileMimeType.JPG, EFileMimeType.PNG, EFileMimeType.PDF, EFileMimeType.DOC, EFileMimeType.DOCX]);

const INPUT_ACCEPT = "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const MAX_CERTS = 20;

export default function CarriersEdgeCard({ trackerId, driverEmail, carriersEdge, canEdit, onChange, highlight = false }: Props) {
  const user = useAuth();
  const [busy, setBusy] = useState(false); // uploading/deleting
  const [err, setErr] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0); // reset <input type="file" />
  const [showHighlight, setShowHighlight] = useState(highlight);

  useEffect(() => {
    if (highlight) {
      setShowHighlight(true);
      const t = setTimeout(() => setShowHighlight(false), 3000);
      return () => clearTimeout(t);
    }
  }, [highlight]);

  const headingId = useId();
  const descId = useId();

  const locked = !canEdit;
  const emailSent = !!carriersEdge.emailSent;
  const certificates = carriersEdge.certificates ?? [];
  const certificatesCount = certificates.length;

  const canToggleEmailSent = !emailSent && canEdit && !busy;
  const canUpload = emailSent && canEdit && !busy;
  const canToggleCompleted = !carriersEdge.completed && emailSent && certificatesCount >= 1 && canEdit && !busy;

  // Gallery
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const galleryItems: GalleryItem[] = certificates
    .filter((p) => !!p?.url)
    .map((p) => ({
      url: String(p.url),
      name: p.originalName,
      mimeType: (p.mimeType || "").toLowerCase(),
      uploadedAt: (p as any).uploadedAt,
    }));

  const sentLine = useMemo(() => {
    if (!emailSent) return "Not sent";
    const by = carriersEdge.emailSentBy?.trim() || "—";
    const at = carriersEdge.emailSentAt ? new Date(carriersEdge.emailSentAt).toLocaleString() : "—";
    return `Sent by ${by} on ${at}`;
  }, [emailSent, carriersEdge.emailSentBy, carriersEdge.emailSentAt]);

  /* ----------------------------- Handlers (stage) ----------------------------- */

  function handleEmailSentToggle(checked: boolean) {
    if (emailSent || !checked) return; // one-way
    const adminName = user?.name || "Admin";
    onChange({
      emailSent: true,
      emailSentBy: adminName,
      emailSentAt: new Date().toISOString(),
    });
  }

  function handleCompleteToggle(checked: boolean) {
    if (carriersEdge.completed || !checked) return;
    if (!emailSent || certificatesCount < 1) return;
    onChange({ completed: true });
  }

  async function handleSelectFiles(files: FileList | null) {
    if (!files || files.length === 0 || !canUpload) return;

    setBusy(true);
    setErr(null);
    try {
      // Front-end validation:
      // - types
      // - combined count cap (5)
      const filesArr = Array.from(files);
      const remainingSlots = Math.max(0, MAX_CERTS - certificatesCount);
      if (remainingSlots <= 0) {
        setErr(`You can upload at most ${MAX_CERTS} certificates.`);
        setBusy(false);
        return;
      }

      // Filter invalid types (keep valid; report invalid)
      const valid: File[] = [];
      const invalid: File[] = [];
      for (const f of filesArr) {
        const mt = (f.type || "").toLowerCase();
        if (ALLOWED_MIME.has(mt) || mt.startsWith("image/")) {
          // allow generic image/* that browsers sometimes report
          valid.push(f);
        } else {
          invalid.push(f);
        }
      }

      if (invalid.length) {
        setErr(`Some files were skipped due to unsupported types. Allowed: JPG, PNG, PDF, DOC, DOCX.`);
      }

      const toUpload = valid.slice(0, remainingSlots);
      if (toUpload.length === 0) {
        if (!invalid.length) setErr("No files selected.");
        setBusy(false);
        return;
      }

      const uploaded: IFileAsset[] = [];
      for (const file of toUpload) {
        const result = await uploadToS3Presigned({
          file,
          folder: ES3Folder.CARRIERS_EDGE_CERTIFICATES,
          trackerId,
        });
        uploaded.push(result);
      }

      onChange({ certificates: [...certificates, ...uploaded] });
      setFileKey((k) => k + 1);
    } catch (e: any) {
      setErr(e?.message || "Failed to upload certificates");
    } finally {
      setBusy(false);
    }
  }

  // Delete a certificate (also remove temp S3 object if applicable)
  const handleDeleteFromGallery = async (_i: number, item: GalleryItem) => {
    // Allow deletion even when completed, but prevent if only 1 certificate remains
    if (carriersEdge.completed && galleryItems.length <= 1) {
      setGalleryError("At least one certificate must exist when completed.");
      return;
    }

    const idx = certificates.findIndex((p) => String(p?.url) === item.url);
    if (idx === -1) return;

    setGalleryError(null);
    setErr(null);
    setBusy(true);
    try {
      const target = certificates[idx];

      // If this is a temp object, delete it from S3 via API
      // (deleteTempFile no-ops if not a temp key)
      await deleteTempFile(target);

      // Now update staged state
      const next = certificates.filter((_, i) => i !== idx);
      if (carriersEdge.completed && next.length < 1) {
        onChange({ certificates: next, completed: false });
      } else {
        onChange({ certificates: next });
      }
    } catch (e: any) {
      // Keep the file in UI if delete failed; show error
      setGalleryError(e?.message || "Failed to delete temp file from S3.");
      return;
    } finally {
      setBusy(false);
    }
  };

  /* -------------------------------- Render -------------------------------- */

  return (
    <section
      className={`relative rounded-xl border p-3 sm:p-4 lg:max-h-[21rem] lg:overflow-y-auto ${showHighlight ? "ssp-inside-animated-ring" : ""}`}
      aria-labelledby={headingId}
      aria-describedby={locked ? descId : undefined}
      aria-busy={busy || undefined}
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-outline)",
      }}
    >
        {/* Card-wide lock overlay (kept) */}
        {locked && (
          <>
            <p id={descId} className="sr-only">
              Locked until step is reached. Controls are disabled.
            </p>
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg" aria-hidden>
              <div
                className="rounded-lg px-3 py-1.5 text-xs font-medium backdrop-blur-sm"
                style={{
                  background: "var(--color-surface)",
                  color: "var(--color-on-surface)",
                  border: "1px solid var(--color-outline)",
                  boxShadow: "var(--elevation-2)",
                }}
              >
                Locked until step is reached
              </div>
            </div>
          </>
        )}

        {/* Header */}
        <header className="mb-3 flex items-center justify-between">
          <h2 id={headingId} className="text-base font-semibold">
            Carrier&apos;s Edge
          </h2>
          <div className="flex items-center gap-2">
            {carriersEdge.completed && (
              <span
                className="rounded-full px-2 py-0.5 text-xs"
                style={{
                  background: "var(--color-success-container)",
                  color: "var(--color-success-on-container)",
                }}
              >
                Carrier&apos;s Edge Complete
              </span>
            )}
            <span className="text-xs opacity-70">
              Certificates: {certificatesCount}/{MAX_CERTS}
            </span>
          </div>
        </header>

        {/* Body */}
        <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${locked ? "pointer-events-none" : ""}`}>
          {/* LEFT: email + gallery */}
          <div className="rounded-xl border" style={{ borderColor: "var(--color-outline-variant)" }}>
            <div className="flex flex-col gap-2 p-3 sm:p-4" style={{ borderBottom: "1px solid var(--color-outline-variant)" }}>
              <label
                className="inline-flex items-center gap-2 text-base sm:text-lg font-medium"
                title={locked ? undefined : canToggleEmailSent ? "Mark when credentials were sent to the driver" : emailSent ? "Already marked as sent" : "Busy…"}
              >
                <input type="checkbox" className="h-4 w-4" disabled={!canToggleEmailSent} checked={emailSent} onChange={(e) => handleEmailSentToggle(e.currentTarget.checked)} />
                <span>Credentials email sent</span>
              </label>
              <div className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                {sentLine} {driverEmail ? `(${driverEmail})` : ""}
              </div>
            </div>

            <div className="p-3 sm:p-4">
              <button
                type="button"
                className="block w-full rounded-xl px-4 py-5 text-center text-base font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "var(--color-primary-container)",
                  color: "var(--color-primary-on-container)",
                  border: "1px solid var(--color-outline-variant)",
                }}
                onClick={() => {
                  setGalleryIndex(0);
                  setGalleryOpen(true);
                }}
                disabled={locked || galleryItems.length === 0}
                title={locked ? undefined : galleryItems.length === 0 ? "No certificates yet" : "Open gallery"}
              >
                View Certificates
              </button>
            </div>
          </div>

          {/* RIGHT: upload */}
          <div className="flex flex-col items-stretch justify-between rounded-xl border p-3 sm:p-4" style={{ borderColor: "var(--color-outline-variant)" }}>
            <label
              className={`relative flex flex-1 items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center ${canUpload ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
              style={{
                borderColor: "var(--color-outline-variant)",
                background: "var(--color-surface)",
                color: "var(--color-on-surface-variant)",
              }}
              title={locked ? undefined : canUpload ? "Click to select files" : "Send credentials to enable uploads"}
            >
              <input
                key={fileKey}
                type="file"
                className="absolute inset-0 h-full w-full opacity-0"
                accept={INPUT_ACCEPT}
                multiple
                onChange={(e) => handleSelectFiles(e.currentTarget.files)}
                disabled={!canUpload}
                aria-label="Upload Carrier’s Edge certificates"
              />
              <div className="pointer-events-none select-none">
                <div className="font-medium">Click to select files</div>
                <div className="mt-1 text-xs opacity-80">Supported: JPG, PNG, PDF, DOC, DOCX • Max {MAX_CERTS} files</div>
              </div>
            </label>
          </div>
        </div>

        {/* Footer: completed */}
        <div className="mt-3 flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: "var(--color-outline-variant)" }}>
          <label
            className={`inline-flex items-center gap-2 text-sm ${canToggleCompleted ? "" : "opacity-60"}`}
            title={
              locked
                ? undefined
                : canToggleCompleted
                ? "Check when certificates are verified"
                : !emailSent
                ? "Send credentials first"
                : certificatesCount < 1
                ? "Upload at least 1 certificate"
                : "Already completed"
            }
          >
            <input type="checkbox" className="h-4 w-4" disabled={!canToggleCompleted} checked={!!carriersEdge.completed} onChange={(e) => handleCompleteToggle(e.currentTarget.checked)} />
            <span>Mark as completed</span>
          </label>

          <div className="text-xs opacity-70">
            {emailSent
              ? certificatesCount >= 1
                ? carriersEdge.completed
                  ? "Completed. You may delete certificates, but at least one must remain while completed."
                  : "Ready to submit changes."
                : "Upload at least 1 certificate."
              : "Send credentials to continue."}
          </div>
        </div>

        {err && (
          <div
            className="mt-3 rounded-lg border px-2 py-1 text-xs"
            style={{
              color: "var(--color-error)",
              borderColor: "var(--color-error)",
            }}
            role="alert"
          >
            {err}
          </div>
        )}

        {/* Gallery with delete (deletes temp S3 object first if applicable) */}
        <FileGalleryDialog
          open={galleryOpen}
          items={galleryItems}
          initialIndex={galleryIndex}
          title="Carrier’s Edge Certificates"
          onClose={() => setGalleryOpen(false)}
          onDelete={handleDeleteFromGallery}
          errorMessage={galleryError}
        />
    </section>
  );
}
