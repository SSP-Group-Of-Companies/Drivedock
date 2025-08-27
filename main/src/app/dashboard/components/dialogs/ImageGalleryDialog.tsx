"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type GalleryItem = {
  url: string; // absolute or same-origin URL to display
  name?: string; // optional filename/caption
  alt?: string; // optional alt text (defaults to name or "Image")
  uploadedAt?: string; // optional ISO to show under the image
};

type Props = Readonly<{
  open: boolean;
  items: GalleryItem[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;

  /** Optional: if provided, a "Delete" button appears and calls this with (index, item) */
  onDelete?: (index: number, item: GalleryItem) => void;
}>;

/**
 * Small, dependency-free modal gallery.
 * - ESC to close
 * - ← / → to navigate
 * - Click (X) or backdrop to close
 * - Focus lands on dialog when opened; background scroll disabled
 */
export default function ImageGalleryDialog({
  open,
  items,
  initialIndex = 0,
  title = "Documents",
  onClose,
  onDelete,
}: Props) {
  const [idx, setIdx] = useState(initialIndex);
  const labelId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Keep idx in range when items change
  useEffect(() => {
    setIdx((i) =>
      items.length ? Math.min(Math.max(0, i), items.length - 1) : 0
    );
  }, [items]);

  // Body scroll lock while open
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  // Basic keyboard support
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight")
        setIdx((i) => Math.min(items.length - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items.length, onClose]);

  // Move focus into the dialog when it opens
  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  const current = items[idx];
  const caption = useMemo(() => {
    const parts = [
      current?.name?.trim(),
      current?.uploadedAt
        ? new Date(current.uploadedAt).toLocaleString()
        : undefined,
    ].filter(Boolean);
    return parts.join(" • ");
  }, [current]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-10 flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-xl outline-none"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-outline)",
          boxShadow: "var(--elevation-3)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--color-outline-variant)" }}
        >
          <div className="min-w-0">
            <h2 id={labelId} className="truncate text-base font-semibold">
              {title}
            </h2>
            <div
              className="mt-0.5 text-xs"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              {items.length ? `${idx + 1} / ${items.length}` : "No images"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!!onDelete && current ? (
              <button
                type="button"
                onClick={() => {
                  if (!current) return;
                  onDelete?.(idx, current); // ← call directly, no confirm
                  // parent updates `items`; our idx is clamped by the effect watching `items`
                }}
                className="rounded-lg border px-3 py-1 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{
                  borderColor: "var(--color-outline)",
                  color: "var(--color-error)",
                }}
                aria-label="Delete image"
              >
                Delete
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Hero image */}
        <div className="relative flex-1 bg-black/5">
          {current ? (
            <>
              {/* Prev / Next */}
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

              <div className="flex h-full items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.url}
                  alt={current.alt || current.name || "Image"}
                  className="max-h-full max-w-full object-contain"
                  draggable={false}
                />
              </div>
            </>
          ) : (
            <div
              className="flex h-full items-center justify-center text-sm"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              No image selected
            </div>
          )}
        </div>

        {/* Footer: caption + actions + thumbs */}
        <div
          className="space-y-2 border-t px-3 py-2 sm:px-4 sm:py-3"
          style={{ borderColor: "var(--color-outline-variant)" }}
        >
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
          {items.length > 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto pt-1">
              {items.map((it, i) => (
                <button
                  key={`${it.url}-${i}`}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border ${
                    i === idx ? "ring-2 ring-[var(--color-primary)]" : ""
                  }`}
                  style={{ borderColor: "var(--color-outline-variant)" }}
                  title={it.name || `Image ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={it.url}
                    alt={it.alt || it.name || `Image ${i + 1}`}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
