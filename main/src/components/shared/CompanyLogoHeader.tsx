// src/components/shared/CompanyLogoHeader.tsx
"use client";

import { useCompanySelection } from "@/hooks/useCompanySelection";
import Image from "next/image";

type Props = {
  logoOnly?: boolean;
};

export default function CompanyLogoHeader({ logoOnly = false }: Props) {
  const { selectedCompany } = useCompanySelection();

  if (!selectedCompany) return null;

  return (
    <div className="flex items-center justify-center mb-4">
      <div className="flex flex-col items-center">
        <Image
          src={selectedCompany.logo}
          alt={selectedCompany.name}
          width={160}
          height={60}
          className="object-contain w-auto h-12 sm:h-16"
        />
        {!logoOnly && (
          <p className="text-sm text-gray-600 mt-1">{selectedCompany.name}</p>
        )}
      </div>
    </div>
  );
}
