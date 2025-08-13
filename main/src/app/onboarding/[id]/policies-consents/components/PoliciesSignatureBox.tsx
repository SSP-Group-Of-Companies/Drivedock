"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { RefObject, useEffect, useState, forwardRef, type Ref } from "react";

// 1) Get the instance TYPE of react-signature-canvas without pulling in the value
import type ReactSignatureCanvas from "react-signature-canvas";

// 2) Dynamically import the actual component (client-only)
const RawSigCanvas = dynamic(() => import("react-signature-canvas"), { ssr: false });

// 3) Bridge component to restore proper ref support for TS
const SigCanvas = forwardRef(function SigCanvas(props: any, ref: Ref<ReactSignatureCanvas>) {
  return <RawSigCanvas ref={ref} {...props} />;
});

type Props = {
  canvasRef: RefObject<ReactSignatureCanvas | null>;
  signaturePreview: string | null;
  onDrawEnd: () => void;
};

export default function PoliciesSignatureBox({ canvasRef, signaturePreview, onDrawEnd }: Props) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Keep hint state in sync + clear canvas whenever a preview is shown
  useEffect(() => {
    const sig = canvasRef.current;
    if (!sig) return;

    if (signaturePreview) {
      try {
        sig.clear();
      } catch {
        /* no-op */
      }
      setIsEmpty(true);
    } else {
      setIsEmpty(typeof sig.isEmpty === "function" ? sig.isEmpty() : true);
    }
  }, [signaturePreview, canvasRef]);

  const showHint = !isDrawing && !signaturePreview && isEmpty;

  return (
    <div
      className={`relative mx-auto flex h-48 w-full max-w-xl items-center justify-center
        rounded-2xl bg-white/80 shadow-sm backdrop-blur
        ${isDrawing ? "border-2 border-blue-400/50 ring-2 ring-blue-500/20" : "border border-slate-300/70 ring-1 ring-black/5"}`}
    >
      {showHint && <span className="pointer-events-none absolute z-10 text-sm text-slate-400">Sign inside the box</span>}

      {!signaturePreview && (
        <SigCanvas
          // ref now types correctly because of the forwardRef bridge
          ref={canvasRef}
          penColor="black"
          backgroundColor="#ffffff" // avoid transparent bleed-through
          onBegin={() => {
            setIsDrawing(true);
            setIsEmpty(false);
          }}
          onEnd={() => {
            setIsDrawing(false);
            setIsEmpty(canvasRef.current?.isEmpty?.() ?? true);
            onDrawEnd();
          }}
          canvasProps={{
            width: 600,
            height: 180,
            className: "bg-transparent w-full h-full rounded-2xl [touch-action:none]",
          }}
        />
      )}

      {signaturePreview && <Image src={signaturePreview} alt="Signature Preview" fill className="absolute inset-0 z-10 rounded-2xl bg-white p-2 object-contain" sizes="" draggable={false} />}
    </div>
  );
}
