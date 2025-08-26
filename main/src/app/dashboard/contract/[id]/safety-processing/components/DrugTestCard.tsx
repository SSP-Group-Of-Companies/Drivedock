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
  /** The card is interactive only when canEdit = true (step reached, not completed) */
  canEdit: boolean;
  /** Must return a Promise so we can await and render busy/error states */
  onPatch: (payload: {
    documents?: IPhoto[];
    status?: EDrugTestStatus;
  }) => Promise<unknown>;
};

const STATUSES: EDrugTestStatus[] = [
  EDrugTestStatus.NOT_UPLOADED,
  EDrugTestStatus.AWAITING_REVIEW,
  EDrugTestStatus.APPROVED,
  EDrugTestStatus.REJECTED,
];

const STATUS_LABEL: Record<EDrugTestStatus, string> = {
  [EDrugTestStatus.NOT_UPLOADED]: "Not uploaded",
  [EDrugTestStatus.AWAITING_REVIEW]: "Awaiting review",
  [EDrugTestStatus.APPROVED]: "Approved",
  [EDrugTestStatus.REJECTED]: "Rejected",
};

export default function DrugTestCard({
  trackerId,
  drugTest,
  canEdit,
  onPatch,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0); // reset file input after upload

  const titleId = useId();
  const descId = useId();

  const docs = drugTest.documents ?? [];
  const count = docs.length;
  const isApproved = drugTest.status === EDrugTestStatus.APPROVED;

  const locked = !canEdit;
  const busyOrLocked = busy || locked;

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const galleryItems: GalleryItem[] = (docs || [])
    .filter((p) => !!p?.url)
    .map((p) => ({
      url: String(p.url),
      uploadedAt: (p as any).uploadedAt,
    }));

  async function handleSelectFiles(files: FileList | null) {
    if (!files || files.length === 0 || busyOrLocked) return;
    setBusy(true);
    setErr(null);
    try {
      // Upload each file to S3 using the presigned flow (temp location)
      const uploaded: IPhoto[] = await Promise.all(
        [...files].map(async (file) => {
          const result = await uploadToS3Presigned({
            file,
            folder: ES3Folder.DRUG_TEST_PHOTOS,
            trackerId,
          });
          // result already contains { s3Key, url }; enrich with local metadata
          return {
            ...result,
            name: file.name,
            mimeType: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
          } as IPhoto;
        })
      );

      // Backend requires ≥1 doc if "documents" is sent
      await onPatch({ documents: uploaded });
      setFileKey((k) => k + 1);
    } catch (e: any) {
      setErr(e?.message || "Failed to upload drug test document(s).");
    } finally {
      setBusy(false);
    }
  }

  async function handleChangeStatus(s: EDrugTestStatus) {
    if (busyOrLocked) return;

    // no-go-back from APPROVED
    if (isApproved && s !== EDrugTestStatus.APPROVED) return;

    // approving requires ≥1 document
    if (s === EDrugTestStatus.APPROVED && count < 1) {
      setErr("Attach at least one document before approving.");
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      await onPatch({ status: s });
    } catch (e: any) {
      setErr(e?.message || "Failed to update status.");
    } finally {
      setBusy(false);
    }
  }

  const hint = useMemo(() => {
    switch (drugTest.status) {
      case EDrugTestStatus.NOT_UPLOADED:
        return "Prompt the driver to complete test and upload the result.";
      case EDrugTestStatus.AWAITING_REVIEW:
        return "Documents uploaded — awaiting admin verification.";
      case EDrugTestStatus.APPROVED:
        return "Verified — drug test approved.";
      case EDrugTestStatus.REJECTED:
        return "Rejected — request a new upload if applicable.";
      default:
        return "";
    }
  }, [drugTest.status]);

  return (
    <section
      className="relative rounded-xl border p-3 sm:p-4"
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-outline)",
      }}
      aria-labelledby={titleId}
      aria-describedby={locked ? descId : undefined}
      aria-busy={busy || undefined}
    >
      {/* Centered lock overlay (non-blocking so gallery can still open) */}
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

      {/* Header */}
      <header className="mb-3 flex items-center justify-between">
        <h2 id={titleId} className="text-base font-semibold">
          Drug Test
        </h2>
        <span className="text-xs opacity-70">Documents: {count}</span>
      </header>

      {/* Body */}
      <div
        className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${
          locked ? "pointer-events-none" : ""
        }`}
      >
        {/* LEFT PANEL: status + see docs */}
        <div
          className="rounded-xl border"
          style={{ borderColor: "var(--color-outline-variant)" }}
        >
          <div
            className="p-3 sm:p-4"
            style={{ borderBottom: "1px solid var(--color-outline-variant)" }}
          >
            <div className="mb-2 text-xs opacity-70">Status</div>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => {
                const selected = drugTest.status === s;
                const disabled =
                  busyOrLocked ||
                  (isApproved && s !== EDrugTestStatus.APPROVED);
                return (
                  <button
                    key={s}
                    type="button"
                    className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                      selected ? "font-semibold" : ""
                    } disabled:opacity-50`}
                    style={{
                      background: selected
                        ? "var(--color-primary)"
                        : "var(--color-surface)",
                      color: selected ? "white" : "var(--color-on-surface)",
                      border: "1px solid var(--color-outline)",
                    }}
                    disabled={disabled}
                    onClick={() => handleChangeStatus(s)}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                );
              })}
            </div>
            <div
              className="mt-2 text-xs"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              {hint}
            </div>
          </div>

          {/* See documents */}
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
            >
              See Documents{galleryItems.length ? "" : " (none)"}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: dashed upload zone */}
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

      {/* Busy overlay */}
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
      />
    </section>
  );
}
