import { getOnboardingStepFlow } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";

/**
 * Computes which Safety cards can be edited based on the driver's current step.
 * - We enable when the driver has REACHED that step (>=), and the tracker is not completed.
 */
export function computeSafetyGates(opts: {
  currentStep?: EStepPath;
  needsFlatbedTraining?: boolean;
  completed?: boolean;
}) {
  const flow = getOnboardingStepFlow({
    needsFlatbedTraining: !!opts.needsFlatbedTraining,
  });

  const currentIdx = flow.indexOf(opts.currentStep ?? flow[0]);
  const idxDrive = flow.indexOf(EStepPath.DRIVE_TEST);
  const idxCE = flow.indexOf(EStepPath.CARRIERS_EDGE_TRAINING);
  const idxDT = flow.indexOf(EStepPath.DRUG_TEST);

  const notDone = opts.completed !== true;
  const canEditDriveTest = notDone && currentIdx >= idxDrive && idxDrive >= 0;
  const canEditCarriersEdge = notDone && currentIdx >= idxCE && idxCE >= 0;
  const canEditDrugTest = notDone && currentIdx >= idxDT && idxDT >= 0;

  return {
    canEditDriveTest,
    canEditCarriersEdge,
    canEditDrugTest,
    indices: { currentIdx, idxDrive, idxCE, idxDT },
  };
}
