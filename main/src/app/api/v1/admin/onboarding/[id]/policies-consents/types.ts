import type { IPoliciesConsents } from "@/types/policiesConsents.types";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

export interface PoliciesConsentsResponse {
  success: boolean;
  message: string;
  data: {
    onboardingContext: IOnboardingTrackerContext;
    policiesConsents: IPoliciesConsents;
  };
}

export type PoliciesConsentsData = PoliciesConsentsResponse["data"];
