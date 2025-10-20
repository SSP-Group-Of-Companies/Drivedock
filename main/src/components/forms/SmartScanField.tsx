"use client";
import { useRef, useState } from "react";
import { preprocessWithJscanify } from "@/lib/imagePreprocess";

type Props = {
  label: string;
  accept?: string;                // default "image/*"
  aspectHint?: number;            // e.g., 1.6 for ID-like documents
  onProcessedFile: (file: File) => Promise<void> | void; // you will upload
  disabled?: boolean;
  busyText?: string;
};

export default function SmartScanField({
  label,
  accept = "image/*",
  aspectHint,
  onProcessedFile,
  disabled,
  busyText = "Processing..."
}: Props) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const processed = await preprocessWithJscanify(f, aspectHint);
      await onProcessedFile(processed);
    } finally {
      setBusy(false);
      e.target.value = ""; // allow re-pick same file
    }
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <button
        type="button"
        className="w-full border-2 border-dashed rounded-xl py-10 text-center text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
        onClick={() => fileRef.current?.click()}
        disabled={disabled || busy}
      >
        {busy ? busyText : "Tap to capture or choose an image"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        capture="environment"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}
