"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import {
  useFlatbedTraining,
  useUpdateFlatbedTraining,
} from "@/hooks/dashboard/contract/useFlatbedTraining";
import { useDashboardPageLoading } from "@/hooks/useDashboardPageLoading";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import DashboardFormWizard from "../../components/DashboardFormWizard";
import { useEditMode } from "../../components/EditModeContext";
import { FlatbedTrainingContent, UpdateSubmitBar } from "./components";
import StepNotCompletedMessage from "../../components/StepNotCompletedMessage";

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

  // React Query hooks
  const {
    data: flatbedData,
    isLoading: isFlatbedLoading,
    error,
    isError,
  } = useFlatbedTraining(trackerId);

  const updateMutation = useUpdateFlatbedTraining(trackerId);

  // Staged changes (page-level) - like other contract pages
  const [staged, setStaged] = useState<Record<string, any>>({});

  const hasUnsavedChanges = Object.keys(staged).length > 0;

  const clearStaged = () => setStaged({});

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

    const dataToSend = {
      flatbedTraining: staged,
    };

    try {
      await updateMutation.mutateAsync(dataToSend);
      clearStaged();
    } catch (err) {
      console.error("Failed to save flatbed training:", err);
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
  if (
    isError &&
    error &&
    (error.message.includes("401") || error.message.includes("403"))
  ) {
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
          <p
            className="text-sm"
            style={{ color: "var(--color-on-surface-variant)" }}
          >
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
        busy={updateMutation.isPending}
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
