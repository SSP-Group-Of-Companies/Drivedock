"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import { useDashboardPageLoading } from "@/hooks/useDashboardPageLoading";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import DashboardFormWizard from "../components/DashboardFormWizard";
import { useEditMode } from "../components/EditModeContext";
import { type ExtrasResponse } from "@/app/api/v1/admin/onboarding/[id]/application-form/extras/types";
import { EducationSection, CanadianHoursSection, AdditionalInfoSection } from "./components";
import StepNotCompletedMessage from "../components/StepNotCompletedMessage";

// Helper functions for API calls
async function fetchExtras(
  trackerId: string
): Promise<ExtrasResponse> {
  const response = await fetch(
    `/api/v1/admin/onboarding/${trackerId}/application-form/extras`
  );
  if (!response.ok) {
    // Check if it's a 401 error and include the error message
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `401: ${errorData.message || "Driver hasn't completed this step yet"}`
      );
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

async function patchExtras(
  trackerId: string,
  data: any
): Promise<ExtrasResponse> {
  const response = await fetch(
    `/api/v1/admin/onboarding/${trackerId}/application-form/extras`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    // Check if it's a 401 error and include the error message
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `401: ${errorData.message || "Driver hasn't completed this step yet"}`
      );
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || response.statusText);
  }

  return response.json();
}

export default function ExtrasClient({
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Direct state management instead of hooks
  const [extrasData, setExtrasData] =
    useState<ExtrasResponse | null>(null);
  const [isExtrasLoading, setIsExtrasLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Staged changes (page-level) - like other pages
  const [staged, setStaged] = useState<Record<string, any>>({});
  


  const hasUnsavedChanges = Object.keys(staged).length > 0;

  const clearStaged = () => setStaged({});

  // Fetch extras data
  useEffect(() => {
    const loadExtras = async () => {
      try {
        setIsExtrasLoading(true);
        setError(null);
        const data = await fetchExtras(trackerId);
        setExtrasData(data);
        // Don't initialize staged with current data - start empty like accidents-criminal
        setStaged({});
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load extras'));
      } finally {
        setIsExtrasLoading(false);
      }
    };

    if (trackerId) {
      loadExtras();
    }
  }, [trackerId]);

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

    setIsSaving(true);
    setSaveMessage("");

    try {
      // Prepare the data in the format the API expects (like employment history)
      const dataToSend = {
        // Education
        ...(staged.gradeSchool !== undefined || staged.college !== undefined || staged.postGraduate !== undefined) && {
          education: {
            gradeSchool: staged.gradeSchool ?? extrasData?.data.education.gradeSchool ?? 0,
            college: staged.college ?? extrasData?.data.education.college ?? 0,
            postGraduate: staged.postGraduate ?? extrasData?.data.education.postGraduate ?? 0,
          }
        },
        
        // Canadian Hours
        ...(staged.dayOneDate !== undefined || staged.dailyHours !== undefined) && {
          canadianHoursOfService: {
            dayOneDate: staged.dayOneDate ?? extrasData?.data.canadianHoursOfService.dayOneDate,
            dailyHours: staged.dailyHours ?? extrasData?.data.canadianHoursOfService.dailyHours ?? [],
          }
        },
        
        // Additional Info fields
        ...(staged.deniedLicenseOrPermit !== undefined && { deniedLicenseOrPermit: staged.deniedLicenseOrPermit }),
        ...(staged.suspendedOrRevoked !== undefined && { suspendedOrRevoked: staged.suspendedOrRevoked }),
        ...(staged.suspensionNotes !== undefined && { suspensionNotes: staged.suspensionNotes }),
        ...(staged.testedPositiveOrRefused !== undefined && { testedPositiveOrRefused: staged.testedPositiveOrRefused }),
        ...(staged.completedDOTRequirements !== undefined && { completedDOTRequirements: staged.completedDOTRequirements }),
        ...(staged.hasAccidentalInsurance !== undefined && { hasAccidentalInsurance: staged.hasAccidentalInsurance }),
      };


      // Use the direct API call
      await patchExtras(trackerId, dataToSend);

      setSaveMessage("Changes saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);

      // Clear staged changes after successful save
      clearStaged();

      // Refresh the data to show updated values
      const refreshedData = await fetchExtras(trackerId);
      setExtrasData(refreshedData);
    } catch (error) {
      console.error("Save error:", error);
      setSaveMessage(
        error instanceof Error ? error.message : "Failed to save changes"
      );
      setTimeout(() => setSaveMessage(""), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Check for 401 error (step not completed) - MUST be before loading check
  if (error && error.message.includes("401")) {
    return (
      <StepNotCompletedMessage 
        stepName="Application Form Page 4"
        stepDescription="This page requires the driver to complete the application form including education, Canadian hours of service, and additional information."
      />
    );
  }

  // Don't render anything while dashboard loader is visible or before transition is complete
  if (isDashboardLoaderVisible || !shouldRender) {
    return null;
  }

  // Show loading state for contract data while layout is visible
  if (isContractLoading || !contractData || isExtrasLoading || !extrasData) {
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
            Loading Extras...
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

      {/* Extras Content */}
      <div
        className="rounded-xl border p-6 shadow-sm dark:shadow-none"
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
                  disabled={!hasUnsavedChanges || isSaving}
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
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  {isSaving ? "Submitting…" : "Submit changes"}
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

        {error ? (
          <div className="p-4 rounded-lg bg-red-100 text-red-800 border border-red-200">
            <p className="font-medium">Error loading extras:</p>
            <p className="text-sm">{error.message}</p>
          </div>
        ) : extrasData?.data ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Education Section - Left Column */}
            <div className="xl:col-span-6">
              <EducationSection
                data={extrasData.data.education}
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

            {/* Additional Info Section - Right Column */}
            <div className="xl:col-span-6">
              <AdditionalInfoSection
                data={{
                  deniedLicenseOrPermit: extrasData.data.deniedLicenseOrPermit,
                  suspendedOrRevoked: extrasData.data.suspendedOrRevoked,
                  suspensionNotes: extrasData.data.suspensionNotes,
                  testedPositiveOrRefused: extrasData.data.testedPositiveOrRefused,
                  completedDOTRequirements: extrasData.data.completedDOTRequirements,
                  hasAccidentalInsurance: extrasData.data.hasAccidentalInsurance,
                }}
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

            {/* Canadian Hours Section - Full Width Below */}
            <div className="xl:col-span-12">
              <CanadianHoursSection
                data={extrasData.data.canadianHoursOfService}
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
        ) : (
          <div className="text-center py-8">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--color-on-surface)" }}
            >
              No extras data found
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--color-on-surface-variant)" }}
            >
              This driver may not have completed the extras step yet.
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
