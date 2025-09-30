"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import { usePersonalDetails, useUpdatePersonalDetails } from "@/hooks/dashboard/contract/usePersonalDetails";
import { usePrequalification } from "@/hooks/dashboard/contract/usePrequalification";
import { useDashboardPageLoading } from "@/hooks/useDashboardPageLoading";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import DashboardFormWizard from "../components/DashboardFormWizard";
import { useEditMode } from "../components/EditModeContext";
import {
  PersonalInformationSection,
  PlaceOfBirthSection,
  AddressHistorySection,
} from "./components";
import { validateAddresses } from "@/app/api/v1/admin/onboarding/[id]/application-form/personal-details/addressValidation";
import StepNotCompletedMessage from "../components/StepNotCompletedMessage";


export default function PersonalDetailsClient({
  trackerId,
}: {
  trackerId: string;
}) {
  const { data: contractData, isLoading: isContractLoading } =
    useContract(trackerId);
  const { hideLoader } = useDashboardPageLoading();
  const { isVisible: isDashboardLoaderVisible } = useDashboardLoading();
  const [shouldRender, setShouldRender] = useState(false);
  const { isEditMode } = useEditMode();
  const [saveMessage, setSaveMessage] = useState("");

  // React Query hooks
  const { 
    data: personalDetailsData, 
    isLoading: isPersonalDetailsLoading, 
    error,
    isError 
  } = usePersonalDetails(trackerId);
  
  const { 
    data: prequalificationData
  } = usePrequalification(trackerId);
  
  const updateMutation = useUpdatePersonalDetails(trackerId);

  // Staged changes (page-level) - like safety processing
  const [staged, setStaged] = useState<Record<string, any>>({});

  const hasUnsavedChanges = Object.keys(staged).length > 0;

  const clearStaged = () => setStaged({});


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
        stepName="Application Form Page 1"
        stepDescription="This page requires the driver to complete the personal information section including contact details, licenses, and address history."
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
    isPersonalDetailsLoading ||
    !personalDetailsData
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
            Loading Personal Details...
          </span>
        </div>
      </div>
    );
  }

  const personalData = personalDetailsData.data.personalDetails;
  const ctx = contractData;

  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    // Validate addresses before saving
    if (staged.addresses) {
      const addressErrors = validateAddresses(staged.addresses);
      if (addressErrors.length > 0) {
        setSaveMessage("Please fix address validation errors before saving");
        setTimeout(() => setSaveMessage(""), 5000);
        return;
      }
    }

    // Validate SIN expiry date for Work Permit holders
    if (prequalificationData?.data?.preQualifications?.statusInCanada === "Work Permit") {
      const sinExpiryDate = staged.sinExpiryDate || personalData?.sinExpiryDate;
      if (!sinExpiryDate) {
        setSaveMessage("SIN expiry date is required for Work Permit holders");
        setTimeout(() => setSaveMessage(""), 5000);
        return;
      }
      const expiryDate = new Date(sinExpiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate <= today) {
        setSaveMessage("SIN expiry date must be in the future");
        setTimeout(() => setSaveMessage(""), 5000);
        return;
      }
    }

    // Prepare the data in the format the API expects
    const dataToSend = {
      personalDetails: {
        ...personalData,
        ...staged, // Merge staged changes with original data
      },
    };

    try {
      await updateMutation.mutateAsync(dataToSend);
      setSaveMessage("Changes saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
      clearStaged();
    } catch (error) {
      console.error("Save error:", error);
      setSaveMessage(
        error instanceof Error ? error.message : "Failed to save changes"
      );
      setTimeout(() => setSaveMessage(""), 5000);
    }
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

      {/* Personal Details Content */}
      <div
        className="rounded-xl border p-8 shadow-sm dark:shadow-none"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-outline)",
        }}
      >
        {/* Save Message and Controls */}
        <div className="mb-6 space-y-4">
          {saveMessage && (
            <div
              className={`p-4 rounded-lg text-sm font-medium ${
                saveMessage.includes("successfully")
                  ? "bg-green-100 text-green-800 border border-green-200"
                  : "bg-red-100 text-red-800 border border-red-200"
              }`}
            >
              {saveMessage}
            </div>
          )}

          {/* Submit bar - always present but greyed out when not dirty */}
          <div
            className="sticky bottom-0 z-30 mt-2 -mx-2 sm:mx-0"
            aria-live="polite"
          >
            <div
              className="mx-2 rounded-xl border p-3 sm:flex sm:items-center sm:justify-between"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-outline)",
                boxShadow: "var(--elevation-2)",
                opacity: hasUnsavedChanges ? 1 : 0.6,
              }}
            >
              <div
                className="text-sm"
                style={{ color: "var(--color-on-surface-variant)" }}
              >
                {hasUnsavedChanges
                  ? "You have unsaved changes."
                  : "No changes to submit."}
              </div>

              <div className="mt-2 flex gap-2 sm:mt-0">
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1.5 text-sm"
                  style={{ borderColor: "var(--color-outline)" }}
                  onClick={clearStaged}
                  disabled={!hasUnsavedChanges || updateMutation.isPending}
                >
                  Discard
                </button>

                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  style={{
                    background: "var(--color-primary)",
                  }}
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Submitting…" : "Submit changes"}
                </button>
              </div>
            </div>
          </div>
        </div>

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

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Personal Information - Left Column (Larger) */}
          <div className="xl:col-span-7">
            <PersonalInformationSection
              data={personalData}
              isEditMode={isEditMode}
              staged={staged}
              onStage={(changes: Record<string, any>) =>
                setStaged((prev: Record<string, any>) => ({
                  ...prev,
                  ...changes,
                }))
              }
              prequalificationData={prequalificationData?.data?.preQualifications}
            />
          </div>

          {/* Right Column - Place of Birth and Address History */}
          <div className="xl:col-span-5 space-y-8">
            {/* Place of Birth */}
            <PlaceOfBirthSection
              data={personalData}
              isEditMode={isEditMode}
              staged={staged}
              onStage={(changes: Record<string, any>) =>
                setStaged((prev: Record<string, any>) => ({
                  ...prev,
                  ...changes,
                }))
              }
            />

            {/* Address History */}
            <AddressHistorySection
              data={personalData}
              isEditMode={isEditMode}
              staged={staged}
              onStage={(changes: Record<string, any>) =>
                setStaged((prev: Record<string, any>) => ({
                  ...prev,
                  ...changes,
                }))
              }
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
