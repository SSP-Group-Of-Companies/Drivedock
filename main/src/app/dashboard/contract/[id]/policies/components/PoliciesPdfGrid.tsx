"use client";

import React, { useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { getPoliciesPdfsForCompany } from "@/constants/policiesConsentForms";
import { ECompanyId } from "@/constants/companies";
import PoliciesPdfViewerModal from "./PoliciesPdfViewerModal";

interface PoliciesPdfGridProps {
  companyId: string;
}

export default function PoliciesPdfGrid({ companyId }: PoliciesPdfGridProps) {
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  // Get PDFs for the company
  const pdfs = getPoliciesPdfsForCompany(companyId as ECompanyId);

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--color-on-surface)" }}>
          Policy Documents
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pdfs.map((pdf, index) => (
            <button
              key={`${pdf.label}-${index}`}
              onClick={() => setModalUrl(pdf.path)}
              className="relative w-full rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md group"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
              }}
            >
              {/* PDF Badge */}
              <div className="absolute top-2 right-2 transform rotate-12 bg-red-500 text-white text-xs px-2 py-1 rounded font-bold shadow-sm">
                PDF
              </div>
              
              {/* Content */}
              <div className="flex items-start gap-3 pr-8">
                <div className="flex-shrink-0 p-2 rounded-lg" style={{
                  background: "var(--color-primary-container)",
                  color: "var(--color-on-primary-container)",
                }}>
                  <FileText className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium leading-tight" style={{ color: "var(--color-on-surface)" }}>
                    {pdf.label}
                  </h3>
                  <p className="text-xs mt-1" style={{ color: "var(--color-on-surface-variant)" }}>
                    Click to view document
                  </p>
                </div>
              </div>
              
              {/* External Link Icon */}
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-4 w-4" style={{ color: "var(--color-on-surface-variant)" }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* PDF Viewer Modal */}
      <PoliciesPdfViewerModal 
        modalUrl={modalUrl} 
        onClose={() => setModalUrl(null)} 
      />
    </>
  );
}
