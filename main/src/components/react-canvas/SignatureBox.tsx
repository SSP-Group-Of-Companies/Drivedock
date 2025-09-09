// src/components/react-canvas/SignatureBox.tsx
"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState, forwardRef, type Ref, useImperativeHandle, useRef, memo, useCallback } from "react";
import type ReactSignatureCanvas from "react-signature-canvas";

import { ES3Folder } from "@/types/aws.types";
import { UploadResult, uploadToS3Presigned } from "@/lib/utils/s3Upload";
import { getBlobFromCanvas } from "@/lib/frontendUtils/reactCanvasUtils";
import clsx from "clsx";

const RawSigCanvas = dynamic(() => import("react-signature-canvas"), { ssr: false });
const SigCanvas = forwardRef(function SigCanvas(props: any, ref: Ref<ReactSignatureCanvas>) {
  return <RawSigCanvas ref={ref} {...props} />;
});

export type SignatureBoxHandle = {
  getSignature: () => UploadResult | undefined;
  ensureUploaded: () => Promise<UploadResult | undefined>;
  clear: () => Promise<void>;
  isDirty: () => boolean;
  hasSignature: () => boolean;
};

type Props = {
  trackerId: string;
  initialSignature?: UploadResult | null;
  s3Folder: ES3Folder;
  className?: string;
  labels?: Partial<{
    hint: string;
    upload: string;
    clear: string;
    uploading: string;
    deleting: string;
    uploadSuccess: string;
    uploadFailedGeneric: string;
    mustSignOrUpload: string;
  }>;
  onDirtyChange?: (dirty: boolean) => void;
  disabled?: boolean;
  errorMsg?: string;
  onUploaded?: (result: UploadResult) => void;
  onCleared?: () => void;
  onError?: (message: string) => void;
  onDrawStateChange?: (state: { isDrawing: boolean; hasUnuploadedDrawing: boolean }) => void;
};

function usePrevious<T>(value: T) {
  const ref = useRef<T>(value);
  useEffect(() => void (ref.current = value), [value]);
  return ref.current;
}

export default memo(
  forwardRef<SignatureBoxHandle, Props>(function SignatureBox(
    { trackerId, initialSignature, className, labels, onDirtyChange, s3Folder, disabled = false, errorMsg, onUploaded, onCleared, onError, onDrawStateChange }: Props,
    ref
  ) {
    const L = {
      hint: "Sign inside the box",
      upload: "Upload",
      clear: "Clear",
      uploading: "Uploading...",
      deleting: "Deleting...",
      uploadSuccess: "Upload successful",
      uploadFailedGeneric: "Failed to process or upload your signature. Please try again.",
      mustSignOrUpload: "Please draw or upload a signature before continuing.",
      ...(labels || {}),
    };

    const isLocked = !!disabled;

    const canvasRef = useRef<ReactSignatureCanvas | null>(null);

    const [sigData, setSigData] = useState<UploadResult | undefined>(initialSignature ?? undefined);
    const [preview, setPreview] = useState<string | null>(initialSignature?.url ?? null);

    const [isDrawing, setIsDrawing] = useState(false);
    const drawingRef = useRef(false); // guard against resize during stroke
    const [isEmpty, setIsEmpty] = useState(true);
    const [drawnDirty, setDrawnDirty] = useState(false);

    const [status, setStatus] = useState<"idle" | "uploading" | "deleting" | "error">("idle");
    const [message, setMessage] = useState<string>("");

    const [suppressExternalError, setSuppressExternalError] = useState(false);
    useEffect(() => {
      if (errorMsg) setSuppressExternalError(false);
    }, [errorMsg]);

    const statusRef = useRef<typeof status>(status);
    useEffect(() => {
      statusRef.current = status;
    }, [status]);

    const initialKeyRef = useRef<string | null>(initialSignature?.s3Key ?? null);

    const dirty = drawnDirty || (!!sigData?.s3Key && sigData.s3Key !== initialKeyRef.current) || (!!initialKeyRef.current && !sigData?.s3Key && !preview && isEmpty);

    const prevDirty = usePrevious(dirty);
    useEffect(() => {
      if (prevDirty !== dirty) onDirtyChange?.(dirty);
    }, [dirty, prevDirty, onDirtyChange]);

    const notifyDrawState = useCallback(
      (drawing: boolean, hasUnuploaded: boolean) => {
        onDrawStateChange?.({ isDrawing: drawing, hasUnuploadedDrawing: hasUnuploaded });
      },
      [onDrawStateChange]
    );

    async function deleteIfTemp(s3Key?: string) {
      if (!s3Key || !s3Key.startsWith("temp-files/")) return;
      await fetch("/api/v1/delete-temp-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: [s3Key] }),
      });
    }

    const performUploadFromFile = async (file: File) => {
      const previousKey = sigData?.s3Key;
      try {
        setStatus("uploading");
        setMessage("");
        const result = await uploadToS3Presigned({ file, folder: s3Folder, trackerId });

        const reader = new FileReader();
        reader.onload = (e) => setPreview((e.target?.result as string) ?? null);
        reader.readAsDataURL(file);

        setSigData(result);
        setDrawnDirty(false);
        setStatus("idle");
        setMessage(L.uploadSuccess);

        try {
          await deleteIfTemp(previousKey);
        } catch (cleanupErr) {
          console.warn("Failed to delete previous temp signature:", cleanupErr);
        }

        try {
          canvasRef.current?.clear();
        } catch {}
        setIsEmpty(true);

        onUploaded?.(result);
        notifyDrawState(false, false);
      } catch (err: any) {
        console.error("Signature upload failed", err);
        setStatus("error");
        const msg = err?.message || L.uploadFailedGeneric;
        setMessage(msg);
        onError?.(msg);
      }
    };

    const openFilePicker = () => {
      if (isLocked || status === "uploading" || status === "deleting") return;

      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        const s = statusRef.current;

        if (!file || isLocked || s === "uploading" || s === "deleting") return;

        setSuppressExternalError(true);
        await performUploadFromFile(file);
      };

      input.click();
    };

    const clearAll = useCallback(async () => {
      if (isLocked || status === "uploading" || status === "deleting") return;

      setSuppressExternalError(true);
      setStatus("deleting");
      setMessage("");

      const currentKey = sigData?.s3Key;

      try {
        if (currentKey?.startsWith("temp-files/")) {
          await fetch("/api/v1/delete-temp-files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keys: [currentKey] }),
          });
        }
      } catch (err: any) {
        console.error("Failed to delete temp file", err);
        setStatus("error");
        const msg = err?.message || "Delete failed";
        setMessage(msg);
        onError?.(msg);
        return;
      }

      setPreview(null);
      setSigData(undefined);
      setDrawnDirty(false);
      try {
        canvasRef.current?.clear();
      } catch {}
      setIsEmpty(true);
      setStatus("idle");
      setMessage("");

      onCleared?.();
      notifyDrawState(false, false);
    }, [sigData, status, isLocked, onCleared, onError, notifyDrawState]);

    const uploadCanvasIfNeeded = useCallback(async (): Promise<UploadResult | undefined> => {
      const sig = canvasRef.current;
      if (!sig || typeof sig.isEmpty !== "function") return undefined;

      if (sig.isEmpty()) {
        setStatus("error");
        setMessage(L.mustSignOrUpload);
        onError?.(L.mustSignOrUpload);
        return undefined;
      }

      try {
        setStatus("uploading");
        setMessage("");
        const blob = await getBlobFromCanvas(sig);
        const file = new File([blob], "signature.png", { type: "image/png" });

        const previousKey = sigData?.s3Key;
        const result = await uploadToS3Presigned({ file, folder: s3Folder, trackerId });

        setSigData(result);
        setDrawnDirty(false);

        const reader = new FileReader();
        reader.onload = (e) => setPreview((e.target?.result as string) ?? null);
        reader.readAsDataURL(file);

        setSuppressExternalError(true);

        setStatus("idle");
        setMessage(L.uploadSuccess);

        try {
          await deleteIfTemp(previousKey);
        } catch (cleanupErr) {
          console.warn("Failed to delete previous temp signature:", cleanupErr);
        }

        onUploaded?.(result);
        notifyDrawState(false, false);
        return result;
      } catch (err: any) {
        console.error("Signature upload failed", err);
        setStatus("error");
        const msg = err?.message || L.uploadFailedGeneric;
        setMessage(msg);
        onError?.(msg);
        return undefined;
      }
    }, [L.mustSignOrUpload, L.uploadFailedGeneric, L.uploadSuccess, sigData, trackerId, s3Folder, onUploaded, onError, notifyDrawState]);

    const ensureUploaded = useCallback(async (): Promise<UploadResult | undefined> => {
      if (isLocked) return sigData;

      if (drawnDirty) {
        return await uploadCanvasIfNeeded();
      }

      if (!sigData?.s3Key || !sigData?.url) {
        setStatus("error");
        setMessage(L.mustSignOrUpload);
        onError?.(L.mustSignOrUpload);
        return undefined;
      }

      return sigData;
    }, [isLocked, sigData, drawnDirty, uploadCanvasIfNeeded, L.mustSignOrUpload, onError]);

    useEffect(() => {
      const sig = canvasRef.current;
      if (!sig) return;

      if (preview) {
        try {
          sig.clear();
        } catch {}
        setIsEmpty(true);
      } else {
        setIsEmpty(typeof sig.isEmpty === "function" ? sig.isEmpty() : true);
      }
    }, [preview]);

    // ─────────────────────────────────────────────────────────────────────
    // Canvas sizing (no disappearing strokes)
    // ─────────────────────────────────────────────────────────────────────
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
    const lastDataUrlRef = useRef<string | null>(null);

    useEffect(() => {
      const el = wrapperRef.current;
      if (!el) return;

      const measure = () => {
        // Avoid re-measuring during a stroke (pointer math is stable)
        if (drawingRef.current) return;

        const w = Math.max(1, Math.round(el.clientWidth));
        const h = Math.max(1, Math.round(el.clientHeight));

        // Ignore micro-deltas (from subpixel/layout jitter)
        const dx = Math.abs(w - canvasSize.width);
        const dy = Math.abs(h - canvasSize.height);
        if (dx < 2 && dy < 2) return;

        // Snapshot existing drawing so we can restore after resize
        const sig = canvasRef.current;
        if (sig && !sig.isEmpty()) {
          try {
            lastDataUrlRef.current = sig.toDataURL();
          } catch {}
        } else {
          lastDataUrlRef.current = null;
        }

        setCanvasSize({ width: w, height: h });
      };

      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      window.addEventListener("orientationchange", measure);
      window.addEventListener("resize", measure);
      return () => {
        ro.disconnect();
        window.removeEventListener("orientationchange", measure);
        window.removeEventListener("resize", measure);
      };
    }, [canvasSize.width, canvasSize.height]);

    // After canvas size changes, restore strokes if we saved a snapshot
    useEffect(() => {
      if (!lastDataUrlRef.current) return;
      const sig = canvasRef.current;
      if (!sig) return;
      try {
        sig.fromDataURL(lastDataUrlRef.current);
      } catch {}
      lastDataUrlRef.current = null;
    }, [canvasSize]);

    const showHint = !isDrawing && !preview && isEmpty;

    const hasInternalError = status === "error" && !!message;
    const externalErrorToShow = !suppressExternalError ? errorMsg || "" : "";
    const displayError = hasInternalError ? message : externalErrorToShow;
    const showErrorOutline = hasInternalError || !!externalErrorToShow;

    useImperativeHandle(
      ref,
      (): SignatureBoxHandle => ({
        getSignature: () => sigData,
        ensureUploaded,
        clear: clearAll,
        isDirty: () => dirty,
        hasSignature: () => !!preview || !isEmpty,
      }),
      [sigData, ensureUploaded, clearAll, dirty, preview, isEmpty]
    );

    return (
      <div className={clsx("space-y-3", className)}>
        <div
          className={clsx(
            "relative mx-auto flex h-48 w-full max-w-xl items-center justify-center",
            "rounded-2xl bg-white/80 shadow-sm backdrop-blur",
            // keep border width constant to avoid size changes
            "border ring-1 ring-black/5",
            showErrorOutline
              ? "ring-2 ring-red-300 border-red-500"
              : isLocked
              ? "opacity-90"
              : isDrawing
              ? "ring-2 ring-blue-500/30" // visual emphasis without layout shift
              : ""
          )}
          aria-disabled={isLocked}
        >
          {showHint && <span className="pointer-events-none absolute z-10 text-sm text-slate-400">{L.hint}</span>}

          {!preview && (
            <div ref={wrapperRef} className={clsx("relative h-full w-full", isLocked && "pointer-events-none")}>
              <SigCanvas
                ref={canvasRef}
                penColor="black"
                backgroundColor="#ffffff"
                onBegin={() => {
                  if (isLocked) return;
                  drawingRef.current = true;
                  setSuppressExternalError(true);
                  setIsDrawing(true);
                  setIsEmpty(false);
                  setDrawnDirty(true);
                  notifyDrawState(true, true);
                }}
                onEnd={() => {
                  if (isLocked) return;
                  drawingRef.current = false;
                  setIsDrawing(false);
                  setIsEmpty(canvasRef.current?.isEmpty?.() ?? true);
                  notifyDrawState(false, true);
                  // in case a resize was coalesced at stroke end,
                  // force one measurement now (without border width changes)
                  const el = wrapperRef.current;
                  if (el) {
                    const w = Math.max(1, Math.round(el.clientWidth));
                    const h = Math.max(1, Math.round(el.clientHeight));
                    if (Math.abs(w - canvasSize.width) >= 2 || Math.abs(h - canvasSize.height) >= 2) {
                      const sig = canvasRef.current;
                      if (sig && !sig.isEmpty()) {
                        try {
                          lastDataUrlRef.current = sig.toDataURL();
                        } catch {}
                      }
                      setCanvasSize({ width: w, height: h });
                    }
                  }
                }}
                canvasProps={{
                  width: Math.max(1, canvasSize.width),
                  height: Math.max(1, canvasSize.height),
                  className: "bg-transparent w-full h-full block rounded-2xl [touch-action:none]",
                }}
              />

              {isLocked && <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/40 backdrop-blur-[1px]" aria-hidden="true" />}
            </div>
          )}

          {preview && <Image src={preview} alt="Signature Preview" fill className="absolute inset-0 z-10 rounded-2xl bg-white p-2 object-contain" sizes="" draggable={false} />}
        </div>

        {!!displayError && <p className={clsx("text-sm text-center", hasInternalError ? "text-red-600" : "text-red-500")}>{displayError}</p>}

        {!isLocked && (
          <div className="mx-auto flex w-full max-w-xl items-center justify-center gap-3">
            <button
              type="button"
              onClick={openFilePicker}
              className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-slate-300 hover:bg-slate-50"
              disabled={status === "uploading" || status === "deleting"}
            >
              {L.upload}
            </button>
            <button
              type="button"
              onClick={() => void clearAll()}
              className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-slate-300 hover:bg-slate-50"
              disabled={status === "uploading" || status === "deleting"}
            >
              {L.clear}
            </button>
          </div>
        )}

        {(status === "uploading" || status === "deleting") && (
          <p className="text-yellow-600 text-sm text-center flex items-center justify-center gap-2">
            <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></span>
            {status === "uploading" ? L.uploading : L.deleting}
          </p>
        )}

        {status === "idle" && !!message && <p className="text-green-600 text-sm text-center">{message}</p>}
      </div>
    );
  })
);
