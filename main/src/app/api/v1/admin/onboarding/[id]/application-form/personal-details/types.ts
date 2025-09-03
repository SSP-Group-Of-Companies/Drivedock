// Personal Details API Response Types
// This file contains types specific to the personal details endpoint

import { IApplicationFormPage1 } from "@/types/applicationForm.types";

export interface PersonalDetailsResponse {
  success: boolean;
  message: string;
  data: {
    onboardingContext: any;
    personalDetails: IApplicationFormPage1;
  };
}
