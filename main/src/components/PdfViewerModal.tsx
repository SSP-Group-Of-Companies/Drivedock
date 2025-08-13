"use client";

import dynamic from "next/dynamic";

const PdfViewerInner = dynamic(() => import("./pdf-viewer/PdfViewerInner"), {
  ssr: false,
});

type Props = { pdfUrl: string };

export default function PdfViewerModal({ pdfUrl }: Props) {
  return <PdfViewerInner pdfUrl={pdfUrl} />;
}
