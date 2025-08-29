"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { IPhoto } from "@/types/shared.types";
import { EDrugTestStatus } from "@/types/drugTest.types";
import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import ImageGalleryDialog, {
  type GalleryItem,
} from "@/app/dashboard/components/dialogs/ImageGalleryDialog";

type Props = {
  trackerId: string;
  drugTest: { documents?: IPhoto[]; status?: EDrugTestStatus };
  /** Step gate */
  canEdit: boolean;
  /**
   * Stage-only change emitter (DO NOT PATCH HERE).
   * The parent page will aggregate and submit.
   */
  onChange: (partial: {
    documents?: IPhoto[];
    status?: EDrugTestStatus;
  }) => void;
  /** Optional glow when navigated from the grid ("highlight=drug-test") */
  highlight?: boolean;
};

export default function DrugTestCard({
  trackerId,
  drugTest,
  canEdit,
  onChange,
  highlight = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [showHighlight, setShowHighlight] = useState(highlight);

  // auto-hide highlight after a short moment
  useEffect(() => {
    if (!highlight) return;
    setShowHighlight(true);
    const t = setTimeout(() => setShowHighlight(false), 3000);
    return () => clearTimeout(t);
  }, [highlight]);

  const titleId = useId();
  const descId = useId();

  const docs = drugTest.documents ?? [];
  const count = docs.length;

  const locked = !canEdit;
  const busyOrLocked = busy || locked;

  // Base auto status from documents presence
  const baseStatus =
    count > 0 ? EDrugTestStatus.AWAITING_REVIEW : EDrugTestStatus.NOT_UPLOADED;

  // Show APPROVED/REJECTED if explicitly set; otherwise show auto status
  const derivedStatus = useMemo<EDrugTestStatus>(() => {
    if (
      drugTest.status === EDrugTestStatus.APPROVED ||
      drugTest.status === EDrugTestStatus.REJECTED
    ) {
      return drugTest.status;
    }
    return baseStatus;
  }, [drugTest.status, baseStatus]);

  // Can choose Approve/Reject only when there's something to review AND not already approved
  const canDecide =
    !busyOrLocked && 
    derivedStatus !== EDrugTestStatus.NOT_UPLOADED && 
    drugTest.status !== EDrugTestStatus.APPROVED;

  // Gallery
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryItems: GalleryItem[] = docs
    .filter((p) => !!p?.url)
    .map((p) => ({
      url: String(p.url),
      uploadedAt: (p as any).uploadedAt,
      name: (p as any).name,
    }));

  /* ---------------------------- Handlers ---------------------------- */

  // Upload to temp S3, then stage new docs AND status
  async function handleSelectFiles(files: FileList | null) {
    if (!files || files.length === 0 || busyOrLocked) return;
    setBusy(true);
    setErr(null);
    try {
      const uploaded: IPhoto[] = await Promise.all(
        [...files].map(async (file) => {
          const result = await uploadToS3Presigned({
            file,
            folder: ES3Folder.DRUG_TEST_PHOTOS,
            trackerId,
          });
          return {
            ...result,
            name: file.name,
            mimeType: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          } as IPhoto;
        })
      );

      const nextDocs = [...docs, ...uploaded];

      // If previously REJECTED, new upload should move back to AWAITING_REVIEW.
      // If APPROVED, leave as-is (server may forbid un-approve).
      const shouldAutoStatus = drugTest.status !== EDrugTestStatus.APPROVED; // allow override when REJECTED or unset

      onChange({
        documents: nextDocs,
        ...(shouldAutoStatus && {
          status:
            nextDocs.length > 0
              ? EDrugTestStatus.AWAITING_REVIEW
              : EDrugTestStatus.NOT_UPLOADED,
        }),
      });

      setFileKey((k) => k + 1);
    } catch (e: any) {
      setErr(e?.message || "Failed to upload drug test document(s).");
    } finally {
      setBusy(false);
    }
  }

  // Approve: toggle on/off. Off = revert to auto status.
  function handleApprove() {
    if (!canDecide) return;

    if (drugTest.status === EDrugTestStatus.APPROVED) {
      onChange({ status: baseStatus });
      return;
    }

    if (count < 1) {
      setErr("Attach at least one document before approving.");
      return;
    }
    setErr(null);
    onChange({ status: EDrugTestStatus.APPROVED });
  }

  // Reject: toggle on/off. When turning ON, clear docs immediately (reflect server rule).
  function handleReject() {
    if (!canDecide) return;

    if (drugTest.status === EDrugTestStatus.REJECTED) {
      // Turning off → revert to auto status (docs are already empty in UI after a reject)
      onChange({ status: baseStatus });
      return;
    }

    setErr(null);
    onChange({ status: EDrugTestStatus.REJECTED, documents: [] });
  }

  // Delete a single image from the staged list; adjust auto status if not APPROVED
  function handleDeleteFromGallery(index: number) {
    const next = docs.filter((_, i) => i !== index);
    const partial: { documents: IPhoto[]; status?: EDrugTestStatus } = {
      documents: next,
    };

    // If status isn't locked to APPROVED/REJECTED, keep auto status in sync
    if (
      drugTest.status !== EDrugTestStatus.APPROVED &&
      drugTest.status !== EDrugTestStatus.REJECTED
    ) {
      partial.status =
        next.length > 0
          ? EDrugTestStatus.AWAITING_REVIEW
          : EDrugTestStatus.NOT_UPLOADED;
    }

    onChange(partial);
  }

  const info = useMemo(() => {
    switch (derivedStatus) {
      case EDrugTestStatus.NOT_UPLOADED:
        return "Prompt the driver to complete the test and upload the result, or upload on behalf of the driver.";
      case EDrugTestStatus.AWAITING_REVIEW:
        return "Documents uploaded — awaiting admin verification.";
      case EDrugTestStatus.APPROVED:
        return "Verified — drug test approved. Status cannot be changed once approved.";
      case EDrugTestStatus.REJECTED:
        return "Rejected — request a new upload if applicable.";
      default:
        return "";
    }
  }, [derivedStatus]);

  /* ----------------------------- Render ----------------------------- */

  return (
    <div
      className={
        showHighlight
          ? "ssp-ring-wrapper rounded-xl p-[6px] ssp-animated-ring"
          : ""
      }
    >
      <section
        className="relative rounded-xl border p-3 sm:p-4 lg:max-h-[20rem] lg:overflow-y-auto"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-outline)",
        }}
        aria-labelledby={titleId}
        aria-describedby={locked ? descId : undefined}
        aria-busy={busy || undefined}
      >
        {locked && (
          <>
            <p id={descId} className="sr-only">
              Locked until step is reached.
            </p>
                         <div
               className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg pointer-events-none"
               aria-hidden
             >
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

        <header className="mb-3 flex items-center justify-between">
          <h2 id={titleId} className="text-base font-semibold">
            Drug Test
          </h2>
          <span className="text-xs opacity-70">Documents: {count}</span>
        </header>

        <div
          className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${
            locked ? "pointer-events-none" : ""
          }`}
        >
          {/* LEFT: instructions + actions + gallery button */}
          <div
            className="rounded-xl border"
            style={{ borderColor: "var(--color-outline-variant)" }}
          >
            <div
              className="p-3 sm:p-4 space-y-3"
              style={{ borderBottom: "1px solid var(--color-outline-variant)" }}
            >
              <p
                className="text-sm"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                {info}
              </p>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors disabled:opacity-50 ${
                    drugTest.status === EDrugTestStatus.APPROVED
                      ? "font-semibold"
                      : ""
                  }`}
                  style={{
                    background:
                      drugTest.status === EDrugTestStatus.APPROVED
                        ? "var(--color-primary)"
                        : "var(--color-surface)",
                    color:
                      drugTest.status === EDrugTestStatus.APPROVED
                        ? "white"
                        : "var(--color-on-surface)",
                    border: "1px solid var(--color-outline)",
                  }}
                  disabled={!canDecide}
                  onClick={handleApprove}
                  title={
                    drugTest.status === EDrugTestStatus.APPROVED
                      ? "Cannot change status once approved"
                      : canDecide
                      ? "Approve"
                      : "Upload a document first"
                  }
                >
                  Approve
                </button>

                <button
                  type="button"
                  className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors disabled:opacity-50 ${
                    drugTest.status === EDrugTestStatus.REJECTED
                      ? "font-semibold"
                      : ""
                  }`}
                  style={{
                    background:
                      drugTest.status === EDrugTestStatus.REJECTED
                        ? "var(--color-primary)"
                        : "var(--color-surface)",
                    color:
                      drugTest.status === EDrugTestStatus.REJECTED
                        ? "white"
                        : "var(--color-on-surface)",
                    border: "1px solid var(--color-outline)",
                  }}
                  disabled={!canDecide}
                  onClick={handleReject}
                  title={
                    drugTest.status === EDrugTestStatus.APPROVED
                      ? "Cannot change status once approved"
                      : canDecide
                      ? drugTest.status === EDrugTestStatus.REJECTED
                        ? "Undo rejection"
                        : "Reject (clears documents)"
                      : "Upload a document first"
                  }
                >
                  Reject
                </button>
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
                disabled={busyOrLocked || galleryItems.length === 0}
                title={
                  galleryItems.length ? "Open gallery" : "No documents yet"
                }
              >
                See Documents
              </button>
            </div>
          </div>

          {/* RIGHT: upload */}
          <div
            className="flex flex-col items-stretch justify-between rounded-xl border p-3 sm:p-4"
            style={{ borderColor: "var(--color-outline-variant)" }}
          >
            <label
              className="relative flex flex-1 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center"
              style={{
                borderColor: "var(--color-outline-variant)",
                background: "var(--color-surface)",
                color: "var(--color-on-surface-variant)",
              }}
              title={
                busyOrLocked ? "Locked" : "Click to capture or select images"
              }
            >
              <input
                key={fileKey}
                type="file"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                accept="image/*"
                multiple
                onChange={(e) => handleSelectFiles(e.currentTarget.files)}
                disabled={busyOrLocked}
                aria-label="Upload drug test result images"
              />
              <div className="pointer-events-none select-none">
                Click to capture or select an image
              </div>
            </label>

            <div
              className="mt-3 text-xs"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              {drugTest.status === EDrugTestStatus.APPROVED 
                ? "Documents can be deleted, but at least one document must remain when approved."
                : "At least one document is required to approve."
              }
            </div>
          </div>
        </div>

        {/* Error */}
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

        {/* Uploading overlay */}
        {busy && (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl bg-black/5"
            aria-hidden
          >
            <div
              className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-transparent"
              style={{ borderTopColor: "var(--color-primary)" }}
            />
          </div>
        )}

        {/* Gallery (supports delete) */}
        <ImageGalleryDialog
          open={galleryOpen}
          items={galleryItems}
          initialIndex={galleryIndex}
          title="Drug Test Documents"
          onClose={() => setGalleryOpen(false)}
          onDelete={(index, _item) => {
            // Allow deletion even when approved, but prevent if only 1 document remains
            if (drugTest.status === EDrugTestStatus.APPROVED && galleryItems.length <= 1) {
              // Show error message in gallery
              setGalleryError("At least one document must exist when approved.");
              return;
            }
            handleDeleteFromGallery(index);
            setGalleryError(null); // Clear any previous error
          }}
          errorMessage={galleryError}
        />
      </section>
    </div>
  );
}
