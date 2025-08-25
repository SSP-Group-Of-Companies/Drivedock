// main/src/lib/frontendConfigs/formPageConfig.types.ts
import { FieldValues } from "react-hook-form";
import { IPreQualifications } from "@/types/preQualifications.types";
import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

export type BuildPayloadCtx = {
  prequalifications?: IPreQualifications;
  companyId?: string;
  applicationType?: string;
  tracker?: IOnboardingTrackerContext | null;
  isPatch?: boolean;
  effectiveTrackerId?: string;
};

export interface FormPageConfig<T extends FieldValues> {
  validationFields: (values: T) => string[];
  buildPayload: (values: T, ctx: BuildPayloadCtx) => Record<string, unknown>;
  nextRoute: string; // fully resolved (no [id] tokens)
  submitSegment: string;
  validateBusinessRules?: (values: T) => string | null;
}

export type FormPageConfigFactory<T extends FieldValues> = (ctx: BuildPayloadCtx) => FormPageConfig<T>;
