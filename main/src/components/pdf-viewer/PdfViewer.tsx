"use client";

import { useEffect, useRef, useState } from "react";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import { AlertCircle } from "lucide-react";
import "@react-pdf-viewer/core/lib/styles/index.css";

export type LoadStrategy = "fetch" | "direct" | "auto";

type Props = {
  pdfUrl: string;
  /** How to load the PDF:
   * - "fetch": prefetch as Blob (best for API routes, catches JSON errors nicely)
   * - "direct": pass URL to viewer directly (best for static/public files)
   * - "auto": currently behaves like "fetch" (safe default)
   */
  strategy?: LoadStrategy;
  /** Ensures the viewer area has space to show the loader on first paint */
  minHeight?: string | number; // e.g. "60svh" | 400
};

export default function PdfViewer({ pdfUrl, strategy = "auto", minHeight = "60svh" }: Props) {
  const resolvedStrategy: LoadStrategy = strategy === "auto" ? "fetch" : strategy;

  const zoomPluginInstance = zoomPlugin();
  const { ZoomInButton, ZoomOutButton } = zoomPluginInstance;

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<{ status?: number; message: string; details?: string } | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">(resolvedStrategy === "fetch" ? "loading" : "ready");
  const [showDetails, setShowDetails] = useState(false);

  const lastObjectUrlRef = useRef<string | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const resetState = () => {
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }
    setBlobUrl(null);
    setError(null);
    setPhase(resolvedStrategy === "fetch" ? "loading" : "ready");
    setShowDetails(false);
  };

  async function fetchPdf(signal?: AbortSignal) {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch(pdfUrl, {
        method: "GET",
        headers: { Accept: "application/pdf" },
        signal,
        cache: "no-store",
      });

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        let serverMsg = "";
        try {
          if (contentType.includes("application/json")) {
            const j = await res.json();
            serverMsg = j?.message || j?.error || (typeof j === "string" ? j : JSON.stringify(j));
          } else {
            serverMsg = await res.text();
          }
        } catch {}
        setError({
          status: res.status,
          message: "We couldn’t show this document yet.",
          details: (serverMsg || "").slice(0, 2000),
        });
        setPhase("error");
        return;
      }

      if (!contentType.includes("application/pdf")) {
        let preview = "";
        try {
          preview = await res.text();
        } catch {}
        setError({
          status: res.status,
          message: "We couldn’t show this document yet.",
          details: (preview || "").slice(0, 2000),
        });
        setPhase("error");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = url;
      setBlobUrl(url);
      setPhase("ready");
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError({
          message: "We couldn’t show this document yet.",
          details: e?.message || String(e),
        });
        setPhase("error");
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    resetState();

    if (resolvedStrategy === "fetch") {
      // Defer network start to the next frame so the loader paints first.
      rafIdRef.current = window.requestAnimationFrame(() => {
        fetchPdf(controller.signal);
      });
    }

    return () => {
      controller.abort();
      if (rafIdRef.current != null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl, resolvedStrategy]);

  const isLoading = phase === "loading";
  const hasError = phase === "error";
  const readyWithPdf = phase === "ready" && (resolvedStrategy === "fetch" ? !!blobUrl : true);
  const fileForViewer = resolvedStrategy === "fetch" ? blobUrl ?? "" : pdfUrl;

  const Toolbar = () =>
    readyWithPdf ? (
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-2 rounded bg-white shadow px-2 py-1">
        <ZoomOutButton />
        <ZoomInButton />
      </div>
    ) : null;

  const FriendlyError = ({ status, message, details }: { status?: number; message: string; details?: string }) => (
    <div
      className="w-full max-w-2xl rounded-lg overflow-hidden"
      style={{
        background: "var(--color-surface-variant)",
        border: "1px solid var(--color-outline)",
        boxShadow: "var(--elevation-1)",
      }}
    >
      <div className="flex gap-3 p-4 items-start">
        <div className="shrink-0 rounded" style={{ width: 4, height: "1.75rem", background: "var(--color-error)" }} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1" style={{ color: "var(--color-on-surface)" }}>
            <AlertCircle className="h-4 w-4" aria-hidden />
            <span className="font-medium">{message}</span>
          </div>
          <p className="text-sm mb-3" style={{ color: "var(--color-on-surface-variant)" }}>
            It might not be ready yet or you may not have access. You can try again, or open the original link in a new tab.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => (resolvedStrategy === "fetch" ? fetchPdf() : window.location.reload())}
              className="px-3 py-1.5 rounded text-sm transition"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-outline)", color: "var(--color-on-surface)" }}
            >
              Retry
            </button>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded text-sm transition"
              style={{ background: "var(--color-primary)", color: "var(--color-on-primary)", border: "1px solid transparent" }}
            >
              Open raw URL
            </a>
            {(status || details) && (
              <button
                type="button"
                onClick={() => setShowDetails((s) => !s)}
                className="ml-auto px-2 py-1 rounded text-xs"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-outline)", color: "var(--color-on-surface-variant)" }}
              >
                {showDetails ? "Hide details" : "Show details"}
              </button>
            )}
          </div>
          {showDetails && (
            <div className="mt-3 space-y-1">
              {typeof status === "number" && (
                <div className="text-xs" style={{ color: "var(--color-on-surface-variant)" }}>
                  Status: {status}
                </div>
              )}
              {details && (
                <pre
                  className="text-xs whitespace-pre-wrap break-words rounded p-2 max-h-52 overflow-auto"
                  style={{ background: "var(--color-card)", color: "var(--color-on-surface-variant)", border: "1px solid var(--color-outline)" }}
                >
                  {details}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden" style={{ minHeight }} onContextMenu={(e) => e.preventDefault()}>
      <Toolbar />

      {/* Always paint the loader while phase === 'loading' */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3" role="status" aria-busy="true" aria-live="polite">
            <div
              className="h-8 w-8 rounded-full animate-spin"
              style={{
                borderWidth: 3,
                borderStyle: "solid",
                borderColor: "var(--color-outline)",
                borderTopColor: "var(--color-primary)",
              }}
            />
            <div className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
              Preparing document…
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .rpv-core__viewer {
          padding: 0 !important;
          height: 100% !important;
        }
        .rpv-core__page-layer {
          margin: 0 auto !important;
        }
        .rpv-core__inner-pages {
          padding-top: 0 !important;
          height: 100% !important;
        }
      `}</style>

      {/* Error (centered) */}
      {!isLoading && hasError && (
        <div className="flex-1 min-h-0 flex items-center justify-center p-4">
          <FriendlyError status={error?.status} message={error?.message || "We couldn’t show this document yet."} details={error?.details} />
        </div>
      )}

      {/* Scrollable PDF */}
      {!isLoading && !hasError && fileForViewer && (
        <div className="flex-1 min-h-0 overflow-auto">
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <Viewer
              fileUrl={fileForViewer}
              theme="white"
              plugins={[zoomPluginInstance]}
              renderError={(err) => (
                <div className="flex-1 min-h-0 flex items-center justify-center p-4">
                  <FriendlyError message="We couldn’t show this document yet." details={typeof err === "string" ? err : err?.message || JSON.stringify(err)} />
                </div>
              )}
            />
          </Worker>
        </div>
      )}
    </div>
  );
}
