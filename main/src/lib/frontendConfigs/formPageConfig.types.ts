// main/src/lib/frontendConfigs/formPageConfig.types.ts
import { FieldValues } from "react-hook-form";
import { IPreQualifications } from "@/types/preQualifications.types";
import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

export type BuildPayloadCtx = {
  prequalifications?: IPreQualifications;
  // Optional status hint for cases where local store is empty (PATCH resumes)
  prequalificationStatusInCanada?: string;
  companyId?: string;
  applicationType?: string;
  tracker?: IOnboardingTrackerContext | null;
  isPatch?: boolean;
  effectiveTrackerId?: string;
};

export interface ConfirmationPopup {
  show: boolean;
  text: string;
  translationPath: string;
}

export interface FormPageConfig<T extends FieldValues> {
  validationFields: (values: T) => string[];
  buildPayload: (values: T, ctx: BuildPayloadCtx) => Record<string, unknown>;
  nextRoute: string; // fully resolved (no [id] tokens)
  submitSegment: string;
  validateBusinessRules?: (values: T) => string | null;
  confirmationPopup?: ConfirmationPopup;
}

export type FormPageConfigFactory<T extends FieldValues> = (ctx: BuildPayloadCtx) => FormPageConfig<T>;
