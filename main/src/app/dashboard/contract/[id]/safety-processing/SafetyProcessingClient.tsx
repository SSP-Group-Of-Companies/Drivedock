"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useSafetyProcessing } from "@/hooks/dashboard/contract/useSafetyProcessing";
import { useContract } from "@/hooks/dashboard/contract/useContract";
import { useDashboardPageLoading } from "@/hooks/useDashboardPageLoading";
import { useDashboardLoading } from "@/store/useDashboardLoading";
import CarriersEdgeCard from "./components/CarriersEdgeCard";
import DrugTestCard from "./components/DrugTestCard";
import DriveTestCard from "./components/DriveTestCard";
import NotesCard from "./components/NotesCard";
import UpdateSubmitBar from "./components/UpdateSubmitBar";
import DashboardFormWizard from "../components/DashboardFormWizard";
import { computeSafetyGates } from "@/lib/dashboard/utils/stepGating";

import type { SafetyPatchBody, CarriersEdgeBlock, DrugTestBlock } from "@/lib/dashboard/api/safetyProcessing";

export default function SafetyProcessingClient({ trackerId }: { trackerId: string }) {
  const searchParams = useSearchParams();
  const { data, isLoading, isError, error, mutate } = useSafetyProcessing(trackerId);
  const { data: contractData, isLoading: isContractLoading } = useContract(trackerId);
  const { hideLoader } = useDashboardPageLoading();
  const { isVisible: isDashboardLoaderVisible } = useDashboardLoading();
  const [shouldRender, setShouldRender] = useState(false);

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

  // ---------------- Staged changes (page-level) ----------------
  const [staged, setStaged] = useState<SafetyPatchBody>({});

  const isDirty = useMemo(() => {
    const s = staged;
    if (!s) return false;
    if (typeof s.notes === "string" && s.notes.trim() !== "") return true;
    if (s.carriersEdgeTraining) return true;
    if (s.drugTest) return true;
    return false;
  }, [staged]);

  const clearStaged = () => setStaged({});

  // Merge helpers: prefer staged values, fall back to server
  function mergeCEView(server: CarriersEdgeBlock | undefined, stagedCE?: SafetyPatchBody["carriersEdgeTraining"]): CarriersEdgeBlock {
    return {
      emailSent: stagedCE?.emailSent ?? server?.emailSent,
      emailSentBy: stagedCE?.emailSentBy ?? server?.emailSentBy,
      emailSentAt: (stagedCE?.emailSentAt as string | undefined) ?? server?.emailSentAt,
      completed: stagedCE?.completed ?? server?.completed,
      certificates: stagedCE?.certificates ?? server?.certificates ?? [],
    };
  }

  function mergeDTView(server: DrugTestBlock | undefined, stagedDT?: SafetyPatchBody["drugTest"]): DrugTestBlock {
    return {
      status: stagedDT?.status ?? server?.status,
      documents: stagedDT?.documents ?? server?.documents,
    };
  }

  // ---------------- Fetch states ----------------
  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        <div className="font-semibold">Failed to load Safety Processing</div>
        <div className="text-sm opacity-80">{(error as Error)?.message}</div>
      </div>
    );
  }

  // Don't render anything while dashboard loader is visible or before transition is complete
  if (isDashboardLoaderVisible || !shouldRender) {
    return null;
  }

  // Show loading state for safety processing data while layout is visible
  if (isLoading || !data) {
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
            Loading Safety Processing...
          </span>
        </div>
      </div>
    );
  }

  const ctx = data.onboardingContext;
  const ceServer = (data.carriersEdge ?? {}) as CarriersEdgeBlock;
  const dtServer = (data.drugTest ?? {}) as DrugTestBlock;

  const ceView = mergeCEView(ceServer, staged.carriersEdgeTraining);
  const dtView = mergeDTView(dtServer, staged.drugTest);

  // step gating (one source of truth)
  const gates = computeSafetyGates({
    currentStep: ctx.status?.currentStep,
    needsFlatbedTraining: !!ctx.needsFlatbedTraining,
    completed: ctx.status?.completed,
  });

  // Check if we should highlight the Carrier's Edge card
  const shouldHighlightCarriersEdge = searchParams.get("highlight") === "carriers-edge";
  
  // Check if we should highlight the Drug Test card
  const shouldHighlightDrugTest = searchParams.get("highlight") === "drug-test";

  // ---------------- Stage updaters ----------------
  const stageCE = (partial: Partial<CarriersEdgeBlock>) =>
    setStaged((prev) => ({
      ...prev,
      carriersEdgeTraining: {
        ...(prev.carriersEdgeTraining ?? {}),
        ...partial,
      },
    }));

  const stageDT = (partial: Partial<DrugTestBlock>) =>
    setStaged((prev) => ({
      ...prev,
      drugTest: {
        ...(prev.drugTest ?? {}),
        ...partial,
      },
    }));

  const stageNotes = (notes: string) =>
    setStaged((prev) => ({
      ...prev,
      notes,
    }));

  // ---------------- Submit all staged changes ----------------
  async function handleSubmit() {
    if (!isDirty) return;
    await mutate.mutateAsync(staged);
    clearStaged();
  }

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

      {/* Submit bar */}
      <UpdateSubmitBar dirty={isDirty} busy={mutate.isPending} onSubmit={handleSubmit} onDiscard={clearStaged} />

      {/* Cards grid (responsive 2x2 on desktop) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DriveTestCard
          trackerId={trackerId}
          driveTest={data.driveTest as any}
          canEdit={gates.canEditDriveTest}
          // (Drive test remains read-only here; wire later if needed)
        />

        <CarriersEdgeCard
          trackerId={trackerId}
          driverEmail={ctx.itemSummary?.driverEmail}
          carriersEdge={ceView}
          canEdit={gates.canEditCarriersEdge}
          onChange={stageCE}
          highlight={shouldHighlightCarriersEdge}
        />

        <DrugTestCard 
          trackerId={trackerId} 
          drugTest={dtView} 
          canEdit={gates.canEditDrugTest} 
          onChange={(partial) => stageDT(partial)}
          highlight={shouldHighlightDrugTest}
        />

        <NotesCard
          notes={staged.notes ?? ctx.notes ?? ""}
          // stage notes, no immediate patch
          onSave={(value) => stageNotes(value)}
        />
      </div>
    </motion.div>
  );
}
