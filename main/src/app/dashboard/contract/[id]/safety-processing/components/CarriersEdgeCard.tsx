"use client";

import { useMemo, useState, useId, useEffect } from "react";
import type { IPhoto } from "@/types/shared.types";
import { uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { ES3Folder } from "@/types/aws.types";
import ImageGalleryDialog, {
  type GalleryItem,
} from "@/app/dashboard/components/dialogs/ImageGalleryDialog";

type CarriersEdgeView = {
  emailSent?: boolean;
  emailSentBy?: string;
  emailSentAt?: string; // ISO
  certificates?: IPhoto[];
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

export default function CarriersEdgeCard({
  trackerId,
  driverEmail,
  carriersEdge,
  canEdit,
  onChange,
  highlight = false,
}: Props) {
  const [busy, setBusy] = useState(false); // uploading only
  const [err, setErr] = useState<string | null>(null);
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
  const canToggleCompleted =
    !carriersEdge.completed &&
    emailSent &&
    certificatesCount >= 1 &&
    canEdit &&
    !busy;

  // Gallery
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryItems: GalleryItem[] = certificates
    .filter((p) => !!p?.url)
    .map((p) => ({ url: String(p.url), uploadedAt: (p as any).uploadedAt }));

  const sentLine = useMemo(() => {
    if (!emailSent) return "Not sent";
    const by = carriersEdge.emailSentBy?.trim() || "—";
    const at = carriersEdge.emailSentAt
      ? new Date(carriersEdge.emailSentAt).toLocaleString()
      : "—";
    return `Sent by ${by} on ${at}`;
  }, [emailSent, carriersEdge.emailSentBy, carriersEdge.emailSentAt]);

  /* ----------------------------- Handlers (stage) ----------------------------- */

  function handleEmailSentToggle(checked: boolean) {
    if (emailSent || !checked) return; // one-way
    const admin = window.localStorage.getItem("admin_name") || "Admin";
    onChange({
      emailSent: true,
      emailSentBy: admin,
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
      const uploaded: IPhoto[] = [];
      for (const file of Array.from(files)) {
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

  /* -------------------------------- Render -------------------------------- */

  return (
    <div
      className={`relative ${
        showHighlight
          ? "ssp-ring-wrapper rounded-xl p-[6px] ssp-animated-ring"
          : ""
      }`}
    >
      <section
        className="relative rounded-xl border p-3 sm:p-4 lg:max-h-[21rem] lg:overflow-y-auto"
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
            <div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg"
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

        {/* Header */}
        <header className="mb-3 flex items-center justify-between">
          <h2 id={headingId} className="text-base font-semibold">
            Carrier’s Edge
          </h2>
          <span className="text-xs opacity-70">
            Certificates: {certificatesCount}
          </span>
        </header>

        {/* Body */}
        <div
          className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${
            locked ? "pointer-events-none" : ""
          }`}
        >
          {/* LEFT: email + gallery */}
          <div
            className="rounded-xl border"
            style={{ borderColor: "var(--color-outline-variant)" }}
          >
            <div
              className="flex flex-col gap-2 p-3 sm:p-4"
              style={{ borderBottom: "1px solid var(--color-outline-variant)" }}
            >
              <label
                className="inline-flex items-center gap-2 text-base sm:text-lg font-medium"
                title={
                  locked
                    ? undefined
                    : canToggleEmailSent
                    ? "Mark when credentials were sent to the driver"
                    : emailSent
                    ? "Already marked as sent"
                    : "Busy…"
                }
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  disabled={!canToggleEmailSent}
                  checked={emailSent}
                  onChange={(e) =>
                    handleEmailSentToggle(e.currentTarget.checked)
                  }
                />
                <span>Credentials email sent</span>
              </label>
              <div
                className="text-xs"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
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
                title={
                  locked
                    ? undefined
                    : galleryItems.length === 0
                    ? "No certificates yet"
                    : "Open gallery"
                }
              >
                See Certificates
              </button>
            </div>
          </div>

          {/* RIGHT: upload (no inner overlays; just disabled + tooltip) */}
          <div
            className="flex flex-col items-stretch justify-between rounded-xl border p-3 sm:p-4"
            style={{ borderColor: "var(--color-outline-variant)" }}
          >
            <label
              className={`relative flex flex-1 items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center ${
                canUpload ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              }`}
              style={{
                borderColor: "var(--color-outline-variant)",
                background: "var(--color-surface)",
                color: "var(--color-on-surface-variant)",
              }}
              title={
                locked
                  ? undefined
                  : canUpload
                  ? "Click to capture or select images"
                  : "Send credentials to enable uploads"
              }
            >
              <input
                key={fileKey}
                type="file"
                className="absolute inset-0 h-full w-full opacity-0"
                accept="image/*"
                multiple
                onChange={(e) => handleSelectFiles(e.currentTarget.files)}
                disabled={!canUpload}
                aria-label="Upload Carrier’s Edge certificate images"
                capture="environment"
              />
              <div className="pointer-events-none select-none">
                Click to capture or select an image
              </div>
            </label>
          </div>
        </div>

        {/* Footer: completed */}
        <div
          className="mt-3 flex items-center justify-between rounded-xl border px-3 py-2"
          style={{ borderColor: "var(--color-outline-variant)" }}
        >
          <label
            className={`inline-flex items-center gap-2 text-sm ${
              canToggleCompleted ? "" : "opacity-60"
            }`}
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
            <input
              type="checkbox"
              className="h-4 w-4"
              disabled={!canToggleCompleted}
              checked={!!carriersEdge.completed}
              onChange={(e) => handleCompleteToggle(e.currentTarget.checked)}
            />
            <span>Mark as completed</span>
          </label>

          <div className="text-xs opacity-70">
            {emailSent
              ? certificatesCount >= 1
                ? "Ready to submit changes."
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

        {/* Gallery with delete */}
        <ImageGalleryDialog
          open={galleryOpen}
          items={galleryItems}
          initialIndex={galleryIndex}
          title="Carrier’s Edge Certificates"
          onClose={() => setGalleryOpen(false)}
          onDelete={(_i, item) => {
            const idx = certificates.findIndex(
              (p) => String(p?.url) === item.url
            );
            if (idx === -1) return;
            const next = certificates.filter((_, i) => i !== idx);
            if (carriersEdge.completed && next.length < 1) {
              onChange({ certificates: next, completed: false });
            } else {
              onChange({ certificates: next });
            }
          }}
        />
      </section>
    </div>
  );
}
