"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Camera, Image as ImageIcon } from "lucide-react";

type UploadPickerProps = {
  /** Trigger label shown on the tile/button (fallback if no children) */
  label?: string;
  /** Content for trigger. If provided, replaces default tile UI. */
  children?: React.ReactNode;
  /** Called with the chosen File (or null if user cancels). */
  onPick: (file: File | null) => void | Promise<void>;
  /** Accept types (default images only) */
  accept?: string;
  /** Disable the trigger */
  disabled?: boolean;
  /** optional aria-label for the trigger */
  ariaLabel?: string;

  /** Action sheet button labels */
  cameraText?: string; // default: "Take photo (camera)"
  filesText?: string; // default: "Choose from files"

  /** Tailwind classes for outer container */
  className?: string;
  /** If true, show icon + helper text default tile */
  showDefaultTile?: boolean;
};

export default function UploadPicker({
  label = "Upload photo",
  children,
  onPick,
  accept = "image/*,.heic,.heif",
  disabled,
  ariaLabel,
  cameraText = "Take photo (camera)",
  filesText = "Choose from files",
  className,
  showDefaultTile = true,
}: UploadPickerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const btnId = useId();

  // close on outside click / escape
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

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      {/* Trigger */}
      <button
        id={btnId}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={
          children
            ? "w-full"
            : "cursor-pointer flex flex-col items-center justify-center h-10 px-4 mt-1 w-full text-sm text-gray-600 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 group"
        }
      >
        {children ??
          (showDefaultTile && (
            <>
              <Camera className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              <span className="font-medium text-gray-400 text-xs">{label}</span>
            </>
          ))}
      </button>

      {/* Action sheet */}
      {open && (
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
      {/* 1) Camera-only (iOS will open camera directly) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={accept}
        capture="environment"
        className="hidden"
        onChange={(e) =>
          handleChange(e.currentTarget, e.target.files?.[0] || null)
        }
        // do not register with RHF, we manage via onPick()
      />
      {/* 2) File picker (shows Take Photo / Photo Library / Browse on iOS) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) =>
          handleChange(e.currentTarget, e.target.files?.[0] || null)
        }
      />
    </div>
  );
}
