"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FileText, File as FileIcon } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy-load PDF viewer only when needed
const PdfViewerInner = dynamic(() => import("@/components/pdf-viewer/PdfViewerInner"), { ssr: false });

export type GalleryItem = {
  url: string; // absolute or same-origin URL
  name?: string; // filename/caption
  alt?: string; // optional alt (defaults to name or generic)
  uploadedAt?: string; // ISO timestamp
  mimeType?: string; // drive preview logic (image/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document)
};

type Props = Readonly<{
  open: boolean;
  items: GalleryItem[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
  onDelete?: (index: number, item: GalleryItem) => void;
  errorMessage?: string | null;
}>;

function isImage(mt?: string) {
  return typeof mt === "string" && mt.toLowerCase().startsWith("image/");
}
function isPdf(mt?: string) {
  return (mt || "").toLowerCase() === "application/pdf";
}
function isDoc(mt?: string) {
  const t = (mt || "").toLowerCase();
  return t === "application/msword" || t === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

export default function FileGalleryDialog({ open, items, initialIndex = 0, title = "Documents", onClose, onDelete, errorMessage }: Props) {
  const [idx, setIdx] = useState(initialIndex);
  const labelId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIdx((i) => (items.length ? Math.min(Math.max(0, i), items.length - 1) : 0));
  }, [items]);

  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIdx((i) => Math.min(items.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items.length, onClose]);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  const current = items[idx];
  const caption = useMemo(() => {
    const parts = [current?.name?.trim(), current?.uploadedAt ? new Date(current.uploadedAt).toLocaleString() : undefined].filter(Boolean);
    return parts.join(" • ");
  }, [current]);

  if (!open) return null;

  const renderThumb = (it: GalleryItem, active: boolean, i: number) => {
    const mt = it.mimeType?.toLowerCase();
    const common = `h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border ${active ? "ring-2 ring-[var(--color-primary)]" : ""}`;
    const style = { borderColor: "var(--color-outline-variant)" } as const;

    if (isImage(mt)) {
      return (
        <button key={`${it.url}-${i}`} type="button" onClick={() => setIdx(i)} className={common} style={style} title={it.name || `Image ${i + 1}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={it.url} alt={it.alt || it.name || `Image ${i + 1}`} className="h-full w-full object-cover" draggable={false} />
        </button>
      );
    }

    // Non-image thumb (PDF/DOC): show icon tile
    const Icon = isPdf(mt) ? FileText : FileIcon;
    const label = isPdf(mt) ? "PDF" : "DOC";
    return (
      <button key={`${it.url}-${i}`} type="button" onClick={() => setIdx(i)} className={`${common} grid place-items-center`} style={style} title={it.name || `${label} ${i + 1}`}>
        <div className="flex flex-col items-center text-xs opacity-80">
          <Icon className="h-6 w-6 mb-1" />
          <span className="truncate max-w-[3.5rem]">{label}</span>
        </div>
      </button>
    );
  };

  const renderHero = (it?: GalleryItem) => {
    if (!it) {
      return (
        <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
          No file selected
        </div>
      );
    }
    const mt = it.mimeType?.toLowerCase();

    if (isImage(mt)) {
      return (
        <div className="flex h-full items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={it.url} alt={it.alt || it.name || "Image"} className="max-h-full max-w-full object-contain" draggable={false} />
        </div>
      );
    }
    if (isPdf(mt)) {
      // Inline PDF preview (scroll inside hero only)
      return (
        <div className="h-full w-full overflow-auto">
          <PdfViewerInner pdfUrl={it.url} />
        </div>
      );
    }
    // DOC/DOCX (no inline preview)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <FileText className="h-12 w-12 opacity-80" />
        <div className="text-sm opacity-80">Preview not available. Download to view.</div>
        <a
          href={it.url}
          download
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border px-3 py-1 text-sm transition-colors hover:bg-black/5 dark:hover:bg:white/5"
          style={{ borderColor: "var(--color-outline)" }}
        >
          Download
        </a>
      </div>
    );
  };

  const currentKind = isImage(current?.mimeType) ? "Image" : isPdf(current?.mimeType) ? "PDF" : isDoc(current?.mimeType) ? "DOC" : "File";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby={labelId}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onClose} />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-xl outline-none"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-outline)", boxShadow: "var(--elevation-3)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--color-outline-variant)" }}>
          <div className="min-w-0">
            <h2 id={labelId} className="truncate text-base font-semibold">
              {title}
            </h2>
            <div className="mt-0.5 text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
              {items.length ? `${idx + 1} / ${items.length} • ${currentKind}` : "No files"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!!onDelete && current ? (
              <button
                type="button"
                onClick={() => {
                  if (!current) return;
                  onDelete?.(idx, current);
                }}
                className="rounded-lg border px-3 py-1 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: "var(--color-outline)", color: "var(--color-error)" }}
                aria-label="Delete file"
              >
                Delete
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5" aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div
            className="mx-3 mt-2 rounded-lg border px-3 py-2 text-sm"
            style={{ color: "var(--color-error)", borderColor: "var(--color-error)", backgroundColor: "var(--color-error-container)" }}
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {/* Hero */}
        <div className="relative flex-1 min-h-0 bg-black/5 overflow-hidden">
          {/* Prev / Next */}
          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx <= 0}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 px-2 py-1 text-white disabled:opacity-40"
                aria-label="Previous"
                title="Previous"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setIdx((i) => Math.min(items.length - 1, i + 1))}
                disabled={idx >= items.length - 1}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 px-2 py-1 text-white disabled:opacity-40"
                aria-label="Next"
                title="Next"
              >
                ›
              </button>
            </>
          )}
          {renderHero(current)}
        </div>

        {/* Footer */}
        <div className="space-y-2 border-t px-3 py-2 sm:px-4 sm:py-3" style={{ borderColor: "var(--color-outline-variant)" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 truncate text-sm">{caption}</div>
            {current?.url && (
              <a
                href={current.url}
                download
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border px-3 py-1 text-sm transition-colors hover:bg-black/5 dark:hover:bg:white/5"
                style={{ borderColor: "var(--color-outline)" }}
              >
                Download
              </a>
            )}
          </div>

          {/* Thumbnails */}
          {items.length > 1 && <div className="no-scrollbar flex gap-2 overflow-x-auto pt-1">{items.map((it, i) => renderThumb(it, i === idx, i))}</div>}
        </div>
      </div>
    </div>
  );
}
