"use client";

import { useMemo, useState, useId } from "react";
import type { IPhoto } from "@/types/shared.types";
import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import ImageGalleryDialog, {
  type GalleryItem,
} from "@/app/dashboard/components/dialogs/ImageGalleryDialog";

type Props = {
  trackerId: string;
  driverEmail?: string;
  carriersEdge: {
    emailSent?: boolean;
    emailSentBy?: string;
    emailSentAt?: string;
    certificates?: IPhoto[];
    completed?: boolean;
  };
  /** When false, the card is visually greyed out and all controls are disabled. */
  canEdit: boolean;
  /** PATCH wrapper from the page client; must return a Promise so the card can await. */
  onPatch: (payload: {
    certificates?: IPhoto[];
    emailSent?: boolean;
    emailSentBy?: string;
    emailSentAt?: string;
    completed?: boolean;
  }) => Promise<unknown>;
};

export default function CarriersEdgeCard({
  trackerId,
  driverEmail,
  carriersEdge,
  canEdit,
  onPatch,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0); // force-reset <input type="file" />

  const headingId = useId();
  const descId = useId();

  const locked = !canEdit;
  const busyOrLocked = busy || locked;

  const certs = carriersEdge.certificates ?? [];
  const certificatesCount = certs.length;

  const canComplete =
    certificatesCount >= 1 && carriersEdge.completed !== true && canEdit;

  // gallery wiring
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryItems: GalleryItem[] = certs
    .filter((p) => !!p?.url)
    .map((p) => ({
      url: String(p.url),
      uploadedAt: (p as any).uploadedAt,
    }));

  const sentLine = useMemo(() => {
    if (!carriersEdge.emailSent) return "Not sent";
    const by = carriersEdge.emailSentBy?.trim() || "—";
    const at = carriersEdge.emailSentAt
      ? new Date(carriersEdge.emailSentAt).toLocaleString()
      : "—";
    return `Sent by ${by} on ${at}`;
  }, [
    carriersEdge.emailSent,
    carriersEdge.emailSentAt,
    carriersEdge.emailSentBy,
  ]);

  async function handleMarkSent() {
    if (busyOrLocked || carriersEdge.emailSent) return;
    setBusy(true);
    setErr(null);
    try {
      const admin = window.localStorage.getItem("admin_name") || "Admin";
      await onPatch({
        emailSent: true,
        emailSentBy: admin,
        emailSentAt: new Date().toISOString(),
      });
    } catch (e: any) {
      setErr(e?.message || "Failed to mark email as sent");
    } finally {
      setBusy(false);
    }
  }

  // ✅ real S3 presigned upload into temp; then PATCH the combined list
  async function handleSelectFiles(files: FileList | null) {
    if (busyOrLocked || !files || files.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const uploaded: IPhoto[] = [];
      for (const file of Array.from(files)) {
        const result = await uploadToS3Presigned({
          file,
          folder: ES3Folder.CARRIERS_EDGE_CERTIFICATES,
          trackerId,
        });
        uploaded.push(result);
      }
      await onPatch({ certificates: [...certs, ...uploaded] });
      setFileKey((k) => k + 1); // clear the input so the same filename can be re-selected
    } catch (e: any) {
      setErr(e?.message || "Failed to upload certificates");
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!canComplete || busyOrLocked) return;
    setBusy(true);
    setErr(null);
    try {
      await onPatch({ completed: true });
    } catch (e: any) {
      setErr(e?.message || "Failed to mark as completed");
    } finally {
      setBusy(false);
    }
  }

  console.log("CE cache snapshot", {
    emailSent: carriersEdge?.emailSent,
    by: carriersEdge?.emailSentBy,
    at: carriersEdge?.emailSentAt,
    certs: carriersEdge?.certificates?.length,
  });

  /* ------------------------------- Render ------------------------------- */
  return (
    <section
      className="relative rounded-xl border p-3 sm:p-4"
      aria-labelledby={headingId}
      aria-describedby={locked ? descId : undefined}
      aria-busy={busy || undefined}
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-outline)",
      }}
    >
      {/* Centered lock overlay (like Drive Test) */}
      {locked && (
        <>
          <p id={descId} className="sr-only">
            Locked until step is reached. Controls are disabled.
          </p>
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/10 backdrop-blur-[1px]"
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

      {/* Header: title left, count right */}
      <header className="mb-3 flex items-center justify-between">
        <h2 id={headingId} className="text-base font-semibold">
          Carrier’s Edge
        </h2>
        <span className="text-xs opacity-70">
          Certificates: {certificatesCount}
        </span>
      </header>

      {/* Two columns (stack on mobile) */}
      <div
        className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${
          locked ? "pointer-events-none" : ""
        }`}
      >
        {/* LEFT PANEL */}
        <div
          className="rounded-xl border"
          style={{ borderColor: "var(--color-outline-variant)" }}
        >
          {/* Email sent row */}
          <div
            className="flex flex-col gap-2 p-3 sm:p-4"
            style={{ borderBottom: "1px solid var(--color-outline-variant)" }}
          >
            <label className="inline-flex items-center gap-2 text-base sm:text-lg font-medium">
              <span>Send Email:</span>
              <input
                type="checkbox"
                disabled={busyOrLocked || !!carriersEdge.emailSent}
                checked={!!carriersEdge.emailSent}
                onChange={handleMarkSent}
                className="h-4 w-4"
              />
            </label>
            <div
              className="text-xs"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              {sentLine} {driverEmail ? `(${driverEmail})` : ""}
            </div>
          </div>

          {/* See certificates button */}
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
              See Certificates{galleryItems.length ? "" : " (none)"}
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: dashed drop zone + complete */}
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
              aria-label="Upload Carrier’s Edge certificate images"
              capture="environment"
            />
            <div className="pointer-events-none select-none">
              Click to capture or select an image
            </div>
          </label>

          <div className="mt-3 flex justify-end">
            <button
              className="rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
              style={{
                background: "var(--color-primary)",
                color: "white",
              }}
              onClick={handleComplete}
              disabled={busyOrLocked || !canComplete}
            >
              {carriersEdge.completed ? "Completed" : "Mark as Completed"}
            </button>
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

      {/* Gallery */}
      <ImageGalleryDialog
        open={galleryOpen}
        items={galleryItems}
        initialIndex={galleryIndex}
        title="Carrier’s Edge Certificates"
        onClose={() => setGalleryOpen(false)}
      />
    </section>
  );
}
