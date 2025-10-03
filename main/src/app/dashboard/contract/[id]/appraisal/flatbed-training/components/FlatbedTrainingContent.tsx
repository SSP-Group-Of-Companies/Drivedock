"use client";

import React, { useMemo, useState, useId } from "react";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import type { IFileAsset } from "@/types/shared.types";
import FlatbedCertificateCard from "./FlatbedCertificateCard";
import FileGalleryDialog, { type GalleryItem } from "@/app/dashboard/components/dialogs/FileGalleryDialog";
import { deleteTempFile } from "@/lib/utils/s3Upload";

type FlatbedView = {
  flatbedCertificate?: IFileAsset;
  completed: boolean;
};

interface FlatbedTrainingContentProps {
  trackerId: string;
  onboardingContext: IOnboardingTrackerContext;
  view: FlatbedView; // merged (server + staged)
  onStage: (changes: Partial<FlatbedView>) => void;
  isEditMode: boolean;
  completedAtLoad: boolean; // 👈 new: server truth at initial load
}

export default function FlatbedTrainingContent({ trackerId, onboardingContext, view, onStage, isEditMode, completedAtLoad }: FlatbedTrainingContentProps) {
  const applicable = Boolean(onboardingContext?.needsFlatbedTraining);
  const canEdit = isEditMode;

  const headerId = useId();

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  const cert = view.flatbedCertificate;
  const hasCert = !!cert;

  const galleryItems: GalleryItem[] = useMemo(
    () =>
      cert?.url
        ? [
            {
              url: String(cert.url),
              name: cert.originalName || "Flatbed Certificate",
              mimeType: (cert.mimeType || "").toLowerCase(),
              uploadedAt: (cert as any)?.uploadedAt,
            },
          ]
        : [],
    [cert]
  );

  async function handleDeleteFromGallery(_: number, _item: GalleryItem) {
    if (view.completed || !hasCert) return; // block when completed
    setGalleryError(null);
    try {
      await deleteTempFile(cert);
      onStage({ flatbedCertificate: undefined });
    } catch (e: any) {
      setGalleryError(e?.message || "Failed to delete the temporary file from S3.");
    }
  }

  if (!applicable) {
    return (
      <section className="rounded-xl border p-4" style={{ background: "var(--color-card)", borderColor: "var(--color-outline)" }}>
        <header className="mb-2 flex items-center justify-between">
          <h2 id={headerId} className="text-base font-semibold">
            Flatbed Training
          </h2>
        </header>
        <div className="rounded-lg border p-3 text-sm" style={{ background: "var(--color-surface)", borderColor: "var(--color-outline-variant)", color: "var(--color-on-surface)" }}>
          Flatbed training is <strong>not applicable</strong> for this applicant.
        </div>
      </section>
    );
  }

  // ✅ Toggle rule:
  // - If completedAtLoad === true → cannot toggle at all
  // - If completedAtLoad === false → can toggle freely before submit
  // - For UX parity with Safety, prevent checking when no cert
  const checkboxDisabled = !canEdit || completedAtLoad || (!hasCert && !view.completed);

  return (
    <section className="rounded-xl border p-3 sm:p-4" style={{ background: "var(--color-card)", borderColor: "var(--color-outline)" }} aria-labelledby={headerId}>
      <header className="mb-3 flex items-center justify-between">
        <h2 id={headerId} className="text-base font-semibold">
          Flatbed Training
        </h2>
        <div className="flex items-center gap-2">
          {view.completed && (
            <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--color-success-container)", color: "var(--color-success-on-container)" }}>
              Flatbed Complete
            </span>
          )}
          <span className="text-xs opacity-70">Certificate: {hasCert ? "1/1" : "0/1"}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl border p-3 sm:p-4 space-y-3" style={{ borderColor: "var(--color-outline-variant)" }}>
          <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            {completedAtLoad ? (
              <>Completed — flatbed training is completed and status cannot be changed. You may replace the certificate but not delete it.</>
            ) : (
              <>Upload certificate. {view.completed ? "While completed, you may replace it but not delete it." : "You can delete it before completion."}</>
            )}
          </p>

          <button
            type="button"
            className="block w-full rounded-xl px-4 py-5 text-center text-base font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--color-primary-container)", color: "var(--color-primary-on-container)", border: "1px solid var(--color-outline-variant)" }}
            onClick={() => setGalleryOpen(true)}
            disabled={!hasCert}
            title={hasCert ? "Open certificate" : "No certificate yet"}
          >
            View Certificate
          </button>
        </div>

        <FlatbedCertificateCard
          trackerId={trackerId}
          file={cert}
          canEdit={canEdit}
          completed={view.completed}
          onSelect={(file) => onStage({ flatbedCertificate: file })}
          onClear={() => onStage({ flatbedCertificate: undefined })}
        />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: "var(--color-outline-variant)" }}>
        <label
          className={`inline-flex items-center gap-2 text-sm ${checkboxDisabled ? "opacity-60" : ""}`}
          title={completedAtLoad ? "Already completed on load; cannot change" : !hasCert && !view.completed ? "Upload a certificate first" : "Toggle completion"}
        >
          <input
            type="checkbox"
            className="h-4 w-4"
            disabled={checkboxDisabled}
            checked={!!view.completed}
            onChange={(e) => {
              const next = e.currentTarget.checked;
              // If loaded as not completed, allow toggling both ways pre-submit.
              onStage({ completed: !!next });
            }}
          />
          <span>Mark as completed</span>
        </label>

        <div className="text-xs opacity-70">
          {completedAtLoad
            ? "You can replace the certificate."
            : view.completed
            ? "Ready — will mark as completed on submit."
            : hasCert
            ? "Check “Mark as completed” to enable submit."
            : "Upload a certificate, then check “Mark as completed”."}
        </div>
      </div>

      <FileGalleryDialog
        open={galleryOpen}
        items={galleryItems}
        initialIndex={0}
        title="Flatbed Certificate"
        onClose={() => setGalleryOpen(false)}
        onDelete={
          !view.completed
            ? (index, item) => {
                setGalleryError(null);
                void handleDeleteFromGallery(index, item);
              }
            : undefined
        }
        errorMessage={galleryError}
      />
    </section>
  );
}
