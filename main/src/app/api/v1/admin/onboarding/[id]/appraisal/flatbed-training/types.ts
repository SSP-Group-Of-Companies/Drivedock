import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import type { IFlatbedTraining } from "@/types/flatbedTraining.types";

export interface FlatbedTrainingResponse {
  success: boolean;
  message: string;
  data: {
    onboardingContext: IOnboardingTrackerContext;
    flatbedTraining: IFlatbedTraining | null;
  };
}
