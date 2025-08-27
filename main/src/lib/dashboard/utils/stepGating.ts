import { getOnboardingStepFlow } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";

type Args = Readonly<{
  currentStep?: EStepPath;
  needsFlatbedTraining: boolean;
  completed?: boolean; // no longer used to lock cards
}>;

export function computeSafetyGates({
  currentStep,
  needsFlatbedTraining,
}: Args) {
  // Build the canonical step flow for this tracker
  const flow = getOnboardingStepFlow({ needsFlatbedTraining });

  // Where are we right now in that flow?
  const currentIdx = currentStep ? flow.indexOf(currentStep) : -1;

  // Has the tracker reached (or passed) a given step?
  const reached = (step: EStepPath) => {
    const idx = flow.indexOf(step);
    if (idx < 0) return false; // step not in flow (defensive)
    return currentIdx >= idx;
  };

  // Cards are editable once their step is reached.
  // We DO NOT lock them just because the tracker is "completed".
  // Irreversible fields are enforced at the API (e.g., cannot un-send email, cannot un-complete CE, cannot move away from APPROVED, etc.)
  const canEditDriveTest = reached(EStepPath.DRIVE_TEST);
  const canEditCarriersEdge = reached(EStepPath.CARRIERS_EDGE_TRAINING);
  const canEditDrugTest = reached(EStepPath.DRUG_TEST);

  return {
    canEditDriveTest,
    canEditCarriersEdge,
    canEditDrugTest,
    // useful helpers if needed elsewhere:
    reached,
    currentIdx,
    flow,
  };
}
