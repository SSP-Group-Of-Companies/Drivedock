"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { IFileAsset } from "@/types/shared.types";
import { EFileMimeType } from "@/types/shared.types";
import { EDrugTestStatus } from "@/types/drugTest.types";
import { uploadToS3Presigned, deleteTempFile } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import FileGalleryDialog, { type GalleryItem } from "@/app/dashboard/components/dialogs/FileGalleryDialog";

type Props = {
  trackerId: string;
  drugTest: {
    adminDocuments?: IFileAsset[];
    driverDocuments?: IFileAsset[];
    status?: EDrugTestStatus;
  };
  canEdit: boolean;
  onChange: (partial: { adminDocuments?: IFileAsset[]; driverDocuments?: IFileAsset[]; status?: EDrugTestStatus }) => void;
  highlight?: boolean;
};

// Allowed MIME (match API)
const ALLOWED_MIME = new Set<string>([EFileMimeType.JPEG, EFileMimeType.JPG, EFileMimeType.PNG, EFileMimeType.PDF, EFileMimeType.DOC, EFileMimeType.DOCX]);
const INPUT_ACCEPT = "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_ADMIN = 5;
const MAX_DRIVER = 5;
const MAX_TOTAL = MAX_ADMIN + MAX_DRIVER;

export default function DrugTestCard({ trackerId, drugTest, canEdit, onChange, highlight = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showRejectWarn, setShowRejectWarn] = useState(false);

  const [showHighlight, setShowHighlight] = useState(highlight);
  useEffect(() => {
    if (!highlight) return;
    setShowHighlight(true);
    const t = setTimeout(() => setShowHighlight(false), 3000);
    return () => clearTimeout(t);
  }, [highlight]);

  const titleId = useId();
  const descId = useId();

  const adminDocs = drugTest.adminDocuments ?? [];
  const driverDocs = drugTest.driverDocuments ?? [];
  const adminCount = adminDocs.length;
  const driverCount = driverDocs.length;
  const totalCount = adminCount + driverCount;

  const locked = !canEdit;
  const busyOrLocked = busy || locked;

  // Gallery
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  // Derived status for messaging
  const baseStatus = totalCount > 0 ? EDrugTestStatus.AWAITING_REVIEW : EDrugTestStatus.NOT_UPLOADED;
  const derivedStatus = useMemo<EDrugTestStatus>(() => {
    if (drugTest.status === EDrugTestStatus.APPROVED || drugTest.status === EDrugTestStatus.REJECTED) {
      return drugTest.status;
    }
    return baseStatus;
  }, [drugTest.status, baseStatus]);

  // Lock rules based on server-initial state
  const [approvedAtLoad] = useState(drugTest.status === EDrugTestStatus.APPROVED);
  const [rejectedAtLoad] = useState(drugTest.status === EDrugTestStatus.REJECTED);

  // Approve can turn ON only if admin has ≥1; cannot change if it was APPROVED at load
  const canApprove = !busyOrLocked && !approvedAtLoad && (drugTest.status === EDrugTestStatus.APPROVED || adminCount >= 1);

  // Reject can turn ON only if driver has ≥1; if it was REJECTED at load, keep it selected but disabled
  const canReject = !busyOrLocked && !approvedAtLoad && !(rejectedAtLoad && drugTest.status === EDrugTestStatus.REJECTED) && (drugTest.status === EDrugTestStatus.REJECTED || driverCount >= 1);

  // Combined items (label owner in name)
  const allItems: GalleryItem[] = [
    ...adminDocs
      .filter((p) => !!p?.url)
      .map((p) => ({
        url: String(p.url),
        name: `Admin — ${p.originalName || ""}`.trim(),
        mimeType: (p.mimeType || "").toLowerCase(),
        uploadedAt: (p as any).uploadedAt,
      })),
    ...driverDocs
      .filter((p) => !!p?.url)
      .map((p) => ({
        url: String(p.url),
        name: `Driver — ${p.originalName || ""}`.trim(),
        mimeType: (p.mimeType || "").toLowerCase(),
        uploadedAt: (p as any).uploadedAt,
      })),
  ];

  /* ----------------------------- helpers ----------------------------- */
  function pickValid(files: File[], slots: number) {
    const valid: File[] = [];
    for (const f of files) {
      const mt = (f.type || "").toLowerCase();
      if (ALLOWED_MIME.has(mt) || mt.startsWith("image/")) valid.push(f);
    }
    return valid.slice(0, Math.max(0, slots));
  }
  async function uploadBatch(files: File[]) {
    const out: IFileAsset[] = [];
    for (const file of files) {
      const res = await uploadToS3Presigned({
        file,
        folder: ES3Folder.DRUG_TEST_DOCS,
        trackerId,
      });
      out.push(res as unknown as IFileAsset);
    }
    return out;
  }

  /* ----------------------------- uploads (admin only) ----------------------------- */
  async function handleUploadAdmin(files: FileList | null) {
    setShowRejectWarn(false);
    if (!files || files.length === 0 || busyOrLocked) return;
    setBusy(true);
    setErr(null);
    try {
      const slots = Math.max(0, MAX_ADMIN - adminCount);
      if (slots <= 0) {
        setErr(`You can upload at most ${MAX_ADMIN} admin documents.`);
        return;
      }
      const toUpload = pickValid(Array.from(files), slots);
      if (!toUpload.length) return;

      const uploaded = await uploadBatch(toUpload);
      const nextAdmin = [...adminDocs, ...uploaded];

      const partial: any = { adminDocuments: nextAdmin };
      if (drugTest.status !== EDrugTestStatus.APPROVED && drugTest.status !== EDrugTestStatus.REJECTED) {
        const nextTotal = nextAdmin.length + driverDocs.length;
        partial.status = nextTotal > 0 ? EDrugTestStatus.AWAITING_REVIEW : EDrugTestStatus.NOT_UPLOADED;
      }
      onChange(partial);
    } catch (e: any) {
      setErr(e?.message || "Failed to upload files.");
    } finally {
      setBusy(false);
    }
  }

  /* ----------------------------- actions ----------------------------- */
  function handleApprove() {
    setShowRejectWarn(false);
    if (!canApprove) return;

    // Toggle: if already approved, revert to auto so the user can change mind before submit
    if (drugTest.status === EDrugTestStatus.APPROVED) {
      const nextTotal = adminDocs.length + driverDocs.length;
      onChange({
        status: nextTotal > 0 ? EDrugTestStatus.AWAITING_REVIEW : EDrugTestStatus.NOT_UPLOADED,
      });
      return;
    }

    setErr(null);
    onChange({ status: EDrugTestStatus.APPROVED });
  }

  async function handleReject() {
    if (!canReject) return;

    // First click when moving INTO rejected: show inline warning
    if (drugTest.status !== EDrugTestStatus.REJECTED && !showRejectWarn) {
      setShowRejectWarn(true);
      return;
    }

    setErr(null);
    setShowRejectWarn(false);

    // Toggle OFF if already rejected → revert to auto status based on docs
    if (drugTest.status === EDrugTestStatus.REJECTED) {
      const nextTotal = adminDocs.length + driverDocs.length;
      onChange({
        status: nextTotal > 0 ? EDrugTestStatus.AWAITING_REVIEW : EDrugTestStatus.NOT_UPLOADED,
      });
      return;
    }

    // Toggle ON: just mark rejected. Server will clear driver docs on PATCH.
    onChange({ status: EDrugTestStatus.REJECTED });
  }

  // Delete from combined gallery (detect owner by url)
  async function handleDeleteFromGallery(_: number, item: GalleryItem) {
    setGalleryError(null);
    setErr(null);

    // Find in admin first
    const aIdx = adminDocs.findIndex((p) => String(p?.url) === item.url);
    if (aIdx >= 0) {
      if (drugTest.status === EDrugTestStatus.APPROVED && adminDocs.length <= 1) {
        setGalleryError("At least one admin document must remain while Approved.");
        return;
      }
      setBusy(true);
      try {
        await deleteTempFile(adminDocs[aIdx]); // no-op if not temp
        const nextAdmin = adminDocs.filter((_, i) => i !== aIdx);
        const partial: any = { adminDocuments: nextAdmin };
        if (drugTest.status !== EDrugTestStatus.APPROVED && drugTest.status !== EDrugTestStatus.REJECTED) {
          const nextTotal = nextAdmin.length + driverDocs.length;
          partial.status = nextTotal > 0 ? EDrugTestStatus.AWAITING_REVIEW : EDrugTestStatus.NOT_UPLOADED;
        }
        onChange(partial);
      } catch (e: any) {
        setGalleryError(e?.message || "Failed to delete temp file from S3.");
      } finally {
        setBusy(false);
      }
      return;
    }

    // Otherwise driver
    const dIdx = driverDocs.findIndex((p) => String(p?.url) === item.url);
    if (dIdx >= 0) {
      setBusy(true);
      try {
        await deleteTempFile(driverDocs[dIdx]); // no-op if not temp
        const nextDriver = driverDocs.filter((_, i) => i !== dIdx);
        const partial: any = { driverDocuments: nextDriver };
        if (drugTest.status !== EDrugTestStatus.APPROVED && drugTest.status !== EDrugTestStatus.REJECTED) {
          const nextTotal = adminDocs.length + nextDriver.length;
          partial.status = nextTotal > 0 ? EDrugTestStatus.AWAITING_REVIEW : EDrugTestStatus.NOT_UPLOADED;
        }
        onChange(partial);
      } catch (e: any) {
        setGalleryError(e?.message || "Failed to delete temp file from S3.");
      } finally {
        setBusy(false);
      }
    }
  }

  /* ----------------------------- UI text ----------------------------- */
  const info = useMemo(() => {
    switch (derivedStatus) {
      case EDrugTestStatus.NOT_UPLOADED:
        return "Upload documents. Approve requires ≥ 1 admin document. Reject requires ≥ 1 driver document.";
      case EDrugTestStatus.AWAITING_REVIEW:
        return "Documents uploaded — awaiting decision (Approve: admin ≥ 1, Reject: driver ≥ 1).";
      case EDrugTestStatus.APPROVED:
        return approvedAtLoad ? "Verified — drug test approved. Status cannot be changed." : "Verified — drug test approved. Status can be toggled off before submit.";
      case EDrugTestStatus.REJECTED:
        return rejectedAtLoad ? "Rejected — driver documents were cleared. Waiting for driver to re-upload." : "Rejected — driver documents will be cleared on submit.";

      default:
        return "";
    }
  }, [derivedStatus, approvedAtLoad, rejectedAtLoad]);

  /* ----------------------------- Render ----------------------------- */
  return (
    <div className={showHighlight ? "ssp-ring-wrapper rounded-xl p-[6px] ssp-animated-ring" : ""}>
      <section
        className="relative rounded-xl border p-3 sm:p-4 lg:max-h-[22rem] lg:overflow-y-auto"
        style={{ background: "var(--color-card)", borderColor: "var(--color-outline)" }}
        aria-labelledby={titleId}
        aria-describedby={locked ? descId : undefined}
        aria-busy={busy || undefined}
      >
        {locked && (
          <>
            <p id={descId} className="sr-only">
              Locked until step is reached.
            </p>
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg pointer-events-none" aria-hidden>
              <div
                className="rounded-lg px-3 py-1.5 text-xs font-medium backdrop-blur-sm"
                style={{ background: "var(--color-surface)", color: "var(--color-on-surface)", border: "1px solid var(--color-outline)", boxShadow: "var(--elevation-2)" }}
              >
                Locked until step is reached
              </div>
            </div>
          </>
        )}

        {/* Header */}
        <header className="mb-3 flex items-center justify-between">
          <h2 id={titleId} className="text-base font-semibold">
            Drug Test
          </h2>

          <div className="flex items-center gap-2">
            {drugTest.status === EDrugTestStatus.APPROVED && (
              <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--color-success-container)", color: "var(--color-success-on-container)" }}>
                Drug Test Approved
              </span>
            )}
            {drugTest.status === EDrugTestStatus.REJECTED && (
              <span className="rounded-full px-2 py-0.5 text-xs color-white" style={{ background: "var(--color-error)" }}>
                Drug Test Rejected
              </span>
            )}
            <span className="text-xs opacity-70">
              Total Documents: {totalCount}/{MAX_TOTAL}
            </span>
          </div>
        </header>

        <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${locked ? "pointer-events-none" : ""}`}>
          {/* LEFT: info + actions + view docs */}
          <div className="rounded-xl border p-3 sm:p-4 space-y-3" style={{ borderColor: "var(--color-outline-variant)" }}>
            <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              {info}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors disabled:opacity-50 ${drugTest.status === EDrugTestStatus.APPROVED ? "font-semibold" : ""}`}
                style={{
                  background: drugTest.status === EDrugTestStatus.APPROVED ? "var(--color-primary)" : "var(--color-surface)",
                  color: drugTest.status === EDrugTestStatus.APPROVED ? "white" : "var(--color-on-surface)",
                  border: "1px solid var(--color-outline)",
                }}
                disabled={!canApprove}
                onClick={handleApprove}
                title={
                  approvedAtLoad
                    ? "Already approved; cannot change"
                    : drugTest.status === EDrugTestStatus.APPROVED
                    ? "Click to undo approval (staged)"
                    : adminCount < 1
                    ? "Upload at least one admin document first"
                    : "Approve"
                }
              >
                Approve
              </button>

              <button
                type="button"
                className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors disabled:opacity-50 ${drugTest.status === EDrugTestStatus.REJECTED ? "font-semibold" : ""}`}
                style={{
                  background: drugTest.status === EDrugTestStatus.REJECTED ? "var(--color-primary)" : "var(--color-surface)",
                  color: drugTest.status === EDrugTestStatus.REJECTED ? "white" : "var(--color-on-surface)",
                  border: "1px solid var(--color-outline)",
                }}
                disabled={!canReject}
                onClick={handleReject}
                title={
                  approvedAtLoad
                    ? "Already approved; cannot change"
                    : rejectedAtLoad && drugTest.status === EDrugTestStatus.REJECTED
                    ? "Already rejected; wait for driver to re-upload to continue"
                    : driverCount < 1
                    ? "Need at least one driver document to reject"
                    : drugTest.status === EDrugTestStatus.REJECTED
                    ? "Undo rejection"
                    : "Reject"
                }
              >
                Reject
              </button>
            </div>

            {showRejectWarn && !approvedAtLoad && !rejectedAtLoad && drugTest.status !== EDrugTestStatus.REJECTED && (
              <p className="mt-2 rounded-lg border px-3 py-2 text-xs" style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }} role="alert">
                Rejecting clears driver documents, keeps admin documents, and allows drivers to re-upload for approval—click <strong>Reject</strong> again to confirm.
              </p>
            )}

            <div className="pt-2">
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
                disabled={busyOrLocked || allItems.length === 0}
                title={allItems.length ? "Open gallery" : "No documents yet"}
              >
                View Docs
              </button>
            </div>
          </div>

          {/* RIGHT: uploader (ADMIN ONLY) */}
          <div className="rounded-xl border p-3 sm:p-4 space-y-2" style={{ borderColor: "var(--color-outline-variant)" }}>
            <div className="flex items-center justify-end">
              <div className="text-xs opacity-70">
                Admin: {adminCount}/{MAX_ADMIN} • Driver: {driverCount}/{MAX_DRIVER}
              </div>
            </div>

            <label
              className={`relative flex items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center ${busyOrLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
              style={{
                borderColor: "var(--color-outline-variant)",
                background: "var(--color-surface)",
                color: "var(--color-on-surface-variant)",
              }}
              title={busyOrLocked ? "Locked" : "Click to select files"}
            >
              <input
                type="file"
                className="absolute inset-0 h-full w-full opacity-0"
                accept={INPUT_ACCEPT}
                multiple
                onChange={(e) => handleUploadAdmin(e.currentTarget.files)}
                disabled={busyOrLocked}
                aria-label="Upload drug test documents"
              />
              <div className="pointer-events-none select-none">
                <div className="font-medium">Click to select files</div>
                <div className="mt-1 text-xs opacity-80">Supported: JPG, PNG, PDF, DOC, DOCX • Max {MAX_ADMIN}</div>
                {drugTest.status === EDrugTestStatus.APPROVED && (
                  <div className="mt-1 text-[11px] opacity-70">
                    While approved, at least <strong>one admin document</strong> must remain.
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-lg border px-2 py-1 text-xs" style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }} role="alert">
            {err}
          </div>
        )}

        {busy && (
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-black/5" aria-hidden>
            <div className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--color-primary)" }} />
          </div>
        )}

        <FileGalleryDialog
          open={galleryOpen}
          items={allItems}
          initialIndex={galleryIndex}
          title="Drug Test Documents"
          onClose={() => setGalleryOpen(false)}
          onDelete={(index, item) => {
            // Enforce admin-min-1 rule while approved when deleting an admin file
            const isAdminItem = adminDocs.some((p) => String(p?.url) === item.url);
            if (isAdminItem && drugTest.status === EDrugTestStatus.APPROVED && adminDocs.length <= 1) {
              setGalleryError("At least one admin document must remain while Approved.");
              return;
            } else if (isAdminItem && drugTest.status === EDrugTestStatus.REJECTED && driverDocs.length <= 1) {
              setGalleryError("At least one driver document must remain while Rejected.");
              return;
            }
            setGalleryError(null);
            void handleDeleteFromGallery(index, item);
          }}
          errorMessage={galleryError}
        />
      </section>
    </div>
  );
}
