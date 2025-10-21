"use client";

import React, { useEffect } from "react";
import { IdentificationsData } from "@/app/api/v1/admin/onboarding/[id]/application-form/identifications/types";
import DriverLicenseSection from "./DriverLicenseSection";
import FastCardSection from "./FastCardSection";
import BusinessInformationSection from "./BusinessInformationSection";
import ImageGallerySection from "./ImageGallerySection";
import TruckDetailsSection from "./TruckDetailsSection";
import { ECountryCode } from "@/types/shared.types";

interface IdentificationsContentProps {
  data: IdentificationsData;
  staged: Record<string, any>;
  isDirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onStage: (changes: any) => void;
  countryCode: ECountryCode;
  highlightTruckDetails?: boolean;
  driverType?: string;
}

export default function IdentificationsContent({
  data,
  staged,
  isDirty: _isDirty,
  onSave: _onSave,
  onDiscard: _onDiscard,
  onStage,
  countryCode,
  highlightTruckDetails = false,
  driverType,
}: IdentificationsContentProps) {
  // Extract data for components

  // Get current values (staged or original)
  const getCurrentValue = (field: string) => {
    // Use hasOwnProperty to detect if field was explicitly set in staged (even if undefined)
    return Object.prototype.hasOwnProperty.call(staged, field)
      ? staged[field]
      : data[field as keyof IdentificationsData];
  };

  // Handle anchor scrolling on page load (from Personal Details SIN photo click)
  useEffect(() => {
    if (window.location.hash === '#image-gallery') {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        const galleryElement = document.getElementById('image-gallery');
        if (galleryElement) {
          galleryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Row 1: Truck Details + Driver License */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Truck Details Section */}
        <TruckDetailsSection
          truckDetails={getCurrentValue("truckDetails")}
          onStage={onStage}
          highlight={highlightTruckDetails}
        />

        {/* Driver License Section */}
        <DriverLicenseSection
          licenses={getCurrentValue("licenses") || []}
          onStage={onStage}
        />
      </div>

      {/* Row 2: Fast Card + Business Information */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Fast Card Section - Only for Canadian drivers */}
        {countryCode === ECountryCode.CA && (
          <FastCardSection
            fastCard={getCurrentValue("fastCard")}
            onStage={onStage}
            countryCode={countryCode}
          />
        )}

        {/* Business Information Section */}
        <BusinessInformationSection
          hstNumber={getCurrentValue("hstNumber") || ""}
          businessName={getCurrentValue("businessName") || ""}
          onStage={onStage}
        />
      </div>

      {/* Image Gallery Section */}
      <div id="image-gallery" className="space-y-4">
        <div
          className="flex items-center gap-3 pb-2 border-b"
          style={{ borderColor: "var(--color-outline)" }}
        >
          <div
            className="w-1 h-8 rounded-full"
            style={{ background: "var(--color-primary-container)" }}
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
          sinPhoto={getCurrentValue("sinPhoto")}
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
          hstNumber={getCurrentValue("hstNumber") || ""}
          businessName={getCurrentValue("businessName") || ""}
          passportType={getCurrentValue("passportType")}
          workAuthorizationType={getCurrentValue("workAuthorizationType")}
          onStage={onStage}
          countryCode={countryCode}
          driverType={driverType}
        />
      </div>

    </div>
  );
}
