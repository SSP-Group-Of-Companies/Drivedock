"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import { useFlatbedTraining, useUpdateFlatbedTraining } from "@/hooks/dashboard/contract/useFlatbedTraining";
import { useDashboardPageLoading } from "@/hooks/useDashboardPageLoading";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import DashboardFormWizard from "../../components/DashboardFormWizard";
import { useEditMode } from "../../components/EditModeContext";
import { FlatbedTrainingContent, UpdateSubmitBar } from "./components";
import StepNotCompletedMessage from "../../components/StepNotCompletedMessage";
import type { IFileAsset } from "@/types/shared.types";

type StagedFlatbed = {
  flatbedCertificate?: IFileAsset;
  completed?: boolean;
};

export default function FlatbedTrainingClient({ trackerId }: { trackerId: string }) {
  const { data: contractData, isLoading: isContractLoading } = useContract(trackerId);
  const { hideLoader } = useDashboardPageLoading();
  const { isVisible: isDashboardLoaderVisible } = useDashboardLoading();
  const [shouldRender, setShouldRender] = useState(false);
  const { isEditMode } = useEditMode();

  const { data: flatbedData, isLoading: isFlatbedLoading, error, isError } = useFlatbedTraining(trackerId);
  const updateMutation = useUpdateFlatbedTraining(trackerId);

  const [staged, setStaged] = useState<StagedFlatbed>({});
  const clearStaged = () => setStaged({});

  useEffect(() => {
    if (contractData && !isContractLoading) {
      hideLoader();
      const t = setTimeout(() => setShouldRender(true), 100);
      return () => clearTimeout(t);
    }
  }, [contractData, isContractLoading, hideLoader]);

  const stageChange = (changes: Partial<StagedFlatbed>) => {
    setStaged((prev) => ({ ...prev, ...changes }));
  };

  const handleSave = async () => {
    // strict: must include a *new* certificate AND completed true
    const cert = staged.flatbedCertificate;
    const willBeCompleted = completedAtLoad ? true : staged.completed === true;

    if (!cert || !willBeCompleted) {
      const e: any = new Error("To submit, upload a certificate and check 'completed'.");
      e.displayMessage = "To submit, upload a certificate and check 'completed'.";
      throw e;
    }

    const payload = {
      flatbedTraining: {
        completed: true, // always true per new contract
        flatbedCertificate: cert, // must be provided on every PATCH
      },
    };

    await updateMutation.mutateAsync(payload);
    clearStaged();
  };

  if (isError && error && (error.message.includes("401") || error.message.includes("403"))) {
    return (
      <StepNotCompletedMessage
        stepName="Flatbed Training"
        stepDescription="This page requires the driver to reach the flatbed training step in their onboarding process. Flatbed training is typically available after completing the drive test and is only required for certain application types."
      />
    );
  }

  if (isDashboardLoaderVisible || !shouldRender) return null;

  if (isContractLoading || !contractData || isFlatbedLoading || !flatbedData) {
    return (
      <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--color-outline)", background: "var(--color-card)" }}>
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent" style={{ borderTopColor: "var(--color-primary)", borderWidth: "2px" }} />
          <p className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Loading flatbed training...
          </p>
        </div>
      </div>
    );
  }

  const ctx = flatbedData.data.onboardingContext;
  const serverFlatbed = flatbedData.data.flatbedTraining ?? null;

  // completed-state at load
  const completedAtLoad = !!serverFlatbed?.completed;

  const view = {
    completed: staged.completed ?? serverFlatbed?.completed ?? false,
    flatbedCertificate:
      staged.flatbedCertificate ?? (Array.isArray(serverFlatbed?.flatbedCertificates) && serverFlatbed!.flatbedCertificates.length > 0 ? serverFlatbed!.flatbedCertificates[0] : undefined),
  };

  // STRICT submit gating:
  // - must upload a NEW certificate (staged.flatbedCertificate)
  // - must have completion checked (or loaded completed)
  const canSubmit = Boolean(staged.flatbedCertificate && (completedAtLoad || staged.completed === true));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <DashboardFormWizard contractContext={contractData} />

      {/* Only show as dirty when it satisfies submit conditions */}
      <UpdateSubmitBar dirty={canSubmit} busy={updateMutation.isPending} onSubmit={handleSave} onDiscard={clearStaged} />

      <FlatbedTrainingContent trackerId={trackerId} onboardingContext={ctx} view={view} onStage={stageChange} isEditMode={isEditMode} completedAtLoad={completedAtLoad} />
    </motion.div>
  );
}
