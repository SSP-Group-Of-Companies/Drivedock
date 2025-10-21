"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import UpdateSubmitBar from "../safety-processing/components/UpdateSubmitBar";
import { useSearchParams } from "next/navigation";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import { useIdentifications, useUpdateIdentifications } from "@/hooks/dashboard/contract/useIdentifications";
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
  const shouldHighlightTruckDetails = searchParams.get("highlight") === "truck-details";

  // React Query hooks
  const { 
    data: identificationsData, 
    isLoading: isIdentificationsLoading, 
    error,
    isError 
  } = useIdentifications(trackerId);
  
  const updateMutation = useUpdateIdentifications(trackerId);
  // Fetch prequalification data for driverType
  const [prequalData, setPrequalData] = useState<PrequalificationsResponse | null>(null);
  const [, setIsPrequalLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsPrequalLoading(true);
        const resp = await fetch(`/api/v1/admin/onboarding/${trackerId}/prequalifications`);
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

    // Prepare the data in the format the API expects
    const baseData = { ...identificationsData?.data };
    // Remove onboardingContext as it's not part of the PATCH
    delete (baseData as any).onboardingContext;

    // Get country to determine which fields to include
    const company = COMPANIES.find((c) => c.id === contractData.companyId);
    const isCanadian = company?.countryCode === ECountryCode.CA;
    const isUS = company?.countryCode === ECountryCode.US;

    // Filter data based on country requirements
    const filteredData: any = {
      licenses: baseData.licenses,
      sinPhoto: baseData.sinPhoto, // Add SIN photo
      hstNumber: baseData.hstNumber,
      businessName: baseData.businessName,
      incorporatePhotos: baseData.incorporatePhotos,
      hstPhotos: baseData.hstPhotos,
      bankingInfoPhotos: baseData.bankingInfoPhotos,
      passportPhotos: baseData.passportPhotos,
      prPermitCitizenshipPhotos: baseData.prPermitCitizenshipPhotos,
      fastCard: baseData.fastCard,
      passportType: baseData.passportType,
      workAuthorizationType: baseData.workAuthorizationType,
    };

    // Add country-specific fields
    if (isCanadian) {
      filteredData.healthCardPhotos = baseData.healthCardPhotos;
      filteredData.usVisaPhotos = baseData.usVisaPhotos;
      // Don't include medicalCertificationPhotos for Canadians
    } else if (isUS) {
      filteredData.medicalCertificationPhotos =
        baseData.medicalCertificationPhotos;
      // Don't include healthCardPhotos or usVisaPhotos for US
    }

    const dataToSend = {
      ...filteredData,
      ...staged, // Merge staged changes with filtered data
    };

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
        <UpdateSubmitBar dirty={hasUnsavedChanges} busy={updateMutation.isPending} onSubmit={handleSave} onDiscard={handleDiscard} />

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
