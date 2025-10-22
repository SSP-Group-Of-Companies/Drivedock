"use client";

import { memo, useMemo, useRef, useEffect } from "react";
import { Clipboard, Check } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

type Props = {
  value: unknown;
  label?: string;       // e.g., "First name"
  className?: string;
  disabled?: boolean;   // opt-out per field
};

function toStringSafe(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try { return String(v); } catch { return ""; }
}

function FieldCopyAdornmentComponent({
  value,
  label = "Field",
  className,
  disabled = false
}: Props) {
  const { copied, copy } = useCopyToClipboard();
  const text = useMemo(() => toStringSafe(value), [value]);

  // SR-only live region announcement
  const liveRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (copied && liveRef.current) {
      liveRef.current.textContent = `${label} copied to clipboard.`;
      const t = window.setTimeout(() => {
        if (liveRef.current) liveRef.current.textContent = "";
      }, 1200);
      return () => window.clearTimeout(t);
    }
  }, [copied, label]);

  if (disabled || text.length === 0) return null;

  const handleCopy = async () => {
    await copy(text);
  };

  return (
    <div
      className={[
        "absolute right-2 top-1/2 -translate-y-1/2 transition-opacity pointer-events-auto",
        "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
        className ?? ""
      ].join(" ")}
    >
      {/* live region for screen readers */}
      <span ref={liveRef} aria-live="polite" className="sr-only" />

      <div className="relative">
        <button
          type="button"
          aria-label={`Copy ${label}`}
          className="h-8 w-8 rounded-xl shadow-sm flex items-center justify-center transition-colors focus:outline-none"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-outline)",
            color: "var(--color-on-surface-variant)",
          }}
          onClick={handleCopy}
        >
          {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
        </button>
        
        {/* Custom tooltip implementation - matches existing codebase patterns */}
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded-md whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            backgroundColor: "var(--color-surface-container-highest)",
            color: "var(--color-on-surface)",
            border: "none",
          }}
        >
          Copy
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
            style={{
              borderTopColor: "var(--color-surface-container-highest)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export const FieldCopyAdornment = memo(FieldCopyAdornmentComponent);
export default FieldCopyAdornmentComponent;
