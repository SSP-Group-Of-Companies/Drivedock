"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import UpdateSubmitBar from "../safety-processing/components/UpdateSubmitBar";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import { useEmploymentHistory, useUpdateEmploymentHistory } from "@/hooks/dashboard/contract/useEmploymentHistory";
import { useDashboardPageLoading } from "@/hooks/useDashboardPageLoading";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import DashboardFormWizard from "../components/DashboardFormWizard";
import { useEditMode } from "../components/EditModeContext";
import { validateEmployments } from "@/app/api/v1/admin/onboarding/[id]/application-form/employment-history/employmentValidation";
import { EmploymentForm } from "./components";
import StepNotCompletedMessage from "../components/StepNotCompletedMessage";
import AdminEmploymentQuestionsSection from "./components/AdminEmploymentQuestionsSection";



export default function EmploymentHistoryClient({
  trackerId,
}: {
  trackerId: string;
}) {
  const { data: contractData, isLoading: isContractLoading } =
    useContract(trackerId);
  const { hideLoader } = useDashboardPageLoading();
  const { isVisible: isDashboardLoaderVisible } = useDashboardLoading();
  const { isEditMode } = useEditMode();
  const [shouldRender, setShouldRender] = useState(false);
  // unified submit bar handles messaging; no page-level banner

  // React Query hooks
  const { 
    data: employmentData, 
    isLoading: isEmploymentLoading, 
    error,
    isError 
  } = useEmploymentHistory(trackerId);
  
  const updateMutation = useUpdateEmploymentHistory(trackerId);

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

    // Validate employments before saving
    if (staged.employments) {
      const employmentErrors = validateEmployments(staged.employments);
      if (employmentErrors.length > 0) {
        throw new Error("Please fix employment validation errors before saving");
      }
    }

    // Prepare the data in the format the API expects
    const dataToSend = {
      employments:
        staged.employments ||
        employmentData?.data.employmentHistory.employments ||
        [],
      // Include employment questions data
      workedWithCompanyBefore: staged.workedWithCompanyBefore !== undefined 
        ? staged.workedWithCompanyBefore 
        : employmentData?.data.employmentHistory.workedWithCompanyBefore,
      reasonForLeavingCompany: staged.reasonForLeavingCompany !== undefined 
        ? staged.reasonForLeavingCompany 
        : employmentData?.data.employmentHistory.reasonForLeavingCompany,
      previousWorkDetails: staged.previousWorkDetails !== undefined 
        ? staged.previousWorkDetails 
        : employmentData?.data.employmentHistory.previousWorkDetails,
      currentlyEmployed: staged.currentlyEmployed !== undefined 
        ? staged.currentlyEmployed 
        : employmentData?.data.employmentHistory.currentlyEmployed,
      referredBy: staged.referredBy !== undefined 
        ? staged.referredBy 
        : employmentData?.data.employmentHistory.referredBy,
      expectedRateOfPay: staged.expectedRateOfPay !== undefined 
        ? staged.expectedRateOfPay 
        : employmentData?.data.employmentHistory.expectedRateOfPay,
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
        stepName="Application Form Page 2"
        stepDescription="This page requires the driver to complete the employment history section including work experience and gap explanations."
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
    isEmploymentLoading ||
    !employmentData
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
            Loading Employment History...
          </span>
        </div>
      </div>
    );
  }



  const ctx = contractData;

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

      {/* Employment History Content */}
      <div
        className="rounded-xl border p-6 shadow-sm dark:shadow-none"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-outline)",
        }}
      >
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

        {error ? (
          <div className="p-4 rounded-lg bg-red-100 text-red-800 border border-red-200">
            <p className="font-medium">Error loading employment history:</p>
            <p className="text-sm">{error.message}</p>
          </div>
                ) : employmentData?.data?.employmentHistory?.employments ? (
          <>
            <AdminEmploymentQuestionsSection
              data={employmentData.data.employmentHistory}
              isEditMode={isEditMode}
              staged={staged}
              onStage={stageUpdate}
            />
            <div className="mt-8">
              <EmploymentForm
                data={{
                  employments: employmentData.data.employmentHistory.employments,
                }}
                isEditMode={isEditMode}
                staged={staged}
                onStage={stageUpdate}
              />
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--color-on-surface)" }}
            >
              No employment history data found
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              This driver may not have completed the employment history step
              yet.
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
