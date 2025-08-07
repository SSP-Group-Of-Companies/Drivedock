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

import { FieldValues } from "react-hook-form";
import { IPreQualifications } from "@/types/preQualifications.types";
import { IOnboardingTracker } from "@/types/onboardingTracker.type";

export interface FormPageConfig<T extends FieldValues> {
  validationFields: (values: T) => string[];

  /**
   * Builds JSON payload for POST or PATCH request
   * - Tracker presence indicates PATCH
   * - No tracker → POST (and include prequalifications + companyId)
   */
  buildPayload: (
    values: T,
    prequalification: IPreQualifications,
    companyId: string,
    tracker?: IOnboardingTracker
  ) => Record<string, unknown>;

  nextRoute: string;
  submitSegment: string;

  validateBusinessRules?: (values: T) => string | null;
}
