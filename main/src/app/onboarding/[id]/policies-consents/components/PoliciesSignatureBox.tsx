"use client";

import SignatureCanvas from "react-signature-canvas";
import Image from "next/image";
import { RefObject, useEffect, useState } from "react";

type Props = {
  canvasRef: RefObject<SignatureCanvas | null>;
  signaturePreview: string | null;
  onDrawEnd: () => void;
};

export default function PoliciesSignatureBox({ canvasRef, signaturePreview, onDrawEnd }: Props) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Recompute emptiness when preview changes (e.g., cleared externally)
  useEffect(() => {
    // If a preview is shown, we don't need the hint anyway.
    if (signaturePreview) return;
    const empty = canvasRef.current && typeof canvasRef.current.isEmpty === "function" ? canvasRef.current.isEmpty() : true;
    setIsEmpty(empty);
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
        <SignatureCanvas
          ref={canvasRef}
          penColor="black"
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

      {signaturePreview && <Image src={signaturePreview} alt="Signature Preview" fill className="absolute inset-0 z-10 rounded-2xl bg-white p-2 object-contain" />}
    </div>
  );
}
