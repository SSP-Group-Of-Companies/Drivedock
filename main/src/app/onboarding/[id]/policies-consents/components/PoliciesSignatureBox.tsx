"use client";

import SignatureCanvas from "react-signature-canvas";
import Image from "next/image";
import { RefObject } from "react";

type Props = {
    canvasRef: RefObject<SignatureCanvas | null>;
    signaturePreview: string | null;
    onDrawEnd: () => void;
};

export default function PoliciesSignatureBox({
    canvasRef,
    signaturePreview,
    onDrawEnd,
}: Props) {
    return (
        <div className="border-2 border-black w-full max-w-xl h-48 mx-auto rounded-md bg-white relative flex items-center justify-center">
            <SignatureCanvas
                ref={canvasRef}
                penColor="black"
                onEnd={onDrawEnd}
                canvasProps={{
                    width: 600,
                    height: 180,
                    className: "bg-white w-full h-full rounded",
                }}
            />
            {signaturePreview && (
                <Image
                    src={signaturePreview}
                    alt="Signature Preview"
                    fill
                    className="object-contain p-2 absolute inset-0 z-10 bg-white"
                />
            )}
        </div>
    );
}
