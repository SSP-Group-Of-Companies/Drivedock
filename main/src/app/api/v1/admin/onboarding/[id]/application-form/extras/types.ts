import { IEducation, ICanadianHoursOfService } from "@/types/applicationForm.types";

export interface ExtrasResponse {
  success: boolean;
  message: string;
  data: {
    onboardingContext: any;
    education: IEducation;
    canadianHoursOfService: ICanadianHoursOfService;
    deniedLicenseOrPermit: boolean;
    suspendedOrRevoked: boolean;
    suspensionNotes?: string;
    testedPositiveOrRefused: boolean;
    completedDOTRequirements: boolean;
    hasAccidentalInsurance: boolean;
  };
}
