import {
  EStepPath,
  IOnboardingStatus,
  IOnboardingTrackerDoc,
  ITrackerContext,
} from "@/types/onboardingTracker.type";

// Canonical onboarding step flow
export const onboardingStepFlow: EStepPath[] = [
  EStepPath.PRE_QUALIFICATIONS,
  EStepPath.APPLICATION_PAGE_1,
  EStepPath.APPLICATION_PAGE_2,
  EStepPath.APPLICATION_PAGE_3,
  EStepPath.APPLICATION_PAGE_4,
  EStepPath.APPLICATION_PAGE_5,
  EStepPath.POLICIES_CONSENTS,
  EStepPath.DRIVING_TEST,
  EStepPath.CARRIER_EDGE,

];

/**
 * Returns the index of a step within the onboarding flow
 */
export function getStepIndex(step: EStepPath): number {
  return onboardingStepFlow.indexOf(step);
}

/**
 * Compares if stepA comes before stepB in the flow
 */
export function isStepBefore(stepA: EStepPath, stepB: EStepPath): boolean {
  return getStepIndex(stepA) < getStepIndex(stepB);
}

/**
 * Checks if a step is the final step
 */
export function isFinalStep(step: EStepPath): boolean {
  return getStepIndex(step) === onboardingStepFlow.length - 1;
}

/**
 * Get the previous and next onboarding step paths for the onboarding process
 */
export function getOnboardingStepPaths(
  currentStep: EStepPath,
  onboardingId: string
): {
  nextUrl: string | null;
  currentUrl: string | null;
  prevUrl: string | null;
} {
  const index = getStepIndex(currentStep);

  const prevStep = onboardingStepFlow[index - 1] ?? null;
  const nextStep = onboardingStepFlow[index + 1] ?? null;

  return {
    prevUrl: prevStep ? `/onboarding/${onboardingId}/${prevStep}` : null,
    currentUrl: `/onboarding/${onboardingId}/${currentStep}`,
    nextUrl: nextStep ? `/onboarding/${onboardingId}/${nextStep}` : null,
  };
}

export function buildTrackerContext(
  tracker: IOnboardingTrackerDoc,
  currentStepOverride?: EStepPath
): ITrackerContext {
  const step = currentStepOverride ?? tracker.status.currentStep;
  const { prevUrl, nextUrl } = getOnboardingStepPaths(step, tracker.id);

  return {
    id: tracker.id,
    companyId: tracker.companyId,
    applicationType: tracker.applicationType,
    status: tracker.status,
    prevUrl,
    nextUrl,
  };
}

/**
 * Gets the next step in the flow, or null if at the end
 */
export function getNextStep(step: EStepPath): EStepPath | null {
  const index = getStepIndex(step);
  return onboardingStepFlow[index + 1] ?? null;
}

/**
 * Gets the previous step in the flow, or null if at the beginning
 */
export function getPrevStep(step: EStepPath): EStepPath | null {
  const index = getStepIndex(step);
  return onboardingStepFlow[index - 1] ?? null;
}

/**
 * Returns the later (higher) step between two steps in the onboarding flow
 */
export function getHigherStep(stepA: EStepPath, stepB: EStepPath): EStepPath {
  return getStepIndex(stepA) >= getStepIndex(stepB) ? stepA : stepB;
}

/**
 * Returns the last (final) step in the onboarding flow
 */
export function getLastStep(): EStepPath {
  return onboardingStepFlow[onboardingStepFlow.length - 1];
}

/**
 * Advances the onboarding status object given the latest completed step.
 * Ensures completedStep reflects the highest step, and currentStep does not exceed the last step.
 *
 * @param previousStatus - The existing onboarding status object
 * @param completedStep - The step that was just completed (even if it's a previous one)
 * @returns An updated status object with currentStep, completedStep, and completed flag
 */
export function advanceStatus(
  previousStatus: IOnboardingStatus,
  completedStep: EStepPath
): IOnboardingStatus {
  const updatedCompletedStep = getHigherStep(
    previousStatus.completedStep,
    completedStep
  );
  const nextStep = getNextStep(completedStep);
  const isLastStep = !nextStep;

  return {
    completedStep: updatedCompletedStep,
    currentStep: isLastStep ? completedStep : nextStep,
    completed: isLastStep,
  };
}

/**
 * Returns true if the tracker has completed the given step
 */
export function hasCompletedStep(
  status: IOnboardingStatus,
  step: EStepPath
): boolean {
  return getStepIndex(status.completedStep) >= getStepIndex(step);
}

/**
 * Determines whether the onboarding session has expired.
 * @param tracker - The onboarding tracker document
 * @returns true if the resume session is expired or missing, false otherwise
 */
export function onboardingExpired(
  tracker?: IOnboardingTrackerDoc | null
): boolean {
  if (!tracker?.resumeExpiresAt) return true;
  return new Date() > tracker.resumeExpiresAt;
}
