"use client";

import { useId, useMemo, useState } from "react";
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
  canEdit: boolean;
  onChange: (partial: {
    documents?: IPhoto[];
    status?: EDrugTestStatus;
  }) => void;
};

export default function DrugTestCard({
  trackerId,
  drugTest,
  canEdit,
  onChange,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const titleId = useId();
  const descId = useId();

  const docs = drugTest.documents ?? [];
  const count = docs.length;

  const locked = !canEdit;
  const busyOrLocked = busy || locked;

  // UI-derived status (we still send the chosen status via onChange)
  const baseStatus =
    count > 0 ? EDrugTestStatus.AWAITING_REVIEW : EDrugTestStatus.NOT_UPLOADED;
  const derivedStatus = useMemo<EDrugTestStatus>(() => {
    // If admin explicitly chose Approved/Rejected, keep showing it
    if (
      drugTest.status === EDrugTestStatus.APPROVED ||
      drugTest.status === EDrugTestStatus.REJECTED
    ) {
      return drugTest.status;
    }
    return baseStatus;
  }, [drugTest.status, baseStatus]);

  // Approve/Reject buttons are enabled only when there’s something to review,
  // i.e., not “Not uploaded”. (We now ALLOW un-toggling from Approved/Rejected.)
  const canDecide =
    !busyOrLocked && derivedStatus !== EDrugTestStatus.NOT_UPLOADED;

  // Gallery state
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

  // Upload to S3 temp, then stage the combined list + auto status
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
      onChange({
        documents: nextDocs,
        // If the admin had not explicitly picked Approved/Rejected,
        // reflect auto status based on presence of docs.
        ...(drugTest.status === EDrugTestStatus.APPROVED ||
        drugTest.status === EDrugTestStatus.REJECTED
          ? {}
          : {
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

  // Toggle approve: if already approved → revert to auto status; else approve (requires a doc)
  function handleApprove() {
    if (!canDecide) return;
    if (drugTest.status === EDrugTestStatus.APPROVED) {
      onChange({ status: baseStatus });
    } else {
      if (count < 1) {
        setErr("Attach at least one document before approving.");
        return;
      }
      setErr(null);
      onChange({ status: EDrugTestStatus.APPROVED });
    }
  }

  // Toggle reject: if already rejected → revert to auto status; else reject
  function handleReject() {
    if (!canDecide) return;
    if (drugTest.status === EDrugTestStatus.REJECTED) {
      onChange({ status: baseStatus });
    } else {
      setErr(null);
      onChange({ status: EDrugTestStatus.REJECTED });
    }
  }

  // Delete from gallery (and auto status if admin hasn’t locked in Approved)
  function handleDeleteFromGallery(index: number) {
    const next = docs.filter((_, i) => i !== index);
    const partial: { documents: IPhoto[]; status?: EDrugTestStatus } = {
      documents: next,
    };
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

  // Copy (no badge)
  const info = useMemo(() => {
    switch (derivedStatus) {
      case EDrugTestStatus.NOT_UPLOADED:
        return "Prompt the driver to complete the test and upload the result, or upload on behalf of the driver.";
      case EDrugTestStatus.AWAITING_REVIEW:
        return "Documents uploaded — awaiting admin verification.";
      case EDrugTestStatus.APPROVED:
        return "Verified — drug test approved.";
      case EDrugTestStatus.REJECTED:
        return "Rejected — request a new upload if applicable.";
      default:
        return "";
    }
  }, [derivedStatus]);

  /* ----------------------------- Render ----------------------------- */

  return (
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
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/10 backdrop-blur-[1px] pointer-events-none"
            aria-hidden
          >
            <div
              className="rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-on-surface)",
                border: "1px solid var(--color-outline)",
                boxShadow: "var(--elevation-1)",
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
        {/* LEFT */}
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
              >
                Reject
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            <button
              type="button"
              className="block w-full rounded-xl px-4 py-5 text-center text-base font-semibold shadow-sm transition-colors"
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
              title={galleryItems.length ? "Open gallery" : "No documents yet"}
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
            At least one document is required to approve.
          </div>
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

      <ImageGalleryDialog
        open={galleryOpen}
        items={galleryItems}
        initialIndex={galleryIndex}
        title="Drug Test Documents"
        onClose={() => setGalleryOpen(false)}
        onDelete={(index) => handleDeleteFromGallery(index)}
      />
    </section>
  );
}
