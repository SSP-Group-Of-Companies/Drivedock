// src/app/onboarding/hooks/useActiveOnboardingStep.ts
"use client";

import { usePathname } from "next/navigation";
import { EStepPath } from "@/types/onboardingTracker.types";

/** Convert a fine-grained step path to the 1..6/7 macro step used by the wizard. */
function toMacroStep(step?: EStepPath | null): number {
  switch (step) {
    case EStepPath.PRE_QUALIFICATIONS:
      return 1;
    case EStepPath.APPLICATION_PAGE_1:
    case EStepPath.APPLICATION_PAGE_2:
    case EStepPath.APPLICATION_PAGE_3:
    case EStepPath.APPLICATION_PAGE_4:
    case EStepPath.APPLICATION_PAGE_5:
      return 2;
    case EStepPath.POLICIES_CONSENTS:
      return 3;
    case EStepPath.DRIVE_TEST:
      return 4; // Drive Test is step 4
    case EStepPath.CARRIERS_EDGE_TRAINING:
      return 5; // Carriers Edge is step 5
    case EStepPath.DRUG_TEST:
      return 6;
    case EStepPath.FLATBED_TRAINING:
      return 7;
    default:
      return 0;
  }
}

/** 0/20/40/60/80/100% when on application-form pages; otherwise 0. */
function applicationConnectorPercent(step?: EStepPath | null): number {
  switch (step) {
    case EStepPath.APPLICATION_PAGE_1:
      return 20;
    case EStepPath.APPLICATION_PAGE_2:
      return 40;
    case EStepPath.APPLICATION_PAGE_3:
      return 60;
    case EStepPath.APPLICATION_PAGE_4:
      return 80;
    case EStepPath.APPLICATION_PAGE_5:
      return 100;
    default:
      return 0;
  }
}

/** Single-segment step tokens (excluding application-form which is multi-segment). */
const SINGLE_SEGMENT_STEPS = new Set<string>([
  EStepPath.PRE_QUALIFICATIONS, // "prequalifications"
  EStepPath.POLICIES_CONSENTS, // "policies-consents"
  EStepPath.DRIVE_TEST, // "drive-test"
  EStepPath.CARRIERS_EDGE_TRAINING, // "carriers-edge-training"
  EStepPath.DRUG_TEST, // "drug-test"
  EStepPath.FLATBED_TRAINING, // "flatbed-training"
]);

function parseActiveStepFromPath(pathname: string | null): EStepPath | null {
  if (!pathname) return null;

  // e.g.
  // /onboarding/prequalifications
  // /onboarding/application-form
  // /onboarding/application-form/page-2
  // /onboarding/68922a.../application-form/page-1
  // /onboarding/68922a.../policies-consents
  const parts = pathname.split("/").filter(Boolean);
  const i = parts.indexOf("onboarding");
  if (i < 0) return null;

  // After "onboarding", we may have either:
  //   - [step ...] (no-id branch), OR
  //   - [id, step ...] (id branch)
  let rest = parts.slice(i + 1);

  if (rest.length === 0) return null;

  // If the first token is NOT a step token ("application-form" or a single-segment step),
  // treat it as an ID and skip it.
  const first = rest[0];
  const isFirstStepToken = first === "application-form" || SINGLE_SEGMENT_STEPS.has(first);
  if (!isFirstStepToken) {
    rest = rest.slice(1);
    if (rest.length === 0) return null;
  }

  // Now parse the step from `rest`
  if (rest[0] === "application-form") {
    // Handle missing page segment in (noid) route; default to page-1 (20%)
    const page = rest[1] ?? "page-1";
    const candidate = `application-form/${page}` as EStepPath;
    const valid = new Set<EStepPath>([EStepPath.APPLICATION_PAGE_1, EStepPath.APPLICATION_PAGE_2, EStepPath.APPLICATION_PAGE_3, EStepPath.APPLICATION_PAGE_4, EStepPath.APPLICATION_PAGE_5]);
    return valid.has(candidate) ? candidate : EStepPath.APPLICATION_PAGE_1; // fallback to page-1
  }

  // Single-segment steps
  const single = rest[0] as EStepPath;
  return SINGLE_SEGMENT_STEPS.has(single) ? single : null;
}

export function useActiveOnboardingStep() {
  const pathname = usePathname();

  const activeStep = parseActiveStepFromPath(pathname);
  const activeMacro = toMacroStep(activeStep);
  const isInApplication =
    activeStep === EStepPath.APPLICATION_PAGE_1 ||
    activeStep === EStepPath.APPLICATION_PAGE_2 ||
    activeStep === EStepPath.APPLICATION_PAGE_3 ||
    activeStep === EStepPath.APPLICATION_PAGE_4 ||
    activeStep === EStepPath.APPLICATION_PAGE_5;

  const appPercent = applicationConnectorPercent(activeStep);

  return {
    pathname: pathname || "",
    activeStep, // fine-grained step (e.g., "application-form/page-2")
    activeMacro, // macro index 1..6/7
    isInApplication,
    appPercent, // 0..100, used for 2→3 connector
  };
}
