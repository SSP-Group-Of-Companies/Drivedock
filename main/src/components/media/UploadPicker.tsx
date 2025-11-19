"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Image as ImageIcon } from "lucide-react";

type UploadPickerProps = {
  /** Trigger label shown on the tile/button (fallback if no children) */
  label?: string;
  /** Content for trigger. If provided, replaces default tile UI. */
  children?: React.ReactNode;
  /** Called with the chosen File (or null if user cancels). */
  onPick: (file: File | null) => void | Promise<void>;
  /** Accept types (default depends on mode) */
  accept?: string;
  /** Disable the trigger */
  disabled?: boolean;
  /** optional aria-label for the trigger */
  ariaLabel?: string;

  /** Action sheet button labels (image mode only) */
  cameraText?: string; // default: "Take photo (camera)"
  filesText?: string; // default: "Choose from files"

  /** Tailwind classes for outer container */
  className?: string;
  /** If true, show icon + helper text default tile */
  showDefaultTile?: boolean;

  /** "image" keeps current behaviour; "pdf" disables camera + uses file-only flow. */
  mode?: "image" | "pdf";
  /** Show PDF guidance popup before opening file picker (only in pdf mode). */
  showPdfGuidance?: boolean;
};

const PDF_GUIDANCE_STORAGE_KEY = "drivedock_pdf_guidance_disabled";

export default function UploadPicker({
  label = "Upload photo",
  children,
  onPick,
  accept,
  disabled,
  ariaLabel,
  cameraText = "Take photo (camera)",
  filesText = "Choose from files",
  className,
  showDefaultTile = true,
  mode = "image",
  showPdfGuidance = false,
}: UploadPickerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false); // image-mode action sheet
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const menuId = useId();
  const btnId = useId();

  const isPdfMode = mode === "pdf";

  // Effective accept attribute (default differs by mode if caller doesn't override)
  const effectiveAccept =
    accept ?? (isPdfMode ? "application/pdf" : "image/*,.heic,.heif");

  // close on outside click / escape (for the image-mode action sheet only)
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  async function handleChange(input: HTMLInputElement, file: File | null) {
    try {
      await onPick(file);
    } finally {
      // allow picking the same file again
      input.value = "";
    }
  }

  function shouldShowPdfGuidance(): boolean {
    if (!isPdfMode || !showPdfGuidance) return false;
    try {
      const stored = window.localStorage.getItem(PDF_GUIDANCE_STORAGE_KEY);
      // If user disabled it earlier, don't show again
      if (stored === "1") return false;
    } catch {
      // if localStorage fails, fall back to showing once
    }
    return true;
  }

  function handleTriggerClick() {
    if (disabled) return;

    if (isPdfMode) {
      // PDF flow: guidance modal (if enabled), then direct file picker
      if (shouldShowPdfGuidance()) {
        setPdfModalOpen(true);
      } else {
        fileInputRef.current?.click();
      }
      return;
    }

    // Image mode: open/close the action sheet
    setOpen((v) => !v);
  }

  function handlePdfModalContinue(dontShowAgain: boolean) {
    if (dontShowAgain) {
      try {
        window.localStorage.setItem(PDF_GUIDANCE_STORAGE_KEY, "1");
      } catch {
        // ignore
      }
    }
    setPdfModalOpen(false);
    // After acknowledgement, open file picker
    fileInputRef.current?.click();
  }

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      {/* Trigger */}
      <button
        id={btnId}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-haspopup={!isPdfMode ? "menu" : undefined}
        aria-expanded={!isPdfMode ? open : undefined}
        aria-controls={!isPdfMode ? menuId : undefined}
        onClick={handleTriggerClick}
        className={
          children
            ? "w-full"
            : "cursor-pointer flex flex-col items-center justify-center h-10 px-4 mt-1 w-full text-sm text-gray-600 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 group"
        }
      >
        {children ??
          (showDefaultTile && (
            <>
              {/* Icon can stay the same; label text we can change at call sites */}
              <Camera className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              <span className="font-medium text-gray-400 text-xs">{label}</span>
            </>
          ))}
      </button>

      {/* Image-mode action sheet (camera + files). Not used in pdf mode. */}
      {!isPdfMode && open && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={btnId}
          className="absolute top-full left-0 mt-2 rounded-xl border border-gray-200 bg-white shadow-md overflow-hidden w-full min-w-[200px] max-w-xs z-50 ring-1 ring-gray-200"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              cameraInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left text-sm font-medium text-gray-800 transition-colors focus:outline-none focus:bg-blue-50 whitespace-nowrap"
          >
            <Camera className="w-4 h-4 text-blue-600" />
            {cameraText}
          </button>
          <div className="border-t border-gray-200" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              fileInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left text-sm font-medium text-gray-800 transition-colors focus:outline-none focus:bg-blue-50 whitespace-nowrap"
          >
            <ImageIcon className="w-4 h-4 text-blue-600" />
            {filesText}
          </button>
        </div>
      )}

      {/* Hidden inputs */}
      {/* 1) Camera-only (iOS will open camera directly) — only when in image mode */}
      {!isPdfMode && (
        <input
          ref={cameraInputRef}
          type="file"
          accept={effectiveAccept}
          capture="environment"
          className="hidden"
          onChange={(e) =>
            handleChange(e.currentTarget, e.target.files?.[0] || null)
          }
        />
      )}
      {/* 2) File picker (shows Take Photo / Photo Library / Browse on iOS in image mode; file browser in pdf mode) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={effectiveAccept}
        className="hidden"
        onChange={(e) =>
          handleChange(e.currentTarget, e.target.files?.[0] || null)
        }
      />

      {/* PDF guidance modal */}
      {isPdfMode && showPdfGuidance && pdfModalOpen && (
        <PdfGuidanceModal
          onClose={() => setPdfModalOpen(false)}
          onContinue={handlePdfModalContinue}
        />
      )}
    </div>
  );
}

type PdfGuidanceModalProps = {
  onClose: () => void;
  onContinue: (dontShowAgain: boolean) => void;
};

function PdfGuidanceModal({ onClose, onContinue }: PdfGuidanceModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const titleId = useId();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby={titleId}
    >
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">
          Use a clear PDF scan
        </h2>

        <p className="mt-3 text-sm text-gray-700 leading-5">
          For security checks and document processing, we can only accept{" "}
          <span className="font-semibold">PDF files</span> with clear, readable
          scans. Please avoid photos with glare, shadows, or background clutter.
        </p>

        <p className="mt-3 text-sm text-gray-700 leading-5">
          You&apos;ll see this reminder when uploading documents on other file
          fields as well. You can turn it off below if you don&apos;t need to be
          reminded again.
        </p>

        <div className="mt-4 space-y-2 text-sm text-gray-700">
          <p className="font-medium">
            You can use any phone scanner app, for example:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Apple Notes → Scan Document (iPhone)</li>
            <li>CamScanner (recommended)</li>
            <li>
              Your phone&apos;s built-in &quot;Scan&quot; option in Files or
              Camera
            </li>
          </ul>
        </div>

        {/* Store Badges Row */}
        <div className="flex items-center justify-center gap-4 mt-4">
          {/* App Store */}
          <a
            href="https://apps.apple.com/ca/app/camscanner-pdf-scanner-app/id388627783"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center"
          >
            <div className="h-12 sm:h-14 w-auto flex items-center">
              <Image
                src="/assets/logos/Applestore.png"
                alt="Download on the App Store"
                className="h-full w-auto hover:opacity-90 transition"
                width={0}
                height={0}
                sizes="100vw"
              />
            </div>
          </a>

          {/* Google Play */}
          <a
            href="https://play.google.com/store/apps/details?id=com.intsig.camscanner"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center"
          >
            <div className="h-12 sm:h-14 w-auto flex items-center">
              <Image
                src="/assets/logos/Playstore.png"
                alt="Get it on Google Play"
                className="h-full w-auto hover:opacity-90 transition"
                width={0}
                height={0}
                sizes="100vw"
              />
            </div>
          </a>
        </div>

        <label className="mt-4 flex items-center gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            className="rounded border-gray-300"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          Don&apos;t show this reminder again on this device.
        </label>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onContinue(dontShowAgain)}
            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Continue to upload PDF
          </button>
        </div>
      </div>
    </div>
  );
}
