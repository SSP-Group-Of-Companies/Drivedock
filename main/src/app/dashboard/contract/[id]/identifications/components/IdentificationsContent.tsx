"use client";

import React, { useEffect } from "react";
import { IdentificationsData } from "@/app/api/v1/admin/onboarding/[id]/application-form/identifications/types";
import DriverLicenseSection from "./DriverLicenseSection";
import FastCardSection from "./FastCardSection";
import BusinessInformationSection from "./BusinessInformationSection";
import ImageGallerySection from "./ImageGallerySection";
import TruckDetailsSection from "./TruckDetailsSection";
import MedicalCertificationSection from "./MedicalCertificationSection";
import ImmigrationAndWorkDocsSection from "./ImmigrationAndWorkDocsSection";
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
  const getCurrentValue = (field: string) => {
    return Object.prototype.hasOwnProperty.call(staged, field)
      ? staged[field]
      : data[field as keyof IdentificationsData];
  };

  useEffect(() => {
    if (window.location.hash === "#image-gallery") {
      const timer = setTimeout(() => {
        const galleryElement = document.getElementById("image-gallery");
        if (galleryElement) {
          galleryElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const isCanadian = countryCode === ECountryCode.CA;
  const isUS = countryCode === ECountryCode.US;

  return (
    <div className="space-y-6">
      {/* Row 1: Truck Details + Driver License */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TruckDetailsSection
          truckDetails={getCurrentValue("truckDetails")}
          onStage={onStage}
          highlight={highlightTruckDetails}
        />

        <DriverLicenseSection
          licenses={getCurrentValue("licenses") || []}
          onStage={onStage}
        />
      </div>

      {/* Row 2: Fast Card (CA) + Business Information */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {isCanadian && (
          <FastCardSection
            fastCard={getCurrentValue("fastCard")}
            onStage={onStage}
            countryCode={countryCode}
          />
        )}

        <BusinessInformationSection
          hstNumber={getCurrentValue("hstNumber") || ""}
          businessName={getCurrentValue("businessName") || ""}
          onStage={onStage}
          countryCode={countryCode}
        />
      </div>

      {/* Row 3: US-only Medical Certificate + Immigration / Work Auth */}
      {isUS && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <MedicalCertificationSection
            details={getCurrentValue("medicalCertificateDetails")}
            onStage={onStage}
          />

          <ImmigrationAndWorkDocsSection
            immigrationStatusInUS={getCurrentValue("immigrationStatusInUS")}
            passportDetails={getCurrentValue("passportDetails")}
            prPermitCitizenshipDetails={getCurrentValue(
              "prPermitCitizenshipDetails"
            )}
            passportPhotosCount={
              (getCurrentValue("passportPhotos") || []).length
            }
            prPermitCitizenshipPhotosCount={
              (getCurrentValue("prPermitCitizenshipPhotos") || []).length
            }
            onStage={onStage}
          />
        </div>
      )}

      {/* Document Gallery Section */}
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
