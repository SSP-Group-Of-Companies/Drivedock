"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import UpdateSubmitBar from "../safety-processing/components/UpdateSubmitBar";
import { useSearchParams } from "next/navigation";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import {
  useIdentifications,
  useUpdateIdentifications,
} from "@/hooks/dashboard/contract/useIdentifications";
import { useDashboardPageLoading } from "@/hooks/useDashboardPageLoading";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import DashboardFormWizard from "../components/DashboardFormWizard";
import { useEditMode } from "../components/EditModeContext";
import IdentificationsContent from "./components/IdentificationsContent";
import type { PrequalificationsResponse } from "@/app/api/v1/admin/onboarding/[id]/prequalifications/types";
import { COMPANIES } from "@/constants/companies";
import { ECountryCode } from "@/types/shared.types";
import StepNotCompletedMessage from "../components/StepNotCompletedMessage";

export default function IdentificationsClient({
  trackerId,
}: {
  trackerId: string;
}) {
  const searchParams = useSearchParams();
  const { data: contractData, isLoading: isContractLoading } =
    useContract(trackerId);
  const { hideLoader } = useDashboardPageLoading();
  const { isVisible: isDashboardLoaderVisible } = useDashboardLoading();
  const [shouldRender, setShouldRender] = useState(false);
  const { isEditMode } = useEditMode();
  // unified submit bar handles messaging

  // Check if we should highlight the Truck Details card
  const shouldHighlightTruckDetails =
    searchParams.get("highlight") === "truck-details";

  // React Query hooks
  const {
    data: identificationsData,
    isLoading: isIdentificationsLoading,
    error,
    isError,
  } = useIdentifications(trackerId);

  const updateMutation = useUpdateIdentifications(trackerId);
  // Fetch prequalification data for driverType
  const [prequalData, setPrequalData] =
    useState<PrequalificationsResponse | null>(null);
  const [, setIsPrequalLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsPrequalLoading(true);
        const resp = await fetch(
          `/api/v1/admin/onboarding/${trackerId}/prequalifications`
        );
        if (!resp.ok) throw new Error("Failed to load prequalifications");
        const json = (await resp.json()) as PrequalificationsResponse;
        if (!cancelled) setPrequalData(json);
      } catch {
        if (!cancelled) setPrequalData(null);
      } finally {
        if (!cancelled) setIsPrequalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trackerId]);

  // Staged changes (page-level) - like safety processing
  const [staged, setStaged] = useState<Record<string, any>>({});

  const hasUnsavedChanges = Object.keys(staged).length > 0;

  const clearStaged = () => setStaged({});

  // Merge-friendly updater so section updates don't clobber each other
  const stageUpdate = (update: any) => {
    if (typeof update === "function") {
      setStaged((prev) => update(prev));
    } else {
      setStaged((prev) => ({ ...prev, ...update }));
    }
  };

  // Progressive loading: Show layout first, then content
  useEffect(() => {
    // Show layout as soon as contract data is available
    if (contractData && !isContractLoading) {
      hideLoader();
      setTimeout(() => {
        setShouldRender(true);
      }, 100); // Faster transition for layout
    }
  }, [contractData, isContractLoading, hideLoader]);

  // Check for 401 error (step not completed) - MUST be before loading check
  if (isError && error && error.message.includes("401")) {
    return (
      <StepNotCompletedMessage
        stepName="Application Form Page 4"
        stepDescription="This page requires the driver to complete Page 4 of the application form (Eligibility Documents) including all required identification documents and photos."
      />
    );
  }

  // Don't render anything while dashboard loader is visible or before transition is complete
  if (isDashboardLoaderVisible || !shouldRender) {
    return null;
  }

  // Show loading state for contract data while layout is visible
  if (
    isContractLoading ||
    !contractData ||
    isIdentificationsLoading ||
    !identificationsData
  ) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{
          borderColor: "var(--color-outline)",
          background: "var(--color-card)",
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "var(--color-primary)",
              borderWidth: "2px",
            }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            Loading Identifications...
          </span>
        </div>
      </div>
    );
  }

  // Check if we have the required data structure
  if (!identificationsData?.data?.licenses) {
    return (
      <div
        className="rounded-xl border p-8 text-center"
        style={{
          borderColor: "var(--color-outline)",
          background: "var(--color-card)",
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <span
            className="text-sm font-medium"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            No identifications data found
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
            This driver may not have completed the identifications step yet.
          </span>
        </div>
      </div>
    );
  }

  const ctx = contractData;

  // Handle save
  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    const baseData = { ...identificationsData.data };
    // Remove onboardingContext – never send to PATCH
    delete (baseData as any).onboardingContext;

    // Country context
    const company = COMPANIES.find((c) => c.id === contractData.companyId);
    const isCanadian = company?.countryCode === ECountryCode.CA;
    const isUS = company?.countryCode === ECountryCode.US;

    if (!isCanadian && !isUS) {
      throw new Error("Unsupported applicant country for identifications");
    }

    /**
     * We build a PatchBody that matches exactly what
     * /api/v1/admin/onboarding/[id]/application-form/identifications expects.
     *
     * Strategy:
     * - Start from GET data (baseData)
     * - Apply staged overrides
     * - Only include keys allowed for that country
     */

    // Always required in PATCH, regardless of edits
    const core: any = {
      licenses: baseData.licenses,
      sinPhoto: baseData.sinPhoto,
      // Truck details + fast card can be edited from this screen for both countries
      truckDetails: baseData.truckDetails,
      fastCard: baseData.fastCard,
    };

    // Business + banking (same structure for both; backend handles country rules)
    const businessAndBanking: any = {
      businessName: baseData.businessName,
      incorporatePhotos: baseData.incorporatePhotos,
      bankingInfoPhotos: baseData.bankingInfoPhotos,
    };

    // HST is *Canada only* – must not be present at all for US
    if (isCanadian) {
      businessAndBanking.hstNumber = baseData.hstNumber;
      businessAndBanking.hstPhotos = baseData.hstPhotos;
    }

    // CA-specific eligibility docs
    const caDocs: any = {};
    if (isCanadian) {
      caDocs.healthCardPhotos = baseData.healthCardPhotos;
      caDocs.passportType = baseData.passportType;
      caDocs.workAuthorizationType = baseData.workAuthorizationType;
      caDocs.passportPhotos = baseData.passportPhotos;
      caDocs.prPermitCitizenshipPhotos = baseData.prPermitCitizenshipPhotos;
      caDocs.usVisaPhotos = baseData.usVisaPhotos;
      // DO NOT send any medicalCertification fields for CA
      // (backend forbids even the key for medicalCertificationPhotos)
    }

    // US-specific eligibility docs
    const usDocs: any = {};
    if (isUS) {
      // Medical certificate (photos + details)
      usDocs.medicalCertificationPhotos = baseData.medicalCertificationPhotos;
      usDocs.medicalCertificateDetails = baseData.medicalCertificateDetails;

      // Immigration + bundles
      usDocs.immigrationStatusInUS = baseData.immigrationStatusInUS;
      usDocs.passportPhotos = baseData.passportPhotos;
      usDocs.prPermitCitizenshipPhotos = baseData.prPermitCitizenshipPhotos;
      usDocs.passportDetails = baseData.passportDetails;
      usDocs.prPermitCitizenshipDetails = baseData.prPermitCitizenshipDetails;

      // DO NOT send HST, healthCardPhotos or usVisaPhotos for US
    }

    // Base payload before staged overrides
    const filteredData: any = {
      ...core,
      ...businessAndBanking,
      ...(isCanadian ? caDocs : {}),
      ...(isUS ? usDocs : {}),
    };

    // staged can override / add any of the PatchBody keys
    const dataToSend = {
      ...filteredData,
      ...staged,
    };

    // Final safety: strip forbidden fields if somehow present after staging
    if (isUS) {
      delete (dataToSend as any).hstNumber;
      delete (dataToSend as any).hstPhotos;
      delete (dataToSend as any).healthCardPhotos;
      delete (dataToSend as any).usVisaPhotos;
    } else if (isCanadian) {
      delete (dataToSend as any).medicalCertificationPhotos;
      delete (dataToSend as any).medicalCertificateDetails;
      delete (dataToSend as any).immigrationStatusInUS;
      delete (dataToSend as any).passportDetails;
      delete (dataToSend as any).prPermitCitizenshipDetails;
    }

    try {
      await updateMutation.mutateAsync(dataToSend);
      clearStaged();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Failed to save changes");
    }
  };

  // Handle discard
  const handleDiscard = () => {
    clearStaged();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: "easeOut",
        delay: 0.1, // Small delay to ensure smooth transition after loader hides
      }}
      className="space-y-4"
    >
      {/* Form Wizard Progress */}
      <DashboardFormWizard contractContext={ctx} />

      {/* Identifications Content */}
      <div
        className="rounded-xl border p-4 sm:p-6 lg:p-8 shadow-sm dark:shadow-none"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-outline)",
        }}
      >
        <div className="flex justify-end mb-6">
          <div className="flex items-center gap-2">
            <span
              className="text-xs sm:text-sm"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              Edit Mode:
            </span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                isEditMode
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
              }`}
            >
              {isEditMode ? "ON" : "OFF"}
            </span>
          </div>
        </div>

        {/* Unified submit bar */}
        <UpdateSubmitBar
          dirty={hasUnsavedChanges}
          busy={updateMutation.isPending}
          onSubmit={handleSave}
          onDiscard={handleDiscard}
        />

        <IdentificationsContent
          data={identificationsData.data}
          staged={staged}
          isDirty={hasUnsavedChanges}
          onSave={handleSave}
          onDiscard={handleDiscard}
          onStage={stageUpdate}
          countryCode={(() => {
            const company = COMPANIES.find(
              (c) => c.id === contractData.companyId
            );
            return company?.countryCode || ECountryCode.CA;
          })()}
          highlightTruckDetails={shouldHighlightTruckDetails}
          driverType={prequalData?.data?.preQualifications?.driverType}
        />
      </div>
    </motion.div>
  );
}
