import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { EStepPath, IOnboardingStatus, IOnboardingTrackerDoc, IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

/**
 * ======================================================================
 * Onboarding Flow Utilities
 * ----------------------------------------------------------------------
 * Provides canonical step ordering, progress advancement,
 * navigation helpers, session expiry checks, and tracker context builders
 * for the onboarding workflow.
 * ======================================================================
 */

/** Explicit flow options (must always be provided by non-doc callers). */
export type FlowOpts = { needsFlatbedTraining: boolean };

/** Helper: derive flow options from the onboarding document (robust). */
export function getFlowOptsFromTracker(tracker: IOnboardingTrackerDoc & { needsFlatbedTraining?: boolean }): FlowOpts {
  // If the current step is flatbed, the flow MUST include flatbed
  const inferredFromStep = tracker?.status?.currentStep === EStepPath.FLATBED_TRAINING;
  const needsFlatbedTraining = Boolean(tracker.needsFlatbedTraining ?? inferredFromStep);
  return { needsFlatbedTraining };
}

/**
 * Pre-onboarding routes (not part of main step flow).
 * Used for flow reconstruction in back-navigation.
 */
const START_FLOW = ["/start/start-info-page", "/start/company"] as const;

/**
 * Canonical base flow for onboarding (without flatbed).
 * Always use `getOnboardingStepFlow` instead of referencing this directly.
 */
const BASE_FLOW: EStepPath[] = [
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
];

/**
 * Get full onboarding step flow.
 * Callers should pass FlowOpts unless the caller is an Onboarding doc (see helpers that accept the doc).
 */
export function getOnboardingStepFlow(opts: FlowOpts): EStepPath[] {
  return opts.needsFlatbedTraining ? [...BASE_FLOW, EStepPath.FLATBED_TRAINING] : BASE_FLOW;
}

/* ----------------------------------------------------------------------
 * Index / Position Helpers
 * --------------------------------------------------------------------*/

/** Get numeric index of a step in the flow. */
export function getStepIndex(step: EStepPath, opts: FlowOpts): number {
  return getOnboardingStepFlow(opts).indexOf(step);
}

/** Returns true if stepA occurs before stepB in the flow. */
export function isStepBefore(stepA: EStepPath, stepB: EStepPath, opts: FlowOpts): boolean {
  const flow = getOnboardingStepFlow(opts);
  return flow.indexOf(stepA) < flow.indexOf(stepB);
}

/** Returns true if the given step is the last step in the flow. */
export function isFinalStep(step: EStepPath, opts: FlowOpts): boolean {
  const flow = getOnboardingStepFlow(opts);
  return flow.indexOf(step) === flow.length - 1;
}

/** Get the step immediately after the given one (or null if final). */
export function getNextStep(step: EStepPath, opts: FlowOpts): EStepPath | null {
  const flow = getOnboardingStepFlow(opts);
  const index = flow.indexOf(step);
  return flow[index + 1] ?? null;
}

/** Get the step immediately before the given one (or null if first). */
export function getPrevStep(step: EStepPath, opts: FlowOpts): EStepPath | null {
  const flow = getOnboardingStepFlow(opts);
  const index = flow.indexOf(step);
  return flow[index - 1] ?? null;
}

/** Convenience: get both neighbors for a step. */
export function getNeighborSteps(step: EStepPath, opts: FlowOpts): { prevStep: EStepPath | null; nextStep: EStepPath | null } {
  return {
    prevStep: getPrevStep(step, opts),
    nextStep: getNextStep(step, opts),
  };
}

/* ----------------------------------------------------------------------
 * Progress Advancement (DOC-AWARE)
 * --------------------------------------------------------------------*/

/**
 * Advance progress after completing a step (doc-aware).
 *
 * Accepts the full onboarding document to:
 * - Read the authoritative current step from `doc.status.currentStep`.
 * - Derive flow options from `doc.needsFlatbedTraining` (no external opts).
 *
 * Rules:
 * - If already *ahead* of this step, do nothing.
 * - Otherwise, move currentStep to the step after the one just completed.
 * - If completing the final step, mark as fully completed.
 */
export function advanceProgress(doc: IOnboardingTrackerDoc & { needsFlatbedTraining?: boolean }, completedNow: EStepPath): IOnboardingStatus {
  const opts = getFlowOptsFromTracker(doc);
  const flow = getOnboardingStepFlow(opts);

  const prevIdx = flow.indexOf(doc.status.currentStep);
  const doneIdx = flow.indexOf(completedNow);

  if (prevIdx > doneIdx) {
    // Already ahead → no change
    return {
      currentStep: doc.status.currentStep,
      completed: isFinalStep(doc.status.currentStep, opts),
    };
  }

  const next = getNextStep(completedNow, opts);
  return {
    currentStep: next ?? completedNow,
    completed: next == null,
  };
}

/* ----------------------------------------------------------------------
 * Reached Step (DOC-AWARE & ROBUST)
 * --------------------------------------------------------------------*/

/**
 * Returns true if the doc has reached (or passed) the target step (doc-aware).
 * Uses `doc.status.currentStep` and derives flow options from the doc.
 *
 * Robustness notes:
 * - If currentStep isn't found in the initial flow (e.g., flatbed missing),
 *   retry with a maximal flow (flatbed included).
 * - If still not found but doc is `completed: true`, treat as reached.
 */
export function hasReachedStep(doc: IOnboardingTrackerDoc, step: EStepPath): boolean {
  const opts = getFlowOptsFromTracker(doc as IOnboardingTrackerDoc & { needsFlatbedTraining?: boolean });
  const flow = getOnboardingStepFlow(opts);

  const targetIdx = flow.indexOf(step);
  if (targetIdx === -1) {
    // Target step not in this flow → not applicable → not reached
    return false;
  }

  let currentIdx = flow.indexOf(doc.status.currentStep);

  if (currentIdx === -1) {
    // Current step not found due to under-inferred options; try maximal flow
    const maximalFlow = getOnboardingStepFlow({ needsFlatbedTraining: true });
    currentIdx = maximalFlow.indexOf(doc.status.currentStep);
  }

  if (currentIdx === -1) {
    // As a final safety net: if the doc is marked completed, treat as reached
    return Boolean(doc.status.completed);
  }

  return currentIdx >= targetIdx;
}

/* ----------------------------------------------------------------------
 * Tracker Context (DOC-AWARE) — UPDATED
 * --------------------------------------------------------------------*/

/**
 * Build a tracker context object (used by frontend onboarding pages).
 * - No URLs (per new IOnboardingTrackerContext).
 * - Provides prev/current/next steps from the doc-aware flow.
 * - Exposes needsFlatbedTraining and a top-level completed boolean.
 */
export function buildTrackerContext(tracker: IOnboardingTrackerDoc, defaultStep?: EStepPath): IOnboardingTrackerContext {
  const step = defaultStep || tracker.status.currentStep;
  const opts = getFlowOptsFromTracker(tracker as IOnboardingTrackerDoc & { needsFlatbedTraining?: boolean });
  const { prevStep, nextStep } = getNeighborSteps(step, opts);

  return {
    id: tracker.id,
    companyId: tracker.companyId,
    applicationType: tracker.applicationType,
    needsFlatbedTraining: opts.needsFlatbedTraining,
    status: tracker.status,
    prevStep,
    nextStep,
  };
}

/**
 * Build the canonical onboarding path for the tracker's current step.
 *
 * Example:
 *   tracker.status.currentStep = EStepPath.APPLICATION_PAGE_2
 *   → "/onboarding/64f3a8.../application-form/page-2"
 *
 * @param tracker Full onboarding tracker document (must include `id` and `status.currentStep`).
 * @returns Absolute onboarding URL string.
 */
export function buildOnboardingStepPath(tracker: IOnboardingTrackerDoc | IOnboardingTrackerContext, defaultStep?: EStepPath): string {
  const step = defaultStep || tracker.status.currentStep;
  return `/onboarding/${tracker.id}/${step}`;
}

/* ----------------------------------------------------------------------
 * Session Expiry
 * --------------------------------------------------------------------*/

/** Returns true if the resume session has expired for this tracker. */
export function onboardingExpired(tracker?: IOnboardingTrackerDoc | null): boolean {
  if (!tracker?.resumeExpiresAt) return true;
  return new Date() > tracker.resumeExpiresAt;
}

/* ----------------------------------------------------------------------
 * Back-Navigation Helpers (still URL-based for router use)
 * --------------------------------------------------------------------*/

/** Build the full flow of routes (including start pages). */
export function buildFullFlow(trackerId: string | undefined, opts: FlowOpts): string[] {
  const flow = getOnboardingStepFlow(opts);
  const onboardingAbs = trackerId ? flow.map((seg) => `/onboarding/${trackerId}/${seg}`) : flow.map((seg) => `/onboarding/${seg}`);
  return [...START_FLOW, ...onboardingAbs];
}

/** Find the index of a pathname in the flow (supports nested URLs). */
export function findIndexInFlow(flow: string[], pathname: string): number {
  const idx = flow.findIndex((p) => p === pathname);
  if (idx !== -1) return idx;
  return flow.findIndex((p) => pathname.startsWith(p + "/"));
}

/**
 * Handle back-navigation:
 * - Pushes router to previous step in flow if available
 * - Otherwise redirects to root ("/").
 */
export function handleBackNavigation(pathname: string, trackerId: string | undefined, router: any, opts: FlowOpts): void {
  const fullFlow = buildFullFlow(trackerId, opts);
  const currentIndex = findIndexInFlow(fullFlow, pathname);

  // handle edge cases for unconventional pathnames not matching with step flow
  if (currentIndex <= 0) {
    // if on application-form, go back to prequalifications
    if (pathname === "/onboarding/application-form") return router.push(fullFlow[2]);

    // else go to homepage
    return router.push("/");
  }
  const previousUrl = fullFlow[currentIndex - 1];
  router.push(previousUrl);
}

/* ----------------------------------------------------------------------
 * Resume Expiry
 * --------------------------------------------------------------------*/

/**
 * Compute next resume expiry timestamp.
 * Uses configured timeout (`FORM_RESUME_EXPIRES_AT_IN_MILSEC`).
 */
export function nextResumeExpiry(now = Date.now()): Date {
  return new Date(now + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC));
}
