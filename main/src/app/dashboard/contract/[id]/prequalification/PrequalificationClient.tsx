"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import UpdateSubmitBar from "../safety-processing/components/UpdateSubmitBar";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import { usePrequalification, useUpdatePrequalification } from "@/hooks/dashboard/contract/usePrequalification";
import { useDashboardPageLoading } from "@/hooks/useDashboardPageLoading";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import DashboardFormWizard from "../components/DashboardFormWizard";
import { useEditMode } from "../components/EditModeContext";
import { OptionalsSection, MandatorySection, CategoriesSection } from "./components";
import StepNotCompletedMessage from "../components/StepNotCompletedMessage";
import { getCompanyById } from "@/constants/companies";


export default function PrequalificationClient({ trackerId }: { trackerId: string }) {
  const { data: contractData, isLoading: isContractLoading } = useContract(trackerId);
  const { hideLoader } = useDashboardPageLoading();
  const { isVisible: isDashboardLoaderVisible } = useDashboardLoading();
  const { isEditMode } = useEditMode();
  const [shouldRender, setShouldRender] = useState(false);
  // unified submit bar handles messaging; no page-level banner

  // React Query hooks
  const { 
    data: prequalData, 
    isLoading: isPrequalLoading, 
    error,
    isError 
  } = usePrequalification(trackerId);
  
  const updateMutation = useUpdatePrequalification(trackerId);

  // Staged changes (page-level) - like safety processing
  const [staged, setStaged] = useState<Record<string, any>>({});

  const hasUnsavedChanges = Object.keys(staged).length > 0;

  const clearStaged = () => setStaged({});

  // Merge-friendly staged updater used across sections
  const stageUpdate = (changes: any) => {
    if (typeof changes === "function") {
      setStaged((prev) => changes(prev));
    } else {
      setStaged((prev) => ({ ...prev, ...changes }));
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

  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    // Prepare the data in the format the API expects
    const dataToSend = {
      canDriveManual: staged.canDriveManual !== undefined 
        ? staged.canDriveManual 
        : prequalData?.data?.preQualifications?.canDriveManual,
      faultAccidentIn3Years: staged.faultAccidentIn3Years !== undefined 
        ? staged.faultAccidentIn3Years 
        : prequalData?.data?.preQualifications?.faultAccidentIn3Years,
      zeroPointsOnAbstract: staged.zeroPointsOnAbstract !== undefined 
        ? staged.zeroPointsOnAbstract 
        : prequalData?.data?.preQualifications?.zeroPointsOnAbstract,
      noUnpardonedCriminalRecord: staged.noUnpardonedCriminalRecord !== undefined 
        ? staged.noUnpardonedCriminalRecord 
        : prequalData?.data?.preQualifications?.noUnpardonedCriminalRecord,
      driverType: staged.driverType !== undefined 
        ? staged.driverType 
        : prequalData?.data?.preQualifications?.driverType,
      haulPreference: staged.haulPreference !== undefined 
        ? staged.haulPreference 
        : prequalData?.data?.preQualifications?.haulPreference,
      teamStatus: staged.teamStatus !== undefined 
        ? staged.teamStatus 
        : prequalData?.data?.preQualifications?.teamStatus,
      flatbedExperience: staged.flatbedExperience !== undefined 
        ? staged.flatbedExperience 
        : prequalData?.data?.preQualifications?.flatbedExperience,
    };

    try {
      await updateMutation.mutateAsync(dataToSend);
      clearStaged();
    } catch (error) {
      throw error instanceof Error ? error : new Error("Failed to save changes");
    }
  };

  // Check for 401 error (step not completed) - MUST be before loading check
  if (isError && error && error.message.includes("401")) {
    return (
      <StepNotCompletedMessage 
        stepName="Prequalifications"
        stepDescription="This page requires the driver to complete the prequalification questions including optionals, mandatory, and category selections."
      />
    );
  }

  // Don't render anything while dashboard loader is visible or before transition is complete
  if (isDashboardLoaderVisible || !shouldRender) {
    return null;
  }

  // Show loading state for contract data while layout is visible
  if (isContractLoading || !contractData || isPrequalLoading || !prequalData) {
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
              borderWidth: "2px"
            }}
          />
          <span className="text-xs font-medium" style={{ color: "var(--color-on-surface-variant)" }}>
            Loading Prequalification...
          </span>
        </div>
      </div>
    );
  }

  // Check if driver has completed the required step (Prequalifications)
  if (!prequalData?.data?.preQualifications || 
      Object.keys(prequalData.data.preQualifications).length === 0) {
    return (
      <StepNotCompletedMessage 
        stepName="Prequalifications"
        stepDescription="This page requires the driver to complete the prequalification questions including optionals, mandatory, and category selections."
      />
    );
  }

  const ctx = contractData;
  
  // Get company information for filtering
  const company = contractData?.companyId ? getCompanyById(contractData.companyId) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5,
        ease: "easeOut",
        delay: 0.1 // Small delay to ensure smooth transition after loader hides
      }}
      className="space-y-4"
    >
      {/* Form Wizard Progress */}
      <DashboardFormWizard contractContext={ctx} />

      {/* Prequalification Content */}
      <div className="rounded-xl border p-8 shadow-sm dark:shadow-none" style={{
        background: "var(--color-card)",
        borderColor: "var(--color-outline)",
      }}>
        {/* Unified submit bar */}
        <UpdateSubmitBar dirty={hasUnsavedChanges} busy={updateMutation.isPending} onSubmit={handleSave} onDiscard={clearStaged} />

        {/* Edit Mode Status - Right Aligned */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2">
            <span
              className="text-sm"
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
        
        {/* Improved Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* Optionals Section - Wider for more questions */}
          <div className="lg:col-span-1 xl:col-span-4">
            <OptionalsSection 
              data={prequalData?.data?.preQualifications || {}} 
              staged={staged}
              onStage={stageUpdate}
              isEditMode={isEditMode}
              company={company}
            />
          </div>
          
          {/* Mandatory Section - Standard width */}
          <div className="lg:col-span-1 xl:col-span-3">
            <MandatorySection 
              data={prequalData?.data?.preQualifications || {}} 
              company={company}
            />
          </div>
          
          {/* Categories Section - Wider for choice options */}
          <div className="lg:col-span-2 xl:col-span-5">
            <CategoriesSection 
              data={prequalData?.data?.preQualifications || {}}
              staged={staged}
              onStage={stageUpdate}
              isEditMode={isEditMode}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
