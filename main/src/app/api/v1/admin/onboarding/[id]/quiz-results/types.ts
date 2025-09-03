import type { IApplicationFormPage5 } from "@/types/applicationForm.types";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

export interface QuizResultsResponse {
  success: boolean;
  message: string;
  data: {
    onboardingContext: IOnboardingTrackerContext;
    quizResults: IApplicationFormPage5;
    lastUpdated: Date;
  };
}

export type QuizResultsData = QuizResultsResponse["data"];
