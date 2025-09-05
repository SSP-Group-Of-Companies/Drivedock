"use client";

import React from "react";
import { IdentificationsData } from "@/app/api/v1/admin/onboarding/[id]/application-form/identifications/types";
import LicenseInformationSection from "./LicenseInformationSection";
import ImageGallerySection from "./ImageGallerySection";
import { ECountryCode } from "@/types/shared.types";

interface IdentificationsContentProps {
  data: IdentificationsData;
  staged: Record<string, any>;
  isDirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onStage: (changes: any) => void;
  countryCode: ECountryCode;
}

export default function IdentificationsContent({
  data,
  staged,
  isDirty: _isDirty,
  onSave: _onSave,
  onDiscard: _onDiscard,
  onStage,
  countryCode,
}: IdentificationsContentProps) {
  // Extract data for components

  // Get current values (staged or original)
  const getCurrentValue = (field: string) => {
    return staged[field] !== undefined
      ? staged[field]
      : data[field as keyof IdentificationsData];
  };

  return (
    <div className="space-y-6">
      {/* License Information Section */}
      <div className="space-y-4">
        <div
          className="flex items-center gap-3 pb-2 border-b"
          style={{ borderColor: "var(--color-outline)" }}
        >
          <div
            className="w-1 h-8 rounded-full"
            style={{ background: "var(--color-primary)" }}
          />
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--color-on-surface)" }}
          >
            License Information
          </h2>
        </div>
        <LicenseInformationSection
          licenses={getCurrentValue("licenses") || []}
          employeeNumber={getCurrentValue("employeeNumber") || ""}
          hstNumber={getCurrentValue("hstNumber") || ""}
          businessNumber={getCurrentValue("businessNumber") || ""}
          fastCard={getCurrentValue("fastCard")}
          onStage={onStage}
          countryCode={countryCode}
        />
      </div>

      {/* Image Gallery Section */}
      <div className="space-y-4">
        <div
          className="flex items-center gap-3 pb-2 border-b"
          style={{ borderColor: "var(--color-outline)" }}
        >
          <div
            className="w-1 h-8 rounded-full"
            style={{ background: "var(--color-secondary)" }}
          />
          <h2
            className="text-xl font-bold"
            style={{ color: "var(--color-on-surface)" }}
          >
            Document Gallery
          </h2>
        </div>
        <ImageGallerySection
          licenses={getCurrentValue("licenses") || []}
          incorporatePhotos={getCurrentValue("incorporatePhotos") || []}
          hstPhotos={getCurrentValue("hstPhotos") || []}
          bankingInfoPhotos={getCurrentValue("bankingInfoPhotos") || []}
          healthCardPhotos={getCurrentValue("healthCardPhotos") || []}
          medicalCertificationPhotos={
            getCurrentValue("medicalCertificationPhotos") || []
          }
          passportPhotos={getCurrentValue("passportPhotos") || []}
          prPermitCitizenshipPhotos={
            getCurrentValue("prPermitCitizenshipPhotos") || []
          }
          usVisaPhotos={getCurrentValue("usVisaPhotos") || []}
          fastCard={getCurrentValue("fastCard")}
          employeeNumber={getCurrentValue("employeeNumber") || ""}
          hstNumber={getCurrentValue("hstNumber") || ""}
          businessNumber={getCurrentValue("businessNumber") || ""}
          onStage={onStage}
          countryCode={countryCode}
        />
      </div>
    </div>
  );
}
