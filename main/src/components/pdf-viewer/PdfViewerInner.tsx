"use client";

import { Viewer, Worker } from "@react-pdf-viewer/core";
import { zoomPlugin } from "@react-pdf-viewer/zoom";
import "@react-pdf-viewer/core/lib/styles/index.css";

type Props = { pdfUrl: string };

export default function PdfViewerInner({ pdfUrl }: Props) {
  const zoomPluginInstance = zoomPlugin();
  const { ZoomInButton, ZoomOutButton } = zoomPluginInstance;

  return (
    <div className="w-full h-full relative" onContextMenu={(e) => e.preventDefault()}>
      <div className="absolute bottom-2 left-2 z-10 flex gap-2 bg-white/80 backdrop-blur-md shadow-md rounded px-2 py-1">
        <ZoomOutButton />
        <ZoomInButton />
      </div>

      <style jsx global>{`
        .rpv-core__viewer {
          padding: 0 !important;
        }
        .rpv-core__page-layer {
          margin: 0 auto !important;
        }
        .rpv-core__inner-pages {
          padding-top: 0 !important;
        }
      `}</style>

      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer fileUrl={pdfUrl} theme="white" plugins={[zoomPluginInstance]} />
      </Worker>
    </div>
  );
}
