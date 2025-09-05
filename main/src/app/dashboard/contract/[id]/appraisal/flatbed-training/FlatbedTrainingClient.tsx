"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import { useDashboardPageLoading } from "@/hooks/useDashboardPageLoading";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import DashboardFormWizard from "../../components/DashboardFormWizard";
import { useEditMode } from "../../components/EditModeContext";
import { FlatbedTrainingContent, UpdateSubmitBar } from "./components";
import { type FlatbedTrainingResponse } from "@/app/api/v1/admin/onboarding/[id]/appraisal/flatbed-training/types";
import StepNotCompletedMessage from "../../components/StepNotCompletedMessage";

// Helper functions for API calls
async function fetchFlatbedTraining(trackerId: string): Promise<FlatbedTrainingResponse> {
  const response = await fetch(`/api/v1/admin/onboarding/${trackerId}/appraisal/flatbed-training`);
  if (!response.ok) {
    // Check if it's a 401 or 403 error and include the error message
    if (response.status === 401 || response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `${response.status}: ${errorData.message || "Driver hasn't reached this step yet"}`
      );
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

async function patchFlatbedTraining(
  trackerId: string,
  data: any
): Promise<FlatbedTrainingResponse> {
  const response = await fetch(
    `/api/v1/admin/onboarding/${trackerId}/appraisal/flatbed-training`,
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

export default function FlatbedTrainingClient({
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
  const [isSaving, setIsSaving] = useState(false);

  // Direct state management instead of hooks
  const [flatbedData, setFlatbedData] =
    useState<FlatbedTrainingResponse | null>(null);
  const [isFlatbedLoading, setIsFlatbedLoading] =
    useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Staged changes (page-level) - like other contract pages
  const [staged, setStaged] = useState<Record<string, any>>({});

  const hasUnsavedChanges = Object.keys(staged).length > 0;

  const clearStaged = () => setStaged({});

  // Fetch flatbed training data
  useEffect(() => {
    const loadFlatbedTraining = async () => {
      try {
        setIsFlatbedLoading(true);
        setError(null);
        const data = await fetchFlatbedTraining(trackerId);
        setFlatbedData(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load flatbed training'));
      } finally {
        setIsFlatbedLoading(false);
      }
    };

    if (trackerId) {
      loadFlatbedTraining();
    }
  }, [trackerId]);

  // Handle rendering after contract data is loaded
  useEffect(() => {
    if (contractData && !isContractLoading) {
      hideLoader();
      setTimeout(() => {
        setShouldRender(true);
      }, 100);
    }
  }, [contractData, isContractLoading, hideLoader]);

  // Handle save with staging
  const handleSave = async () => {
    if (!hasUnsavedChanges) return;

    try {
      setIsSaving(true);

      const dataToSend = {
        flatbedTraining: staged,
      };

      const result = await patchFlatbedTraining(trackerId, dataToSend);
      setFlatbedData(result);
      clearStaged();
    } catch (err) {
      console.error("Failed to save flatbed training:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle discard
  const handleDiscard = () => {
    clearStaged();
  };

  // Stage changes
  const stageChange = (changes: any) => {
    setStaged((prev) => ({ ...prev, ...changes }));
  };

  // Handle 401/403 errors (step not reached)
  if (error && (error.message.includes("401") || error.message.includes("403"))) {
    return (
      <StepNotCompletedMessage
        stepName="Flatbed Training"
        stepDescription="This page requires the driver to reach the flatbed training step in their onboarding process. Flatbed training is typically available after completing the drive test and is only required for certain application types."
      />
    );
  }

  if (isDashboardLoaderVisible || !shouldRender) {
    return null;
  }

  if (isContractLoading || !contractData || isFlatbedLoading || !flatbedData) {
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
            className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "var(--color-primary)",
              borderWidth: "2px",
            }}
          />
          <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Loading flatbed training...
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Progress Wizard */}
      <DashboardFormWizard contractContext={contractData} />

      {/* Submit bar */}
      <UpdateSubmitBar 
        dirty={hasUnsavedChanges} 
        busy={isSaving} 
        onSubmit={handleSave} 
        onDiscard={handleDiscard} 
      />

      {/* Main Content */}
      <FlatbedTrainingContent
        flatbedTraining={flatbedData.data.flatbedTraining}
        onboardingContext={flatbedData.data.onboardingContext}
        staged={staged}
        onStage={stageChange}
        isEditMode={isEditMode}
      />
    </motion.div>
  );
}
