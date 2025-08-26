"use client";

import { useSafetyProcessing } from "@/hooks/dashboard/contract/useSafetyProcessing";
import CarriersEdgeCard from "./components/CarriersEdgeCard";
import DrugTestCard from "./components/DrugTestCard";
import DriveTestCard from "./components/DriveTestCard";
import NotesCard from "./components/NotesCard";
import DashboardFormWizard from "../components/DashboardFormWizard";
import { computeSafetyGates } from "@/lib/dashboard/utils/stepGating";

export default function SafetyProcessingClient({
  trackerId,
}: {
  trackerId: string;
}) {
  const { data, isLoading, isError, error, mutate } =
    useSafetyProcessing(trackerId);

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        <div className="font-semibold">Failed to load Safety Processing</div>
        <div className="text-sm opacity-80">{(error as Error)?.message}</div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div
        className="rounded-xl border p-6"
        style={{
          borderColor: "var(--color-outline)",
          background: "var(--color-card)",
        }}
      >
        Loading…
      </div>
    );
  }

  const ctx = data.onboardingContext;
  const ce = data.carriersEdge ?? {};
  const dt = data.drugTest ?? {};
  const drv = data.driveTest ?? {};

  // step gating (one source of truth)
  const gates = computeSafetyGates({
    currentStep: ctx.status?.currentStep,
    needsFlatbedTraining: !!ctx.needsFlatbedTraining,
    completed: ctx.status?.completed,
  });

  return (
    <div className="space-y-4">
      {/* Form Wizard Progress */}
      <DashboardFormWizard contractContext={ctx} />

      {/* Cards grid (responsive 2x2 on desktop) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DriveTestCard
          trackerId={trackerId}
          driveTest={drv}
          canEdit={gates.canEditDriveTest}
        />

        <CarriersEdgeCard
          trackerId={trackerId}
          driverEmail={ctx.itemSummary?.driverEmail}
          carriersEdge={ce as any}
          canEdit={gates.canEditCarriersEdge}
          onPatch={(payload) =>
            mutate.mutateAsync({ carriersEdgeTraining: payload })
          }
        />
        <DrugTestCard
          trackerId={trackerId}
          drugTest={dt as any}
          canEdit={gates.canEditDrugTest}
          onPatch={(payload) => mutate.mutateAsync({ drugTest: payload })}
        />

        <NotesCard
          notes={ctx.notes ?? ""}
          onSave={(notes) => mutate.mutate({ notes })}
        />
      </div>
    </div>
  );
}
