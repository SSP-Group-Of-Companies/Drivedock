import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import {
  EStepPath,
  IOnboardingStatus,
  IOnboardingTrackerDoc,
  ITrackerContext,
} from "@/types/onboardingTracker.types";

// Start flow routes (before onboarding)
const START_FLOW = ["/start/start-info-page", "/start/company"] as const;

// Canonical onboarding step flow
export const onboardingStepFlow: EStepPath[] = [
  EStepPath.PRE_QUALIFICATIONS,
  EStepPath.APPLICATION_PAGE_1,
  EStepPath.APPLICATION_PAGE_2,
  EStepPath.APPLICATION_PAGE_3,
  EStepPath.APPLICATION_PAGE_4,
  EStepPath.APPLICATION_PAGE_5,
  EStepPath.POLICIES_CONSENTS,
  EStepPath.DRIVE_TEST,
  EStepPath.CARRIERS_EDGE_TRAINING,
  EStepPath.DRUG_TEST,
  EStepPath.flat_bed_training,
];

/** Index helpers */
export function getStepIndex(step: EStepPath): number {
  return onboardingStepFlow.indexOf(step);
}
export function isStepBefore(stepA: EStepPath, stepB: EStepPath): boolean {
  return getStepIndex(stepA) < getStepIndex(stepB);
}
export function isFinalStep(step: EStepPath): boolean {
  return getStepIndex(step) === onboardingStepFlow.length - 1;
}
export function getNextStep(step: EStepPath): EStepPath | null {
  const index = getStepIndex(step);
  return onboardingStepFlow[index + 1] ?? null;
}
export function getPrevStep(step: EStepPath): EStepPath | null {
  const index = getStepIndex(step);
  return onboardingStepFlow[index - 1] ?? null;
}

/**
 * Advance progress after completing a step.
 * - If we're already *ahead* of the completed step, keep currentStep as-is.
 * - Otherwise, move currentStep to the *next* step after the one just completed.
 * - If the completed step is the final step, mark completed and keep currentStep there.
 */
export function advanceProgress(
  previous: IOnboardingStatus,
  completedNow: EStepPath
): IOnboardingStatus {
  const prevIdx = getStepIndex(previous.currentStep);
  const doneIdx = getStepIndex(completedNow);

  // Already ahead of this step → no change
  if (prevIdx > doneIdx) {
    return {
      currentStep: previous.currentStep,
      completed: isFinalStep(previous.currentStep),
    };
  }

  // Move to next step after the one we just completed (or stay if it was final)
  const next = getNextStep(completedNow);
  return {
    currentStep: next ?? completedNow,
    completed: next == null, // no next step means we're done
  };
}

/** Progress / gating checks */
export function hasReachedStep(
  status: IOnboardingStatus,
  step: EStepPath
): boolean {
  return !isStepBefore(status.currentStep, step);
}

/** Build prev/current/next URLs from the authoritative current step */
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

/**
 * Tracker context — always uses the authoritative currentStep
 * (resume behavior = resume at furthest step reached).
 */
export function buildTrackerContext(
  tracker: IOnboardingTrackerDoc,
  defaultStep?: EStepPath
): ITrackerContext {
  const step = defaultStep || tracker.status.currentStep;
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

/** Session expiry */
export function onboardingExpired(
  tracker?: IOnboardingTrackerDoc | null
): boolean {
  if (!tracker?.resumeExpiresAt) return true;
  return new Date() > tracker.resumeExpiresAt;
}

/** Full flow for back-navigation helper (unchanged) */
export function buildFullFlow(trackerId?: string): string[] {
  const onboardingAbs = trackerId
    ? onboardingStepFlow.map((seg) => `/onboarding/${trackerId}/${seg}`)
    : onboardingStepFlow.map((seg) => `/onboarding/${seg}`);
  return [...START_FLOW, ...onboardingAbs];
}

export function findIndexInFlow(flow: string[], pathname: string): number {
  // Exact match first
  let idx = flow.findIndex((p) => p === pathname);
  if (idx !== -1) return idx;
  // Allow nested pages under a step (e.g., .../page-1/extra)
  idx = flow.findIndex((p) => pathname.startsWith(p + "/"));
  return idx;
}

export function handleBackNavigation(
  pathname: string,
  trackerId: string | undefined,
  router: any
): void {
  const fullFlow = buildFullFlow(trackerId);
  const currentIndex = findIndexInFlow(fullFlow, pathname);
  if (currentIndex <= 0) {
    router.push("/");
    return;
  }
  const previousUrl = fullFlow[currentIndex - 1];
  router.push(previousUrl);
}

export function nextResumeExpiry(now = Date.now()): Date {
  return new Date(now + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC));
}
