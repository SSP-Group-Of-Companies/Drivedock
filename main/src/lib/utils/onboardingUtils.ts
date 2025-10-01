import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { EStepPath, IOnboardingStatus, IOnboardingTrackerDoc, IOnboardingTrackerContext, IOnboardingTracker } from "@/types/onboardingTracker.types";

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

/** Unified helper: derive flow options from any source that may carry the flag. */
type MaybeFlatbed = { needsFlatbedTraining?: boolean };
export function getFlowOpts(src: MaybeFlatbed): FlowOpts {
  return { needsFlatbedTraining: Boolean(src.needsFlatbedTraining) };
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

/**
 * Advance progress after completing a step (doc-aware, flow-robust).
 *
 * If the doc's currentStep no longer exists in the new flow (e.g., flatbed
 * removed after flipping needsFlatbedTraining → false), we map it to the
 * nearest *previous* surviving step in the new flow (e.g., FLATBED_TRAINING → DRUG_TEST).
 * Then we apply the usual advancement rules.
 *
 * completionDate rules:
 *  - If the resulting status is completed, set completionDate to the existing one (if any) or now.
 *  - If the resulting status is not completed, omit completionDate (clears old value).
 */
export function advanceProgress(doc: IOnboardingTrackerDoc, completedNow: EStepPath): IOnboardingStatus {
  const opts = getFlowOpts(doc);
  const flow = getOnboardingStepFlow(opts);
  const maximalFlow = getOnboardingStepFlow({ needsFlatbedTraining: true });

  const doneIdx = flow.indexOf(completedNow);

  // Map currentStep to the closest surviving step in the *new* flow
  // (at or before its position in the maximal flow).
  const mapCurrentAcrossFlows = (currentStep: EStepPath): { idx: number; step: EStepPath | null } => {
    // Fast path: still present
    const directIdx = flow.indexOf(currentStep);
    if (directIdx !== -1) return { idx: directIdx, step: currentStep };

    // Find its position in the maximal flow
    const curMaxIdx = maximalFlow.indexOf(currentStep);
    if (curMaxIdx === -1) {
      // If we can't even place it, treat as "before start" (or completed).
      if (doc.status.completed) {
        const last = flow[flow.length - 1] ?? null;
        return { idx: last ? flow.length - 1 : -1, step: last };
      }
      return { idx: -1, step: null };
    }

    // Walk backward to nearest surviving step
    for (let i = curMaxIdx; i >= 0; i--) {
      const candidate = maximalFlow[i] as EStepPath;
      const idxInNew = flow.indexOf(candidate);
      if (idxInNew !== -1) return { idx: idxInNew, step: candidate };
    }

    return { idx: -1, step: null };
  };

  const { idx: prevIdx, step: mappedCurrentStep } = mapCurrentAcrossFlows(doc.status.currentStep);

  // If already ahead of the completed step, keep the (mapped) current step.
  if (prevIdx > doneIdx) {
    const isCompleted = doc.status.completed;
    const result = {
      currentStep: (mappedCurrentStep ?? doc.status.currentStep) as EStepPath,
      completed: isCompleted,
      // Set completionDate only when actually completed
      ...(isCompleted && {
        completionDate: doc.status.completionDate ?? new Date(),
      }),
    };

    return result;
  }

  // Otherwise move forward normally
  const next = getNextStep(completedNow, opts);
  const isNowCompleted = next == null;

  const result = {
    currentStep: (next ?? completedNow) as EStepPath,
    completed: isNowCompleted,
    // Set completionDate only when actually completed
    ...(isNowCompleted && {
      completionDate: doc.status.completionDate ?? new Date(),
    }),
  };

  return result;
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
  const opts = getFlowOpts(doc);
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

/**
 * ----------------------------------------------------------------------
 * hasCompletedStep (DOC-AWARE)
 * ----------------------------------------------------------------------
 * Returns true if the given step has been completed.
 *
 * Logic:
 * - If the tracker has reached the step immediately after `step`,
 *   then `step` is considered completed.
 * - If `step` is the final step in the flow, fall back to the
 *   tracker’s `status.completed` flag.
 * - If `step` is not part of this tracker’s flow (e.g. flatbed not required),
 *   it is treated as not completed.
 *
 * Usage:
 *   hasCompletedStep(tracker, EStepPath.APPLICATION_PAGE_2)
 */
export function hasCompletedStep(doc: IOnboardingTrackerDoc, step: EStepPath): boolean {
  const opts = getFlowOpts(doc);
  const flow = getOnboardingStepFlow(opts);

  const stepIdx = flow.indexOf(step);
  if (stepIdx === -1) {
    // Step not applicable for this tracker → not completed
    return false;
  }

  const next = flow[stepIdx + 1];
  if (!next) {
    // Final step: rely on tracker’s completed flag
    return Boolean(doc.status.completed);
  }

  return hasReachedStep(doc, next);
}

/* ----------------------------------------------------------------------
 * Tracker Context (DOC-AWARE)
 * --------------------------------------------------------------------*/

/**
 * Build a tracker context object (used by frontend onboarding pages).
 * - No URLs (per new IOnboardingTrackerContext).
 * - Provides prev/current/next steps from the doc-aware flow.
 * - Exposes needsFlatbedTraining and a top-level completed boolean.
 */
export function buildTrackerContext(tracker: IOnboardingTrackerDoc | IOnboardingTracker, defaultStep?: EStepPath | null, includeAdminData = false): IOnboardingTrackerContext {
  const step = defaultStep || tracker.status.currentStep;
  const opts = getFlowOpts(tracker);
  const { prevStep, nextStep } = getNeighborSteps(step, opts);

  const context: IOnboardingTrackerContext = {
    id: tracker.id,
    companyId: tracker.companyId,
    applicationType: tracker.applicationType,
    needsFlatbedTraining: opts.needsFlatbedTraining,
    status: tracker.status,
    invitationApproved: tracker.invitationApproved,
    completionLocation: tracker.completionLocation,
    locationPermissionGranted: tracker.locationPermissionGranted,
    prevStep,
    nextStep,
  };

  if (includeAdminData) {
    context.notes = tracker.notes;
    // Note: itemSummary will be added by the API route that calls this function
    // since it needs to fetch from related ApplicationForm documents
  }

  return context;
}

/**
 * Build the canonical onboarding path for the tracker's current (or provided) step.
 *
 * Example:
 *   tracker.status.currentStep = EStepPath.APPLICATION_PAGE_2
 *   → "/onboarding/64f3a8.../application-form/page-2"
 */
export function buildOnboardingStepPath(tracker: IOnboardingTrackerDoc | IOnboardingTrackerContext, defaultStep?: EStepPath): string {
  if (!tracker.invitationApproved) return `/onboarding/${tracker.id}/pending-approval`;
  const step = defaultStep || tracker.status.currentStep;
  return `/onboarding/${tracker.id}/${step}`;
}

/**
 * Build the onboarding path for the NEXT step relative to `tracker.status.currentStep`
 * (or `fromStep` if provided). If there is no next step, return the current step path.
 */
export function buildOnboardingNextStepPath(tracker: IOnboardingTrackerDoc | IOnboardingTrackerContext, fromStep?: EStepPath): string {
  const step = fromStep || tracker.status.currentStep;
  const opts = getFlowOpts(tracker);
  const next = getNextStep(step, opts) ?? step;
  return buildOnboardingStepPath(tracker, next);
}

/**
 * Build the onboarding path for the PREVIOUS step relative to `tracker.status.currentStep`
 * (or `fromStep` if provided). If there is no previous step, return the current step path.
 */
export function buildOnboardingPrevStepPath(tracker: IOnboardingTrackerDoc | IOnboardingTrackerContext, fromStep?: EStepPath): string {
  const step = fromStep || tracker.status.currentStep;
  const opts = getFlowOpts(tracker);
  const prev = getPrevStep(step, opts) ?? step;
  return buildOnboardingStepPath(tracker, prev);
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
  const onboardingAbs = flow.map((seg) => (trackerId ? `/onboarding/${trackerId}/${seg}` : `/onboarding/${seg}`));
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

/**
 * Check if application invitation is approved
 */
export function isInvitationApproved(tracker: IOnboardingTrackerDoc): boolean {
  return tracker.invitationApproved === true;
}
