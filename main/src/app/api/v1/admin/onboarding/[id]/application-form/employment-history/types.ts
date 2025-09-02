// Employment History API Response Types
// This file contains types specific to the employment history endpoint

import { IApplicationFormPage2 } from "@/types/applicationForm.types";

export interface EmploymentHistoryResponse {
  success: boolean;
  message: string;
  data: {
    onboardingContext: any;
    employmentHistory: IApplicationFormPage2;
  };
}
