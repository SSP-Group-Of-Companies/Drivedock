"use client";

import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

type PdfMeta = { label: string; path: string };

type Props = {
  pdfs: PdfMeta[];
  onOpenModal: (url: string) => void;
};

export default function PoliciesPdfGrid({ pdfs, onOpenModal }: Props) {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-wrap gap-4 justify-center">
      {pdfs.map((pdf) => (
        <button
          key={pdf.label}
          onClick={() => onOpenModal(pdf.path)}
          title={`${t("form.step3.viewPdf", "View")} ${pdf.label}`}
          className="relative w-full rounded-xl bg-white hover:shadow-md ring-1 ring-gray-200 px-4 py-3 cursor-pointer transition-all flex items-center text-center overflow-hidden"
        >
          <div className="absolute top-[1px] left-[-24px] transform -rotate-45 bg-red-500 text-white text-[12px] px-6 py-[3px] font-bold shadow-sm rounded-sm pointer-events-none select-none overflow-hidden">
            PDF
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shine" />
          </div>
          <span className="text-sm text-gray-700 font-medium leading-tight flex-1">{pdf.label}</span>
          <ExternalLink />
        </button>
      ))}
    </div>
  );
}
