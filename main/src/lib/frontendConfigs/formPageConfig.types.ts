/**
 * formPageConfig.types.ts
 *
 * Interface contract for all DriveDock application form pages.
 * Each page (e.g., Page 1, Page 2) defines a `FormPageConfig<T>` object
 * which enables dynamic validation, JSON payload construction, and route logic.
 *
 * This structure powers:
 * - Scroll-to-error via field path list
 * - Clean POST and PATCH requests via JSON (no FormData anymore)
 * - Optional business rule validation (e.g., address gaps, work history)
 *
 * Used by:
 * - page1Config.ts, page2Config.ts, etc.
 * - <ContinueButton /> component
 */
/**
 * formPageConfig.types.ts
 *
 * Generic contract used by all form pages to drive validation and submission.
 */

// main/src/lib/frontendConfigs/formPageConfig.types.ts

import { FieldValues } from "react-hook-form";
import { IPreQualifications } from "@/types/preQualifications.types";
import { ITrackerContext } from "@/types/onboardingTracker.type"; // use the FE context we actually have

export type BuildPayloadCtx = {
  prequalifications?: IPreQualifications;
  companyId?: string;
  applicationType?: string;
  tracker?: ITrackerContext | null;

  isPatch?: boolean;
  effectiveTrackerId?: string;
};

export interface FormPageConfig<T extends FieldValues> {
  validationFields: (values: T) => string[];

  buildPayload: (values: T, ctx: BuildPayloadCtx) => Record<string, unknown>;

  nextRoute: string;
  submitSegment: string;

  validateBusinessRules?: (values: T) => string | null;
}
